package services

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

var (
	ErrGroupInviteNotPending = errors.New("group invite is not pending")
	ErrNotGroupMember        = errors.New("user is not a group member")
	ErrNotGroupCreator       = errors.New("only the group creator can manage join requests")
	ErrJoinRequestNotPending = errors.New("group join request is not pending")
	ErrInvalidGroupInput     = errors.New("group title and description are required")
	ErrInvalidGroupPost      = errors.New("post must contain between 1 and 5000 characters")
	ErrInvalidGroupComment   = errors.New("comment must contain between 1 and 2000 characters")
	ErrInvalidGroupEvent     = errors.New("event title, description, and valid time are required")
)

type GroupService interface {
	CreateGroup(ctx context.Context, creatorID int, title, description string, memberIDs []int) (*models.Group, error)
	GetGroups(ctx context.Context, userID int) ([]models.Group, error)
	GetPendingInvites(ctx context.Context, userID int) ([]models.GroupInvite, error)
	RespondToInvite(ctx context.Context, userID, groupID int, accept bool) error
	BrowseGroups(ctx context.Context, userID int) ([]models.GroupDiscovery, error)
	GetGroupMembers(ctx context.Context, viewerID, groupID int) ([]models.GroupMember, error)
	GetInviteCandidates(ctx context.Context, viewerID, groupID int) ([]models.FollowerData, error)
	InviteMembers(ctx context.Context, viewerID, groupID int, userIDs []int) error
	RequestToJoin(ctx context.Context, userID, groupID int) error
	GetJoinRequests(ctx context.Context, creatorID, groupID int) ([]models.GroupJoinRequest, error)
	RespondToJoinRequest(ctx context.Context, creatorID, groupID, userID int, accept bool) error
	GetGroupPosts(ctx context.Context, viewerID, groupID int) ([]models.GroupPost, error)
	CreateGroupPost(ctx context.Context, authorID, groupID int, content string) (*models.GroupPost, error)
	CreateGroupComment(ctx context.Context, authorID, groupID, postID int, content string) (*models.GroupComment, error)
	GetGroupEvents(ctx context.Context, viewerID, groupID int) ([]models.GroupEvent, error)
	CreateGroupEvent(ctx context.Context, creatorID, groupID int, title, description, eventTime string) (*models.GroupEvent, error)
	RespondToEvent(ctx context.Context, userID, groupID, eventID int, response string) error
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
	description = strings.TrimSpace(description)
	if title == "" || len(title) > 120 || description == "" || len(description) > 2000 {
		return nil, ErrInvalidGroupInput
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

func (s *groupService) BrowseGroups(ctx context.Context, userID int) ([]models.GroupDiscovery, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user")
	}
	return s.repository.BrowseGroups(ctx, userID)
}

func (s *groupService) GetGroupMembers(ctx context.Context, viewerID, groupID int) ([]models.GroupMember, error) {
	if viewerID <= 0 || groupID <= 0 {
		return nil, errors.New("invalid user or group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.GetGroupMembers(ctx, groupID)
}

func (s *groupService) GetInviteCandidates(ctx context.Context, viewerID, groupID int) ([]models.FollowerData, error) {
	if viewerID <= 0 || groupID <= 0 {
		return nil, errors.New("invalid user or group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.GetInviteCandidates(ctx, groupID, viewerID)
}

func (s *groupService) InviteMembers(ctx context.Context, viewerID, groupID int, userIDs []int) error {
	if viewerID <= 0 || groupID <= 0 {
		return errors.New("invalid user or group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, viewerID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrNotGroupMember
	}
	creatorID, err := s.repository.GetGroupCreatorID(ctx, groupID)
	if err != nil {
		return err
	}
	filtered := make([]int, 0, len(userIDs))
	seen := make(map[int]struct{}, len(userIDs))
	for _, userID := range userIDs {
		if userID <= 0 || userID == creatorID {
			continue
		}
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		filtered = append(filtered, userID)
	}
	return s.repository.InviteMembers(ctx, groupID, filtered)
}

func (s *groupService) RequestToJoin(ctx context.Context, userID, groupID int) error {
	if userID <= 0 || groupID <= 0 {
		return errors.New("invalid user or group")
	}
	creatorID, err := s.repository.GetGroupCreatorID(ctx, groupID)
	if err != nil {
		return err
	}
	if creatorID == userID {
		return ErrNotGroupMember
	}
	return s.repository.RequestToJoin(ctx, groupID, userID)
}

func (s *groupService) GetJoinRequests(ctx context.Context, creatorID, groupID int) ([]models.GroupJoinRequest, error) {
	if creatorID <= 0 || groupID <= 0 {
		return nil, errors.New("invalid user or group")
	}
	ownerID, err := s.repository.GetGroupCreatorID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if ownerID != creatorID {
		return nil, ErrNotGroupCreator
	}
	return s.repository.GetJoinRequests(ctx, groupID)
}

func (s *groupService) RespondToJoinRequest(ctx context.Context, creatorID, groupID, userID int, accept bool) error {
	if creatorID <= 0 || groupID <= 0 || userID <= 0 {
		return errors.New("invalid user or group")
	}
	ownerID, err := s.repository.GetGroupCreatorID(ctx, groupID)
	if err != nil {
		return err
	}
	if ownerID != creatorID {
		return ErrNotGroupCreator
	}
	err = s.repository.RespondToJoinRequest(ctx, groupID, userID, accept)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrJoinRequestNotPending
	}
	return err
}

func (s *groupService) GetGroupPosts(ctx context.Context, viewerID, groupID int) ([]models.GroupPost, error) {
	if viewerID <= 0 || groupID <= 0 {
		return nil, errors.New("invalid user or group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.GetGroupPosts(ctx, groupID)
}

func (s *groupService) CreateGroupPost(ctx context.Context, authorID, groupID int, content string) (*models.GroupPost, error) {
	content = strings.TrimSpace(content)
	if authorID <= 0 || groupID <= 0 || content == "" || len(content) > 5000 {
		return nil, ErrInvalidGroupPost
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, authorID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.CreateGroupPost(ctx, groupID, authorID, content)
}

func (s *groupService) CreateGroupComment(ctx context.Context, authorID, groupID, postID int, content string) (*models.GroupComment, error) {
	content = strings.TrimSpace(content)
	if authorID <= 0 || groupID <= 0 || postID <= 0 || content == "" || len(content) > 2000 {
		return nil, ErrInvalidGroupComment
	}
	postGroupID, err := s.repository.GetGroupPostGroupID(ctx, postID)
	if err != nil {
		return nil, err
	}
	if postGroupID != groupID {
		return nil, errors.New("post does not belong to this group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, authorID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.CreateGroupComment(ctx, postID, authorID, content)
}

func (s *groupService) GetGroupEvents(ctx context.Context, viewerID, groupID int) ([]models.GroupEvent, error) {
	if viewerID <= 0 || groupID <= 0 {
		return nil, errors.New("invalid user or group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, viewerID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.GetGroupEvents(ctx, groupID, viewerID)
}

func (s *groupService) CreateGroupEvent(ctx context.Context, creatorID, groupID int, title, description, eventTime string) (*models.GroupEvent, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	eventTime = strings.TrimSpace(eventTime)
	if creatorID <= 0 || groupID <= 0 || title == "" || len(title) > 120 || description == "" || len(description) > 2000 {
		return nil, ErrInvalidGroupEvent
	}
	if _, err := time.Parse(time.RFC3339, eventTime); err != nil {
		return nil, ErrInvalidGroupEvent
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, creatorID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrNotGroupMember
	}
	return s.repository.CreateGroupEvent(ctx, groupID, creatorID, title, description, eventTime)
}

func (s *groupService) RespondToEvent(ctx context.Context, userID, groupID, eventID int, response string) error {
	if userID <= 0 || groupID <= 0 || eventID <= 0 || (response != "going" && response != "not_going") {
		return errors.New("event response must be going or not_going")
	}
	eventGroupID, err := s.repository.GetGroupEventGroupID(ctx, eventID)
	if err != nil {
		return err
	}
	if eventGroupID != groupID {
		return errors.New("event does not belong to this group")
	}
	allowed, err := s.repository.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrNotGroupMember
	}
	return s.repository.RespondToEvent(ctx, eventID, userID, response)
}
