package services

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

var ErrGroupInviteNotPending = errors.New("group invite is not pending")

type GroupService interface {
	CreateGroup(ctx context.Context, creatorID int, title, description string, memberIDs []int) (*models.Group, error)
	GetGroups(ctx context.Context, userID int) ([]models.Group, error)
	GetPendingInvites(ctx context.Context, userID int) ([]models.GroupInvite, error)
	RespondToInvite(ctx context.Context, userID, groupID int, accept bool) error
}

type groupService struct {
	repository repository.GroupRepository
}

func NewGroupService(repo repository.GroupRepository) GroupService {
	return &groupService{repository: repo}
}

func (s *groupService) CreateGroup(ctx context.Context, creatorID int, title, description string, memberIDs []int) (*models.Group, error) {
	if creatorID <= 0 {
		return nil, errors.New("invalid creator")
	}

	title = strings.TrimSpace(title)
	if title == "" {
		return nil, errors.New("group title is required")
	}

	group, err := s.repository.CreateGroup(ctx, creatorID, title, description)
	if err != nil {
		return nil, err
	}

	filteredMembers := make([]int, 0, len(memberIDs))
	seen := make(map[int]struct{}, len(memberIDs))
	for _, memberID := range memberIDs {
		if memberID <= 0 || memberID == creatorID {
			continue
		}
		if _, ok := seen[memberID]; ok {
			continue
		}
		seen[memberID] = struct{}{}
		filteredMembers = append(filteredMembers, memberID)
	}

	if err := s.repository.AddMembers(ctx, group.ID, filteredMembers); err != nil {
		return nil, err
	}

	return group, nil
}

func (s *groupService) GetGroups(ctx context.Context, userID int) ([]models.Group, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user")
	}
	return s.repository.GetGroupsForUser(ctx, userID)
}

func (s *groupService) GetPendingInvites(ctx context.Context, userID int) ([]models.GroupInvite, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user")
	}
	return s.repository.GetPendingInvites(ctx, userID)
}

func (s *groupService) RespondToInvite(ctx context.Context, userID, groupID int, accept bool) error {
	if userID <= 0 || groupID <= 0 {
		return errors.New("invalid user or group")
	}
	err := s.repository.RespondToInvite(ctx, userID, groupID, accept)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrGroupInviteNotPending
	}
	return err
}
