package repository

import (
	"context"
	"database/sql"
	"fmt"

	"social-network-network/pkg/models"
)

type PostRepository interface {
	CreatePost(ctx context.Context, authorID int, content, imagePath, privacy string, allowedUserIDs []int) (*models.Post, error)
	CreateComment(ctx context.Context, postID, authorID int, content, imagePath string) (*models.Comment, error)
	GetComments(ctx context.Context, postID int) ([]models.Comment, error)
	GetPostByID(ctx context.Context, postID int) (*models.Post, error)
	GetFeed(ctx context.Context, viewerID, limit int) ([]models.Post, error)
	GetPostsByAuthor(ctx context.Context, authorID, viewerID, limit int) ([]models.Post, error)
	CanViewPost(ctx context.Context, postID, viewerID int) (bool, error)
	DeletePost(ctx context.Context, postID, authorID int) error
	ListAllowedUserIDs(ctx context.Context, postID int) ([]int, error)
}

type postRepository struct {
	db *sql.DB
}

func NewPostRepository(db *sql.DB) PostRepository {
	return &postRepository{db: db}
}

// visibilityPredicate is the shared rule for who is allowed to see a post.
// A viewer sees a post when they are the author, or when the author's profile
// is visible to them AND the post privacy rule allows it:
//   - public         -> anyone
//   - almost_private -> accepted followers of the author
//   - private        -> users listed in post_permissions
//
// It expects four positional viewer parameters, in order.
const visibilityPredicate = `(
	p.author_id = ?
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
			OR (p.privacy = 'private' AND EXISTS (
				SELECT 1 FROM post_permissions pp
				WHERE pp.post_id = p.id AND pp.user_id = ?
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

	result, err := r.db.ExecContext(ctx, `
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
			if _, err := r.db.ExecContext(ctx, `
				INSERT OR IGNORE INTO post_permissions (post_id, user_id) VALUES (?, ?)
			`, postID, userID); err != nil {
				return nil, fmt.Errorf("grant post permission: %w", err)
			}
		}
	}

	return r.GetPostByID(ctx, int(postID))
}

func (r *postRepository) CreateComment(ctx context.Context, postID, authorID int, content, imagePath string) (*models.Comment, error) {
	var image any
	if imagePath != "" {
		image = imagePath
	}

	result, err := r.db.ExecContext(ctx, `
		INSERT INTO comments (post_id, author_id, content, image_path)
		VALUES (?, ?, ?, ?)
	`, postID, authorID, content, image)
	if err != nil {
		return nil, fmt.Errorf("create comment: %w", err)
	}
	commentID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read new comment id: %w", err)
	}

	var comment models.Comment
	err = r.db.QueryRowContext(ctx, `
		SELECT c.id, c.post_id, c.author_id,
		       TRIM(u.first_name || ' ' || u.last_name), COALESCE(u.avatar_path, ''),
		       c.content, COALESCE(c.image_path, ''), c.created_at
		FROM comments c JOIN users u ON u.id = c.author_id
		WHERE c.id = ?
	`, commentID).Scan(
		&comment.ID,
		&comment.PostID,
		&comment.AuthorID,
		&comment.AuthorName,
		&comment.AuthorAvatar,
		&comment.Content,
		&comment.ImagePath,
		&comment.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("load created comment: %w", err)
	}
	return &comment, nil
}

func (r *postRepository) GetComments(ctx context.Context, postID int) ([]models.Comment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.post_id, c.author_id,
		       TRIM(u.first_name || ' ' || u.last_name), COALESCE(u.avatar_path, ''),
		       c.content, COALESCE(c.image_path, ''), c.created_at
		FROM comments c JOIN users u ON u.id = c.author_id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC, c.id ASC
	`, postID)
	if err != nil {
		return nil, fmt.Errorf("load comments: %w", err)
	}
	defer rows.Close()

	comments := make([]models.Comment, 0)
	for rows.Next() {
		var comment models.Comment
		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.AuthorID,
			&comment.AuthorName,
			&comment.AuthorAvatar,
			&comment.Content,
			&comment.ImagePath,
			&comment.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		comments = append(comments, comment)
	}
	return comments, rows.Err()
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
	return r.collectPosts(ctx, rows)
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
	return r.collectPosts(ctx, rows)
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

// collectPosts drains rows into posts and attaches comments to each post.
func (r *postRepository) collectPosts(ctx context.Context, rows *sql.Rows) ([]models.Post, error) {
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

	for i := range posts {
		if err := r.decoratePost(ctx, &posts[i]); err != nil {
			return nil, err
		}
	}
	return posts, nil
}

// decoratePost fills in the comment list and, for private posts, the list of
// users the author allowed to see it.
func (r *postRepository) decoratePost(ctx context.Context, post *models.Post) error {
	comments, err := r.GetComments(ctx, post.ID)
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
