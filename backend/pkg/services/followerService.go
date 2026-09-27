package services

import (
	"backend/pkg/repository"
)

type FollowerService struct {
	FollowerRepo *repository.FollowerRepo
	UserRepo     *repository.UserRepo
}

func NewFollowerService(fRepo *repository.FollowerRepo, uRepo *repository.UserRepo) *FollowerService {
	return &FollowerService{FollowerRepo: fRepo, UserRepo: uRepo}
}

// Task 1.2: FollowUser Logic
func (s *FollowerService) FollowUser(followerID, targetID int) error {
	// 1. Check target user's privacy status
	// isPublic, _ := s.UserRepo.GetUserPrivacy(targetID) // Uncomment when UserRepo has this method
	isPublic := true // Placeholder for now

	status := "pending"
	if isPublic {
		status = "accepted"
	}

	// 2. Create the follow request in the database
	err := s.FollowerRepo.CreateFollowRequest(followerID, targetID, status)
	if err != nil {
		return err
	}

	// 3. Trigger Notification if status is "pending"
	if status == "pending" {
		// TODO: Call notification service here later
	}

	return nil
}

// Task 1.2: UnfollowUser Logic
func (s *FollowerService) UnfollowUser(followerID, targetID int) error {
	// Remove follow relationship
	return s.FollowerRepo.DeleteFollower(followerID, targetID)
}

// Task 1.2: RespondToFollowRequest Logic
func (s *FollowerService) RespondToFollowRequest(targetID, followerID int, accept bool) error {
	if accept {
		// If accepted, update status to 'accepted'
		return s.FollowerRepo.UpdateFollowStatus(followerID, targetID, "accepted")
	}
	// If declined, delete the follow request row
	return s.FollowerRepo.DeleteFollower(followerID, targetID)
}