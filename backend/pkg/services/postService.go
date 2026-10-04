package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
	"social-network-network/pkg/utils"
)

const postImageDirectory = "./media/posts"

type PostService interface {
	CreateNewPost(ctx context.Context, authorID int, dto models.CreatePostDTO) (*models.Post, error)
	GetFeedForUser(ctx context.Context, userID int) ([]models.Post, error)
	GetUserPosts(ctx context.Context, userID int) ([]models.Post, error)
}

type postService struct {
	postRepo     repository.PostRepository
	followerRepo repository.FollowerRepository
}

func NewPostService(postRepo repository.PostRepository, followerRepo repository.FollowerRepository) PostService {
	return &postService{postRepo: postRepo, followerRepo: followerRepo}
}

func (s *postService) CreateNewPost(ctx context.Context, authorID int, dto models.CreatePostDTO) (*models.Post, error) {
	if authorID <= 0 {
		return nil, errors.New("invalid post author")
	}
	dto.Title = strings.TrimSpace(dto.Title)
	dto.Content = strings.TrimSpace(dto.Content)
	dto.Privacy = strings.TrimSpace(dto.Privacy)
	if dto.Content == "" && dto.Image == nil {
		return nil, errors.New("post must include text or an image")
	}
	if dto.Privacy != "public" && dto.Privacy != "almost_private" && dto.Privacy != "private" {
		return nil, errors.New("privacy must be public, almost_private, or private")
	}
	if dto.Privacy != "private" && len(dto.PermittedUserIDs) > 0 {
		return nil, errors.New("permitted users can only be set for private posts")
	}

	permittedIDs, err := s.validatePermittedUsers(ctx, authorID, dto.Privacy, dto.PermittedUserIDs)
	if err != nil {
		return nil, err
	}

	imagePath := ""
	if dto.Image != nil {
		file, err := dto.Image.Open()
		if err != nil {
			return nil, fmt.Errorf("open post image: %w", err)
		}
		imagePath, err = utils.ValidateAndSaveImage(file, dto.Image, postImageDirectory)
		closeErr := file.Close()
		if err != nil {
			return nil, err
		}
		if closeErr != nil {
			_ = os.Remove(filepath.Join(postImageDirectory, imagePath))
			return nil, fmt.Errorf("close post image: %w", closeErr)
		}
	}

	postInput := models.Post{Title: dto.Title, Content: dto.Content, Privacy: dto.Privacy}
	postID, err := s.postRepo.CreatePost(ctx, authorID, postInput, imagePath)
	if err != nil {
		if imagePath != "" {
			_ = os.Remove(filepath.Join(postImageDirectory, imagePath))
		}
		return nil, fmt.Errorf("create post: %w", err)
	}

	if dto.Privacy == "private" {
		if err := s.postRepo.AddPostPermissions(ctx, int(postID), permittedIDs); err != nil {
			// The repository API does not currently provide a transaction spanning
			// post insertion and permission insertion, so return the error clearly.
			return nil, fmt.Errorf("save post permissions: %w", err)
		}
	}

	post, err := s.postRepo.GetPostByID(ctx, int(postID))
	if err != nil {
		return nil, fmt.Errorf("load created post: %w", err)
	}
	return post, nil
}

func (s *postService) validatePermittedUsers(ctx context.Context, authorID int, privacy string, requestedIDs []int) ([]int, error) {
	if privacy != "private" || len(requestedIDs) == 0 {
		return nil, nil
	}

	followers, err := s.followerRepo.GetFollowers(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("load post author's followers: %w", err)
	}
	allowed := make(map[int]struct{}, len(followers))
	for _, follower := range followers {
		allowed[follower.ID] = struct{}{}
	}

	seen := make(map[int]struct{}, len(requestedIDs))
	permitted := make([]int, 0, len(requestedIDs))
	for _, id := range requestedIDs {
		if id <= 0 || id == authorID {
			return nil, fmt.Errorf("invalid permitted user ID: %d", id)
		}
		if _, ok := allowed[id]; !ok {
			return nil, fmt.Errorf("user %d is not an accepted follower", id)
		}
		if _, duplicate := seen[id]; !duplicate {
			seen[id] = struct{}{}
			permitted = append(permitted, id)
		}
	}
	return permitted, nil
}

func (s *postService) GetFeedForUser(ctx context.Context, userID int) ([]models.Post, error) {
	if userID <= 0 {
		return nil, errors.New("invalid feed user")
	}
	return s.postRepo.GetFeedPosts(ctx, userID)
}

func (s *postService) GetUserPosts(ctx context.Context, userID int) ([]models.Post, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user ID")
	}
	return s.postRepo.GetUserPosts(ctx, userID)
}
