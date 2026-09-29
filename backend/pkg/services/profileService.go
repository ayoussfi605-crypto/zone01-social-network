package services

// import (
// 	"context"
// 	"errors"
	
// 	"social-network/pkg/models"
// 	"social-network/pkg/repository"
// )

// type ProfileService interface {
// 	GetUserProfile(ctx context.Context, viewerID, targetID int) (*models.User, error)
// }

// type profileService struct {
// 	userRepo     repository.UserRepository
// 	followerRepo repository.FollowerRepository
// }

// func NewProfileService(uRepo repository.UserRepository, fRepo repository.FollowerRepository) ProfileService {
// 	return &profileService{userRepo: uRepo, followerRepo: fRepo}
// }

// func (s *profileService) GetUserProfile(ctx context.Context, viewerID, targetID int) (*models.User, error) {
// 	// Fetch user profile from database
// 	user, err := s.userRepo.GetUserByID(ctx, targetID)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// If viewer is viewing their own profile, return all data
// 	if viewerID == targetID {
// 		return user, nil
// 	}

// 	// Check privacy rules
// 	if user.Is_Public == "0" { // Assuming "0" means private
// 		// Check if viewer is an accepted follower
// 		status, err := s.followerRepo.GetFollowStatus(ctx, viewerID, targetID)
// 		if err != nil || status != "accepted" {
// 			// Restrict data for non-followers
// 			restrictedUser := &models.User{
// 				ID:         user.ID,
// 				First_Name: user.First_Name,
// 				Last_Name:  user.Last_Name,
// 				Avatar_Url: user.Avatar_Url,
// 				Is_Public:  user.Is_Public,
// 			}
// 			return restrictedUser, errors.New("private profile") // Handler will use this to show restricted view
// 		}
// 	}

// 	return user, nil
// }