package services

import (
	"context"
	"fmt"
	"strings"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

type NotificationService interface {
	NotifyFollowRequest(ctx context.Context, recipientID int, actor *models.User) (*models.Notification, error)
	NotifyGroupInvite(ctx context.Context, recipientID, groupID int, actor *models.User) (*models.Notification, error)
	NotifyJoinRequest(ctx context.Context, groupID int, actor *models.User) (*models.Notification, error)
	NotifyGroupEvent(ctx context.Context, groupID, eventID int, eventTitle string, actor *models.User) ([]models.Notification, error)
	List(ctx context.Context, userID, limit int) ([]models.Notification, error)
	UnreadCount(ctx context.Context, userID int) (int, error)
	MarkRead(ctx context.Context, userID, id int) error
	MarkAllRead(ctx context.Context, userID int) error
}

type notificationService struct {
	repository repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repository: repo}
}

func (s *notificationService) NotifyFollowRequest(ctx context.Context, recipientID int, actor *models.User) (*models.Notification, error) {
	return s.create(ctx, models.Notification{
		UserID:      recipientID,
		Type:        models.NotificationFollowRequest,
		ActorID:     actor.Id,
		ActorName:   actorName(actor),
		ActorAvatar: actor.AvatarPath,
		Text:        fmt.Sprintf("%s sent you a follow request", actorName(actor)),
	})
}

func (s *notificationService) NotifyGroupInvite(ctx context.Context, recipientID, groupID int, actor *models.User) (*models.Notification, error) {
	if recipientID <= 0 || recipientID == actor.Id {
		return nil, nil
	}
	_, title, err := s.repository.GetGroupInfo(ctx, groupID)
	if err != nil {
		return nil, err
	}
	return s.create(ctx, models.Notification{
		UserID:      recipientID,
		Type:        models.NotificationGroupInvite,
		ActorID:     actor.Id,
		ActorName:   actorName(actor),
		ActorAvatar: actor.AvatarPath,
		GroupID:     groupID,
		GroupTitle:  title,
		Text:        fmt.Sprintf("%s invited you to join %s", actorName(actor), title),
	})
}

func (s *notificationService) NotifyJoinRequest(ctx context.Context, groupID int, actor *models.User) (*models.Notification, error) {
	creatorID, title, err := s.repository.GetGroupInfo(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if creatorID == actor.Id {
		return nil, nil
	}
	return s.create(ctx, models.Notification{
		UserID:      creatorID,
		Type:        models.NotificationGroupJoinReq,
		ActorID:     actor.Id,
		ActorName:   actorName(actor),
		ActorAvatar: actor.AvatarPath,
		GroupID:     groupID,
		GroupTitle:  title,
		Text:        fmt.Sprintf("%s requested to join %s", actorName(actor), title),
	})
}

func (s *notificationService) NotifyGroupEvent(ctx context.Context, groupID, eventID int, eventTitle string, actor *models.User) ([]models.Notification, error) {
	_, title, err := s.repository.GetGroupInfo(ctx, groupID)
	if err != nil {
		return nil, err
	}
	memberIDs, err := s.repository.GetGroupMemberIDs(ctx, groupID)
	if err != nil {
		return nil, err
	}

	created := make([]models.Notification, 0, len(memberIDs))
	for _, memberID := range memberIDs {
		if memberID == actor.Id {
			continue
		}
		notification, err := s.create(ctx, models.Notification{
			UserID:      memberID,
			Type:        models.NotificationGroupEvent,
			ActorID:     actor.Id,
			ActorName:   actorName(actor),
			ActorAvatar: actor.AvatarPath,
			GroupID:     groupID,
			GroupTitle:  title,
			EventID:     eventID,
			EventTitle:  eventTitle,
			Text:        fmt.Sprintf("%s created the event \"%s\" in %s", actorName(actor), eventTitle, title),
		})
		if err != nil {
			return nil, err
		}
		created = append(created, *notification)
	}
	return created, nil
}

func (s *notificationService) List(ctx context.Context, userID, limit int) ([]models.Notification, error) {
	return s.repository.List(ctx, userID, limit)
}

func (s *notificationService) UnreadCount(ctx context.Context, userID int) (int, error) {
	return s.repository.UnreadCount(ctx, userID)
}

func (s *notificationService) MarkRead(ctx context.Context, userID, id int) error {
	return s.repository.MarkRead(ctx, userID, id)
}

func (s *notificationService) MarkAllRead(ctx context.Context, userID int) error {
	return s.repository.MarkAllRead(ctx, userID)
}

func (s *notificationService) create(ctx context.Context, n models.Notification) (*models.Notification, error) {
	if n.UserID <= 0 {
		return nil, nil
	}
	if err := s.repository.Create(ctx, n); err != nil {
		return nil, err
	}
	return &n, nil
}

func actorName(user *models.User) string {
	if user == nil {
		return "Someone"
	}
	name := strings.TrimSpace(user.FirstName + " " + user.LastName)
	if name == "" {
		return "Someone"
	}
	return name
}
