package services

import (
	"context"
	"strings"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

type ProfileService interface {
	GetUserProfile(ctx context.Context, viewerID, targetID int) (*models.UserProfile, error)
	DiscoverUsers(ctx context.Context, viewerID int, query string, limit, offset int) (*models.UserDiscoveryPage, error)
}

type profileService struct {
	userRepo     repository.ProfileUserRepository
	followerRepo repository.FollowerRepository
}

func NewProfileService(userRepo repository.ProfileUserRepository, followerRepo repository.FollowerRepository) ProfileService {
	return &profileService{userRepo: userRepo, followerRepo: followerRepo}
}

func (s *profileService) GetUserProfile(ctx context.Context, viewerID, targetID int) (*models.UserProfile, error) {
	user, err := s.userRepo.GetProfileUser(ctx, targetID)
	if err != nil {
		return nil, err
	}

	status := "none"
	if viewerID > 0 && viewerID != targetID {
		status, err = s.followerRepo.GetFollowStatus(ctx, viewerID, targetID)
		if err != nil {
			return nil, err
		}
	}

	restricted := viewerID != targetID && user.IsPrivate && status != "accepted"
	if restricted {
		user = &models.User{
			Id:         user.Id,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			AvatarPath: user.AvatarPath,
			IsPrivate:  user.IsPrivate,
		}
	}

	var stats *models.ProfileStats
	if !restricted {
		profileStats, err := s.userRepo.GetProfileStats(ctx, targetID)
		if err != nil {
			return nil, err
		}
		stats = &profileStats
	}

	return &models.UserProfile{
		User:         user,
		Restricted:   restricted,
		FollowStatus: status,
		Stats:        stats,
	}, nil
}

func (s *profileService) DiscoverUsers(ctx context.Context, viewerID int, query string, limit, offset int) (*models.UserDiscoveryPage, error) {
	users, err := s.userRepo.DiscoverUsers(ctx, viewerID, strings.TrimSpace(query), limit+1, offset)
	if err != nil {
		return nil, err
	}
	hasMore := len(users) > limit
	if hasMore {
		users = users[:limit]
	}
	return &models.UserDiscoveryPage{Users: users, HasMore: hasMore}, nil
}
