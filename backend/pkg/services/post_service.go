package services

import (
	"context"
	"errors"
	"strings"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

var (
	ErrInvalidPost        = errors.New("post must contain text or an image (max 2000 characters)")
	ErrInvalidComment     = errors.New("comment must contain text or an image (max 1000 characters)")
	ErrInvalidPostPrivacy = errors.New("post privacy must be public, almost_private or private")
	ErrPrivateNeedsPeople = errors.New("private posts need at least one allowed follower")
	ErrPostNotVisible     = errors.New("post not found or not visible to you")
	ErrNotPostAuthor      = errors.New("only the author can delete this post")
)

type PostService interface {
	CreatePost(ctx context.Context, authorID int, content, imagePath, privacy string, allowedUserIDs []int) (*models.Post, error)
	CreateComment(ctx context.Context, authorID, postID int, content, imagePath string) (*models.Comment, error)
	GetFeed(ctx context.Context, viewerID, limit int) ([]models.Post, error)
	GetPost(ctx context.Context, viewerID, postID int) (*models.Post, error)
	GetComments(ctx context.Context, viewerID, postID int) ([]models.Comment, error)
	GetPostsByAuthor(ctx context.Context, viewerID, authorID, limit int) ([]models.Post, error)
	DeletePost(ctx context.Context, viewerID, postID int) error
}

type postService struct {
	repository repository.PostRepository
}

func NewPostService(repo repository.PostRepository) PostService {
	return &postService{repository: repo}
}

func (s *postService) CreatePost(ctx context.Context, authorID int, content, imagePath, privacy string, allowedUserIDs []int) (*models.Post, error) {
	if authorID <= 0 {
		return nil, ErrInvalidPost
	}
	content = strings.TrimSpace(content)

	switch privacy {
	case "":
		privacy = "public"
	case "public", "almost_private", "private":
	default:
		return nil, ErrInvalidPostPrivacy
	}

	if content == "" && imagePath == "" {
		return nil, ErrInvalidPost
	}
	if len(content) > 2000 {
		return nil, ErrInvalidPost
	}

	if privacy == "private" {
		allowedUserIDs = cleanIDs(allowedUserIDs, authorID)
		if len(allowedUserIDs) == 0 {
			return nil, ErrPrivateNeedsPeople
		}
	} else {
		allowedUserIDs = nil
	}

	return s.repository.CreatePost(ctx, authorID, content, imagePath, privacy, allowedUserIDs)
}

func (s *postService) CreateComment(ctx context.Context, authorID, postID int, content, imagePath string) (*models.Comment, error) {
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

	allowed, err := s.repository.CanViewPost(ctx, postID, authorID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrPostNotVisible
	}

	return s.repository.CreateComment(ctx, postID, authorID, content, imagePath)
}

func (s *postService) GetFeed(ctx context.Context, viewerID, limit int) ([]models.Post, error) {
	if viewerID <= 0 {
		return nil, errors.New("invalid user")
	}
	return s.repository.GetFeed(ctx, viewerID, limit)
}

func (s *postService) GetPost(ctx context.Context, viewerID, postID int) (*models.Post, error) {
	if viewerID <= 0 || postID <= 0 {
		return nil, ErrPostNotVisible
	}
	allowed, err := s.repository.CanViewPost(ctx, postID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrPostNotVisible
	}
	return s.repository.GetPostByID(ctx, postID)
}

func (s *postService) GetComments(ctx context.Context, viewerID, postID int) ([]models.Comment, error) {
	if viewerID <= 0 || postID <= 0 {
		return nil, ErrPostNotVisible
	}
	allowed, err := s.repository.CanViewPost(ctx, postID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrPostNotVisible
	}
	return s.repository.GetComments(ctx, postID)
}

func (s *postService) GetPostsByAuthor(ctx context.Context, viewerID, authorID, limit int) ([]models.Post, error) {
	if viewerID <= 0 || authorID <= 0 {
		return nil, errors.New("invalid user")
	}
	return s.repository.GetPostsByAuthor(ctx, authorID, viewerID, limit)
}

func (s *postService) DeletePost(ctx context.Context, viewerID, postID int) error {
	post, err := s.repository.GetPostByID(ctx, postID)
	if err != nil {
		return err
	}
	if post.AuthorID != viewerID {
		return ErrNotPostAuthor
	}
	return s.repository.DeletePost(ctx, postID, viewerID)
}

// cleanIDs removes invalid ids, the author, and duplicates while keeping order.
func cleanIDs(ids []int, ownerID int) []int {
	out := make([]int, 0, len(ids))
	seen := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		if id <= 0 || id == ownerID {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
