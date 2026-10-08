package services

import (
	"context"
	"errors"
	"strings"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

var (
	ErrInvalidComment = errors.New("comment must contain text or an image (max 1000 characters)")
)

type CommentService interface {
	CreateComment(ctx context.Context, authorID, postID int, content, imagePath string) (*models.Comment, error)
	GetComments(ctx context.Context, viewerID, postID int) ([]models.Comment, error)
}

type commentService struct {
	commentRepo repository.CommentRepository
	postRepo    repository.PostRepository
}

func NewCommentService(commentRepo repository.CommentRepository, postRepo repository.PostRepository) CommentService {
	return &commentService{
		commentRepo: commentRepo,
		postRepo:    postRepo,
	}
}

func (s *commentService) CreateComment(ctx context.Context, authorID, postID int, content, imagePath string) (*models.Comment, error) {
	if authorID <= 0 || postID <= 0 {
		return nil, ErrInvalidComment
	}
	content = strings.TrimSpace(content)
	if content == "" && imagePath == "" {
		return nil, ErrInvalidComment
	}
	if len(content) > 1000 {
		return nil, ErrInvalidComment
	}

	exists, err := s.postRepo.PostExists(ctx, postID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrPostNotFound
	}

	allowed, err := s.postRepo.CanViewPost(ctx, postID, authorID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrPostNotVisible
	}

	return s.commentRepo.CreateComment(ctx, postID, authorID, content, imagePath)
}

func (s *commentService) GetComments(ctx context.Context, viewerID, postID int) ([]models.Comment, error) {
	if viewerID <= 0 || postID <= 0 {
		return nil, ErrPostNotFound
	}

	exists, err := s.postRepo.PostExists(ctx, postID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrPostNotFound
	}

	allowed, err := s.postRepo.CanViewPost(ctx, postID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrPostNotVisible
	}

	return s.commentRepo.GetComments(ctx, postID)
}
