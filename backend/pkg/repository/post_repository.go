package repository

import (
	"context"
	"database/sql"

	"social-network-network/pkg/models"
)

type PostRepository interface {
	CreatePost(ctx context.Context, userID int, post models.Post, imagePath string) (int64, error)
	AddPostPermissions(ctx context.Context, postID int, userIDs []int) error
	GetPostByID(ctx context.Context, postID int) (*models.Postdata, error)
	GetFeedPosts(ctx context.Context, userID int) ([]models.Postdata, error)
	GetUserPosts(ctx context.Context, userID int) ([]models.Postdata, error)
}

type postRepository struct {
	db *sql.DB
}

func NewPostRepository(db *sql.DB) PostRepository {
	return &postRepository{db: db}
}

const postColumns = `id, user_id, title, content, image_path, privacy, created_at`

// CreatePost inserts a post and returns its database ID.
func (r *postRepository) CreatePost(ctx context.Context, userID int, post models.Post, imagePath string) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO posts (user_id, title, content, image_path, privacy)
		VALUES (?, ?, ?, ?, ?)
	`, userID, post.Title, post.Content, imagePath, post.Privacy)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *postRepository) AddPostPermissions(ctx context.Context, postID int, userIDs []int) error {
	if len(userIDs) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT OR IGNORE INTO post_viewer_permissions (post_id, user_id)
		VALUES (?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, userID := range userIDs {
		if _, err := stmt.ExecContext(ctx, postID, userID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *postRepository) GetPostByID(ctx context.Context, postID int) (*models.Postdata, error) {
	post := &models.Postdata{}
	err := r.db.QueryRowContext(ctx, `
		SELECT `+postColumns+`
		FROM posts
		WHERE id = ?
	`, postID).Scan(
		&post.ID,
		&post.UserID,
		&post.Title,
		&post.Content,
		&post.ImagePath,
		&post.Privacy,
		&post.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return post, nil
}

func (r *postRepository) GetFeedPosts(ctx context.Context, userID int) ([]models.Postdata, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+postColumns+`
		FROM posts AS p
		WHERE p.user_id = ?
		   OR p.privacy = 'public'
		   OR (
			p.privacy = 'almost_private'
			AND EXISTS (
				SELECT 1
				FROM followers AS f
				WHERE f.follower_id = ?
				  AND f.followed_id = p.user_id
				  AND f.status = 'accepted'
			)
		   )
		   OR (
			p.privacy = 'private'
			AND EXISTS (
				SELECT 1
				FROM post_viewer_permissions AS permission
				WHERE permission.post_id = p.id
				  AND permission.user_id = ?
			)
		   )
		ORDER BY p.created_at DESC, p.id DESC
	`, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanPosts(rows)
}

func (r *postRepository) GetUserPosts(ctx context.Context, userID int) ([]models.Postdata, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+postColumns+`
		FROM posts
		WHERE user_id = ?
		ORDER BY created_at DESC, id DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanPosts(rows)
}

func scanPosts(rows *sql.Rows) ([]models.Postdata, error) {
	posts := make([]models.Postdata, 0)
	for rows.Next() {
		var post models.Postdata
		if err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Title,
			&post.Content,
			&post.ImagePath,
			&post.Privacy,
			&post.CreatedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return posts, nil
}
