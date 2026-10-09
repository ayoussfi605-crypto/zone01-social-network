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

// scan a single comment row
func scanComment(sc interface{ Scan(...any) error }) (models.Comment, error) {
	var c models.Comment
	err := sc.Scan(
		&c.ID, &c.PostID, &c.AuthorID,
		&c.AuthorName, &c.AuthorAvatar, &c.AuthorNickname,
		&c.Content, &c.ImagePath, &c.CreatedAt,
	)
	return c, err
}

const commentColumns = `
	c.id, c.post_id, c.author_id,
	TRIM(u.first_name || ' ' || u.last_name),
	COALESCE(u.avatar_path, ''),
	COALESCE(u.nickname, ''),
	c.content,
	COALESCE(c.image_path, ''),
	c.created_at`

const commentJoin = `FROM comments c JOIN users u ON u.id = c.author_id`

func (r *commentRepository) CreateComment(ctx context.Context, postID, authorID int, content, imagePath string) (*models.Comment, error) {
	var image any
	if imagePath != "" {
		image = imagePath
	}

	result, err := r.db.ExecContext(ctx,
		`INSERT INTO comments (post_id, author_id, content, image_path) VALUES (?, ?, ?, ?)`,
		postID, authorID, content, image,
	)
	if err != nil {
		return nil, fmt.Errorf("create comment: %w", err)
	}
	commentID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read new comment id: %w", err)
	}

	row := r.db.QueryRowContext(ctx,
		`SELECT `+commentColumns+` `+commentJoin+` WHERE c.id = ?`, commentID,
	)
	c, err := scanComment(row)
	if err != nil {
		return nil, fmt.Errorf("load created comment: %w", err)
	}
	return &c, nil
}

func (r *commentRepository) GetComments(ctx context.Context, postID int) ([]models.Comment, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+commentColumns+` `+commentJoin+`
		 WHERE c.post_id = ?
		 ORDER BY c.created_at ASC, c.id ASC`,
		postID,
	)
	if err != nil {
		return nil, fmt.Errorf("load comments: %w", err)
	}
	defer rows.Close()

	comments := make([]models.Comment, 0)
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func (r *commentRepository) BatchGetComments(ctx context.Context, postIDs []int) (map[int][]models.Comment, error) {
	if len(postIDs) == 0 {
		return map[int][]models.Comment{}, nil
	}

	ph, args := placeholders(postIDs)
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+commentColumns+` `+commentJoin+`
		 WHERE c.post_id IN (`+ph+`)
		 ORDER BY c.post_id, c.created_at ASC, c.id ASC`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("batch load comments: %w", err)
	}
	defer rows.Close()

	result := make(map[int][]models.Comment)
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		result[c.PostID] = append(result[c.PostID], c)
	}
	return result, rows.Err()
}

// placeholders builds "?,?,?"
func placeholders(ids []int) (string, []any) {
	ph := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		ph[i] = "?"
		args[i] = id
	}
	return strings.Join(ph, ","), args
}
