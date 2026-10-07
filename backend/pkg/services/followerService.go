package services

import (
	"context"
	"errors"
	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

var (
	ErrInvalidFollow           = errors.New("cannot follow this user")
	ErrFollowRequestNotPending = errors.New("follow request is not pending")
)

type FollowNotification struct {
	Type        string `json:"type"`
	RecipientID int    `json:"recipient_id"`
	ActorID     int    `json:"actor_id"`
}

type FollowResult struct {
	Status       string              `json:"status"`
	Notification *FollowNotification `json:"notification,omitempty"`
}

type FollowerService interface {
	GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error)
	GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error)
	GetPendingFollowRequests(ctx context.Context, userID int) ([]models.FollowerData, error)
	FollowUser(ctx context.Context, followerID, targetID int) (FollowResult, error)
	UnfollowUser(ctx context.Context, followerID, targetID int) error
	RespondToFollowRequest(ctx context.Context, targetID, followerID int, accept bool) error
	CanViewRelationships(ctx context.Context, viewerID, targetID int) (bool, error)
}

// 2. L-Struct
type followerService struct {
	followerRepo repository.FollowerRepository
}

// 3. L-Constructor
func NewFollowerService(fRepo repository.FollowerRepository) FollowerService {
	return &followerService{followerRepo: fRepo}
}

func (s *followerService) FollowUser(ctx context.Context, followerID, targetID int) (FollowResult, error) {
	if followerID <= 0 || targetID <= 0 || followerID == targetID {
		return FollowResult{}, ErrInvalidFollow
	}

	isPrivate, err := s.followerRepo.GetUserPrivacy(ctx, targetID)
	if err != nil {
		return FollowResult{}, err
	}
	current, err := s.followerRepo.GetFollowStatus(ctx, followerID, targetID)
	if err != nil {
		return FollowResult{}, err
	}
	if current != "none" {
		return FollowResult{Status: current}, nil
	}

	status := "accepted"
	var notification *FollowNotification
	if isPrivate {
		status = "pending"
		notification = &FollowNotification{
			Type:        "follow_request",
			RecipientID: targetID,
			ActorID:     followerID,
		}
	}
	if err := s.followerRepo.CreateFollowRequest(ctx, followerID, targetID, status); err != nil {
		return FollowResult{}, err
	}
	return FollowResult{Status: status, Notification: notification}, nil
}

func (s *followerService) UnfollowUser(ctx context.Context, followerID, targetID int) error {
	if followerID <= 0 || targetID <= 0 || followerID == targetID {
		return ErrInvalidFollow
	}
	return s.followerRepo.DeleteFollower(ctx, followerID, targetID)
}

func (s *followerService) RespondToFollowRequest(ctx context.Context, targetID, followerID int, accept bool) error {
	status, err := s.followerRepo.GetFollowStatus(ctx, followerID, targetID)
	if err != nil {
		return err
	}
	if status != "pending" {
		return ErrFollowRequestNotPending
	}
	if accept {
		return s.followerRepo.UpdateFollowStatus(ctx, followerID, targetID, "accepted")
	}
	return s.followerRepo.DeleteFollower(ctx, followerID, targetID)
}

func (s *followerService) GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error) {
	return s.followerRepo.GetFollowers(ctx, userID)
}

func (s *followerService) GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error) {
	return s.followerRepo.GetFollowing(ctx, userID)
}

func (s *followerService) GetPendingFollowRequests(ctx context.Context, userID int) ([]models.FollowerData, error) {
	return s.followerRepo.GetPendingFollowRequests(ctx, userID)
}

func (s *followerService) CanViewRelationships(ctx context.Context, viewerID, targetID int) (bool, error) {
	if viewerID == targetID {
		return true, nil
	}
	isPrivate, err := s.followerRepo.GetUserPrivacy(ctx, targetID)
	if err != nil {
		return false, err
	}
	if !isPrivate {
		return true, nil
	}
	status, err := s.followerRepo.GetFollowStatus(ctx, viewerID, targetID)
	return status == "accepted", err
}
