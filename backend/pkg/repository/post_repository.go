package repository

import (
	"context"
	"database/sql"
	"fmt"

	"social-network-network/pkg/models"
)

type PostRepository interface {
	CreatePost(ctx context.Context, authorID int, content, imagePath, privacy string, allowedUserIDs []int) (*models.Post, error)
	GetPostByID(ctx context.Context, postID int) (*models.Post, error)
	GetFeed(ctx context.Context, viewerID, limit int) ([]models.Post, error)
	GetPostsByAuthor(ctx context.Context, authorID, viewerID, limit int) ([]models.Post, error)
	PostExists(ctx context.Context, postID int) (bool, error)
	CanViewPost(ctx context.Context, postID, viewerID int) (bool, error)
	DeletePost(ctx context.Context, postID, authorID int) error
	ListAllowedUserIDs(ctx context.Context, postID int) ([]int, error)
	ValidateFollowers(ctx context.Context, authorID int, userIDs []int) error
}

type postRepository struct {
	db       *sql.DB
	comments CommentRepository
}

func NewPostRepository(db *sql.DB) PostRepository {
	return &postRepository{
		db:       db,
		comments: NewCommentRepository(db),
	}
}


const postColumns = `
	p.id, p.author_id,
	TRIM(u.first_name || ' ' || u.last_name),
	COALESCE(u.avatar_path, ''), COALESCE(u.nickname, ''),
	p.content, COALESCE(p.image_path, ''), p.privacy, p.created_at`

const postJoin = `FROM posts p JOIN users u ON u.id = p.author_id`


const visibilityPredicate = `(
	p.author_id = ?
	OR (p.privacy = 'private' AND EXISTS (
		SELECT 1 FROM post_permissions pp
		WHERE pp.post_id = p.id AND pp.user_id = ?
	))
	OR (
		(u.is_private = 0 OR EXISTS (
			SELECT 1 FROM followers f
			WHERE f.follower_id = ? AND f.followed_id = p.author_id AND f.status = 'accepted'
		))
		AND (
			p.privacy = 'public'
			OR (p.privacy = 'almost_private' AND EXISTS (
				SELECT 1 FROM followers f2
				WHERE f2.follower_id = ? AND f2.followed_id = p.author_id AND f2.status = 'accepted'
			))
		)
	)
)`

// viewerArgs repeats the viewer ID for each placeholder in visibilityPredicate.
func viewerArgs(viewerID int) []any {
	return []any{viewerID, viewerID, viewerID, viewerID}
}

func scanPost(sc interface{ Scan(...any) error }) (models.Post, error) {
	var p models.Post
	err := sc.Scan(
		&p.ID, &p.AuthorID,
		&p.AuthorName, &p.AuthorAvatar, &p.AuthorNickname,
		&p.Content, &p.ImagePath, &p.Privacy, &p.CreatedAt,
	)
	return p, err
}


func (r *postRepository) CreatePost(ctx context.Context, authorID int, content, imagePath, privacy string, allowedUserIDs []int) (*models.Post, error) {
	var image any
	if imagePath != "" {
		image = imagePath
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin create post tx: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx,
		`INSERT INTO posts (author_id, content, image_path, privacy) VALUES (?, ?, ?, ?)`,
		authorID, content, image, privacy,
	)
	if err != nil {
		return nil, fmt.Errorf("create post: %w", err)
	}
	postID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read new post id: %w", err)
	}

	if privacy == "private" {
		for _, userID := range allowedUserIDs {
			if _, err := tx.ExecContext(ctx,
				`INSERT OR IGNORE INTO post_permissions (post_id, user_id) VALUES (?, ?)`,
				postID, userID,
			); err != nil {
				return nil, fmt.Errorf("grant post permission: %w", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit create post tx: %w", err)
	}

	return r.GetPostByID(ctx, int(postID))
}

func (r *postRepository) ValidateFollowers(ctx context.Context, authorID int, userIDs []int) error {
	if len(userIDs) == 0 {
		return nil
	}
	ph, args := placeholders(userIDs)
	// prepend authorID before the IN-clause args
	args = append([]any{authorID}, args...)

	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT follower_id)
		FROM followers
		WHERE followed_id = ? AND status = 'accepted' AND follower_id IN (`+ph+`)`,
		args...,
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("validate followers: %w", err)
	}
	if count != len(userIDs) {
		return fmt.Errorf("one or more users are not accepted followers")
	}
	return nil
}

func (r *postRepository) PostExists(ctx context.Context, postID int) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM posts WHERE id = ?)`, postID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check post exists: %w", err)
	}
	return exists, nil
}

