package services

import (
	"context"
	"social/pkg/repository"
)

type FollowerService interface {
	GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error)
	GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error)
	FollowUser(ctx context.Context, followerID, targetID int) error
	UnfollowUser(ctx context.Context, followerID, targetID int) error
	RespondToFollowRequest(ctx context.Context, targetID, followerID int, accept bool) error
}

// 2. L-Struct
type followerService struct {
	followerRepo repository.FollowerRepository
}

// 3. L-Constructor
func NewFollowerService(fRepo repository.FollowerRepository) FollowerService {
	return &followerService{followerRepo: fRepo}
}

// Task 1.2: FollowUser Logic
func (s *followerService) FollowUser(ctx context.Context, followerID, targetID int) error {
	// isPublic := s.userRepo.GetUserPrivacy(ctx, targetID) // TODO: Mli twjed UserRepo
	isPublic := true 
	
	status := "pending"
	if isPublic {
		status = "accepted"
	}
	
	return s.followerRepo.CreateFollowRequest(ctx, followerID, targetID, status)
}

// Task 1.2: UnfollowUser Logic
func (s *followerService) UnfollowUser(ctx context.Context, followerID, targetID int) error {
	return s.followerRepo.DeleteFollower(ctx, followerID, targetID)
}
// Task 1.2: RespondToFollowRequest Logic
func (s *followerService) RespondToFollowRequest(ctx context.Context, targetID, followerID int, accept bool) error {
	if accept {
		// If accepted, update status to 'accepted'
		return s.followerRepo.UpdateFollowStatus(ctx, followerID, targetID, "accepted")
	}
	// If declined, delete the follow request row
	return s.followerRepo.DeleteFollower(ctx, followerID, targetID)
}

func (s *followerService) GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error) {
	return s.followerRepo.GetFollowers(ctx, userID)
}

func (s *followerService) GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error) {
	return s.followerRepo.GetFollowing(ctx, userID)
}