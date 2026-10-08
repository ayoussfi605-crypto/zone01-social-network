package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

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

// visibilityPredicate is the shared rule for who is allowed to see a post.
// A viewer sees a post when:
//   - they are the author
//   - OR the post is 'private' and the viewer was granted explicit permission
//   - OR the author's profile is accessible (public profile OR viewer is accepted follower) AND:
//       - the post is 'public'
//       - OR the post is 'almost_private' and viewer is an accepted follower
//
// It expects four positional viewer parameters, in order:
//   1. p.author_id = ?
//   2. pp.user_id = ?
//   3. f.follower_id = ?
//   4. f2.follower_id = ?
const visibilityPredicate = `(
	p.author_id = ?
	OR (
		p.privacy = 'private' AND EXISTS (
			SELECT 1 FROM post_permissions pp
			WHERE pp.post_id = p.id AND pp.user_id = ?
		)
	)
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

const postSelectColumns = `
	p.id, p.author_id,
	TRIM(u.first_name || ' ' || u.last_name),
	COALESCE(u.avatar_path, ''), COALESCE(u.nickname, ''),
	p.content, COALESCE(p.image_path, ''), p.privacy, p.created_at`

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

	result, err := tx.ExecContext(ctx, `
		INSERT INTO posts (author_id, content, image_path, privacy)
		VALUES (?, ?, ?, ?)
	`, authorID, content, image, privacy)
	if err != nil {
		return nil, fmt.Errorf("create post: %w", err)
	}
	postID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read new post id: %w", err)
	}

	if privacy == "private" {
		for _, userID := range allowedUserIDs {
			if _, err := tx.ExecContext(ctx, `
				INSERT OR IGNORE INTO post_permissions (post_id, user_id) VALUES (?, ?)
			`, postID, userID); err != nil {
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
	placeholders := make([]string, len(userIDs))
	args := make([]any, 0, len(userIDs)+1)
	args = append(args, authorID)
	for i, id := range userIDs {
		placeholders[i] = "?"
		args = append(args, id)
	}

	query := fmt.Sprintf(`
		SELECT COUNT(DISTINCT follower_id)
		FROM followers
		WHERE followed_id = ? AND status = 'accepted' AND follower_id IN (%s)
	`, strings.Join(placeholders, ","))

	var count int
	if err := r.db.QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
		return fmt.Errorf("validate followers: %w", err)
	}

	if count != len(userIDs) {
		return fmt.Errorf("one or more users are not accepted followers")
	}
	return nil
}

func (r *postRepository) PostExists(ctx context.Context, postID int) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM posts WHERE id = ?)`, postID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check post exists: %w", err)
	}
	return exists, nil
}

func (r *postRepository) GetPostByID(ctx context.Context, postID int) (*models.Post, error) {
	var post models.Post
	err := r.db.QueryRowContext(ctx, `
		SELECT `+postSelectColumns+`
		FROM posts p JOIN users u ON u.id = p.author_id
		WHERE p.id = ?
	`, postID).Scan(
		&post.ID,
		&post.AuthorID,
		&post.AuthorName,
		&post.AuthorAvatar,
		&post.AuthorNickname,
		&post.Content,
		&post.ImagePath,
		&post.Privacy,
		&post.CreatedAt,
	)
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
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+postSelectColumns+`
		FROM posts p JOIN users u ON u.id = p.author_id
		WHERE `+visibilityPredicate+`
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT ?
	`, viewerID, viewerID, viewerID, viewerID, limit)
	if err != nil {
		return nil, fmt.Errorf("load feed: %w", err)
	}
	return r.collectPosts(ctx, rows, viewerID)
}

func (r *postRepository) GetPostsByAuthor(ctx context.Context, authorID, viewerID, limit int) ([]models.Post, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+postSelectColumns+`
		FROM posts p JOIN users u ON u.id = p.author_id
		WHERE p.author_id = ? AND `+visibilityPredicate+`
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT ?
	`, authorID, viewerID, viewerID, viewerID, viewerID, limit)
	if err != nil {
		return nil, fmt.Errorf("load author posts: %w", err)
	}
	return r.collectPosts(ctx, rows, viewerID)
}

func (r *postRepository) CanViewPost(ctx context.Context, postID, viewerID int) (bool, error) {
	var allowed bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM posts p JOIN users u ON u.id = p.author_id
			WHERE p.id = ? AND `+visibilityPredicate+`
		)
	`, postID, viewerID, viewerID, viewerID, viewerID).Scan(&allowed)
	if err != nil {
		return false, fmt.Errorf("check post visibility: %w", err)
	}
	return allowed, nil
}

func (r *postRepository) DeletePost(ctx context.Context, postID, authorID int) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM posts WHERE id = ? AND author_id = ?`, postID, authorID)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	return requireOneRow(result)
}

func (r *postRepository) ListAllowedUserIDs(ctx context.Context, postID int) ([]int, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT user_id FROM post_permissions WHERE post_id = ? ORDER BY user_id
	`, postID)
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

// collectPosts drains rows into posts and attaches comments to each post
// using batch queries to avoid N+1 database calls.
func (r *postRepository) collectPosts(ctx context.Context, rows *sql.Rows, viewerID int) ([]models.Post, error) {
	defer rows.Close()

	posts := make([]models.Post, 0)
	for rows.Next() {
		var post models.Post
		if err := rows.Scan(
			&post.ID,
			&post.AuthorID,
			&post.AuthorName,
			&post.AuthorAvatar,
			&post.AuthorNickname,
			&post.Content,
			&post.ImagePath,
			&post.Privacy,
			&post.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		posts = append(posts, post)
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

// batchGetAllowedUserIDs fetches post_permissions for a set of private posts
// in a single query.
func (r *postRepository) batchGetAllowedUserIDs(ctx context.Context, postIDs []int) (map[int][]int, error) {
	if len(postIDs) == 0 {
		return map[int][]int{}, nil
	}

	placeholders := make([]string, len(postIDs))
	args := make([]any, len(postIDs))
	for i, id := range postIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT post_id, user_id FROM post_permissions
		WHERE post_id IN (`+strings.Join(placeholders, ",")+`)
		ORDER BY post_id, user_id
	`, args...)
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

// decoratePost fills in the comment list and, for private posts, the list of
// users the author allowed to see it.
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
