package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"social-network-network/pkg/models"
)

type CommentRepository interface {
	CreateComment(ctx context.Context, postID, authorID int, content, imagePath string) (*models.Comment, error)
	GetComments(ctx context.Context, postID int) ([]models.Comment, error)
	BatchGetComments(ctx context.Context, postIDs []int) (map[int][]models.Comment, error)
}

type commentRepository struct {
	db *sql.DB
}

func NewCommentRepository(db *sql.DB) CommentRepository {
	return &commentRepository{db: db}
}

const commentSelectColumns = `
	c.id, c.post_id, c.author_id,
	TRIM(u.first_name || ' ' || u.last_name),
	COALESCE(u.avatar_path, ''),
	COALESCE(u.nickname, ''),
	c.content,
	COALESCE(c.image_path, ''),
	c.created_at`

func (r *commentRepository) CreateComment(ctx context.Context, postID, authorID int, content, imagePath string) (*models.Comment, error) {
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
		SELECT `+commentSelectColumns+`
		FROM comments c JOIN users u ON u.id = c.author_id
		WHERE c.id = ?
	`, commentID).Scan(
		&comment.ID,
		&comment.PostID,
		&comment.AuthorID,
		&comment.AuthorName,
		&comment.AuthorAvatar,
		&comment.AuthorNickname,
		&comment.Content,
		&comment.ImagePath,
		&comment.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("load created comment: %w", err)
	}
	return &comment, nil
}

func (r *commentRepository) GetComments(ctx context.Context, postID int) ([]models.Comment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+commentSelectColumns+`
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
			&comment.AuthorNickname,
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

func (r *commentRepository) BatchGetComments(ctx context.Context, postIDs []int) (map[int][]models.Comment, error) {
	if len(postIDs) == 0 {
		return map[int][]models.Comment{}, nil
	}

	placeholders := make([]string, len(postIDs))
	args := make([]any, len(postIDs))
	for i, id := range postIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT `+commentSelectColumns+`
		FROM comments c JOIN users u ON u.id = c.author_id
		WHERE c.post_id IN (`+strings.Join(placeholders, ",")+`)
		ORDER BY c.post_id, c.created_at ASC, c.id ASC
	`, args...)
	if err != nil {
		return nil, fmt.Errorf("batch load comments: %w", err)
	}
	defer rows.Close()

	result := make(map[int][]models.Comment)
	for rows.Next() {
		var comment models.Comment
		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.AuthorID,
			&comment.AuthorName,
			&comment.AuthorAvatar,
			&comment.AuthorNickname,
			&comment.Content,
			&comment.ImagePath,
			&comment.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		result[comment.PostID] = append(result[comment.PostID], comment)
	}
	return result, rows.Err()
}