func (r *postRepository) GetPostByID(ctx context.Context, postID int) (*models.Post, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT `+postColumns+` `+postJoin+` WHERE p.id = ?`, postID,
	)
	post, err := scanPost(row)
	if err != nil {
		return nil, fmt.Errorf("load post: %w", err)
	}
	if err := r.decoratePost(ctx, &post); err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *postRepository) GetFeed(ctx context.Context, viewerID, limit int) ([]models.Post, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	args := append(viewerArgs(viewerID), limit)
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+postColumns+` `+postJoin+`
		 WHERE `+visibilityPredicate+`
		 ORDER BY p.created_at DESC, p.id DESC
		 LIMIT ?`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("load feed: %w", err)
	}
	return r.collectPosts(ctx, rows, viewerID)
}

func (r *postRepository) GetPostsByAuthor(ctx context.Context, authorID, viewerID, limit int) ([]models.Post, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	args := append([]any{authorID}, viewerArgs(viewerID)...)
	args = append(args, limit)
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+postColumns+` `+postJoin+`
		 WHERE p.author_id = ? AND `+visibilityPredicate+`
		 ORDER BY p.created_at DESC, p.id DESC
		 LIMIT ?`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("load author posts: %w", err)
	}
	return r.collectPosts(ctx, rows, viewerID)
}

func (r *postRepository) CanViewPost(ctx context.Context, postID, viewerID int) (bool, error) {
	var allowed bool
	args := append([]any{postID}, viewerArgs(viewerID)...)
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS (
			SELECT 1 `+postJoin+`
			WHERE p.id = ? AND `+visibilityPredicate+`
		)`,
		args...,
	).Scan(&allowed)
	if err != nil {
		return false, fmt.Errorf("check post visibility: %w", err)
	}
	return allowed, nil
}

func (r *postRepository) DeletePost(ctx context.Context, postID, authorID int) error {
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM posts WHERE id = ? AND author_id = ?`, postID, authorID,
	)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	return requireOneRow(result)
}

func (r *postRepository) ListAllowedUserIDs(ctx context.Context, postID int) ([]int, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT user_id FROM post_permissions WHERE post_id = ? ORDER BY user_id`, postID,
	)
	if err != nil {
		return nil, fmt.Errorf("load post permissions: %w", err)
	}
	defer rows.Close()

	ids := make([]int, 0)
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan post permission: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}


func (r *postRepository) collectPosts(ctx context.Context, rows *sql.Rows, viewerID int) ([]models.Post, error) {
	defer rows.Close()

	posts := make([]models.Post, 0)
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("post rows: %w", err)
	}
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("close post rows: %w", err)
	}

	if len(posts) == 0 {
		return posts, nil
	}

	// Collect IDs for batch queries.
	postIDs := make([]int, len(posts))
	var privatePostIDs []int
	for i, p := range posts {
		postIDs[i] = p.ID
		if p.Privacy == "private" {
			privatePostIDs = append(privatePostIDs, p.ID)
		}
	}

	// One query for all comments instead of one per post.
	commentsByPost, err := r.comments.BatchGetComments(ctx, postIDs)
	if err != nil {
		return nil, err
	}

	// One query for all private-post permissions instead of one per private post.
	allowedByPost, err := r.batchGetAllowedUserIDs(ctx, privatePostIDs)
	if err != nil {
		return nil, err
	}

	for i := range posts {
		comments := commentsByPost[posts[i].ID]
		if comments == nil {
			comments = []models.Comment{}
		}
		posts[i].Comments = comments
		posts[i].CommentCount = len(comments)
		if posts[i].Privacy == "private" && posts[i].AuthorID == viewerID {
			posts[i].AllowedUserIDs = allowedByPost[posts[i].ID]
		}
	}
	return posts, nil
}


func (r *postRepository) batchGetAllowedUserIDs(ctx context.Context, postIDs []int) (map[int][]int, error) {
	if len(postIDs) == 0 {
		return map[int][]int{}, nil
	}

	ph, args := placeholders(postIDs)
	rows, err := r.db.QueryContext(ctx,
		`SELECT post_id, user_id FROM post_permissions
		 WHERE post_id IN (`+ph+`)
		 ORDER BY post_id, user_id`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("batch load post permissions: %w", err)
	}
	defer rows.Close()

	result := make(map[int][]int)
	for rows.Next() {
		var postID, userID int
		if err := rows.Scan(&postID, &userID); err != nil {
			return nil, fmt.Errorf("scan post permission: %w", err)
		}
		result[postID] = append(result[postID], userID)
	}
	return result, rows.Err()
}

func (r *postRepository) decoratePost(ctx context.Context, post *models.Post) error {
	comments, err := r.comments.GetComments(ctx, post.ID)
	if err != nil {
		return err
	}
	post.Comments = comments
	post.CommentCount = len(comments)

	if post.Privacy == "private" {
		allowed, err := r.ListAllowedUserIDs(ctx, post.ID)
		if err != nil {
			return err
		}
		post.AllowedUserIDs = allowed
	}
	return nil
}
