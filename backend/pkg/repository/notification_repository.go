package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"social-network-network/pkg/models"
)

type NotificationRepository interface {
	Create(ctx context.Context, n models.Notification) error
	List(ctx context.Context, userID, limit int) ([]models.Notification, error)
	UnreadCount(ctx context.Context, userID int) (int, error)
	MarkRead(ctx context.Context, userID, id int) error
	MarkAllRead(ctx context.Context, userID int) error
	GetGroupInfo(ctx context.Context, groupID int) (creatorID int, title string, err error)
	GetGroupMemberIDs(ctx context.Context, groupID int) ([]int, error)
}

type notificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

// notificationPayload is the JSON stored in notifications.payload.
type notificationPayload struct {
	ActorID     int    `json:"actor_id"`
	ActorName   string `json:"actor_name"`
	ActorAvatar string `json:"actor_avatar"`
	GroupID     int    `json:"group_id,omitempty"`
	GroupTitle  string `json:"group_title,omitempty"`
	EventID     int    `json:"event_id,omitempty"`
	EventTitle  string `json:"event_title,omitempty"`
	Text        string `json:"text"`
}

func (r *notificationRepository) Create(ctx context.Context, n models.Notification) error {
	payload, err := json.Marshal(notificationPayload{
		ActorID:     n.ActorID,
		ActorName:   n.ActorName,
		ActorAvatar: n.ActorAvatar,
		GroupID:     n.GroupID,
		GroupTitle:  n.GroupTitle,
		EventID:     n.EventID,
		EventTitle:  n.EventTitle,
		Text:        n.Text,
	})
	if err != nil {
		return fmt.Errorf("encode notification payload: %w", err)
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)
	`, n.UserID, n.Type, string(payload))
	if err != nil {
		return fmt.Errorf("create notification: %w", err)
	}
	return nil
}

func (r *notificationRepository) List(ctx context.Context, userID, limit int) ([]models.Notification, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, type, COALESCE(payload, ''), is_read, created_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC, id DESC
		LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("load notifications: %w", err)
	}
	defer rows.Close()

	list := make([]models.Notification, 0)
	for rows.Next() {
		var n models.Notification
		var raw string
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &raw, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}
		if raw != "" {
			var payload notificationPayload
			if err := json.Unmarshal([]byte(raw), &payload); err == nil {
				n.ActorID = payload.ActorID
				n.ActorName = payload.ActorName
				n.ActorAvatar = payload.ActorAvatar
				n.GroupID = payload.GroupID
				n.GroupTitle = payload.GroupTitle
				n.EventID = payload.EventID
				n.EventTitle = payload.EventTitle
				n.Text = payload.Text
			}
		}
		list = append(list, n)
	}
	return list, rows.Err()
}

func (r *notificationRepository) UnreadCount(ctx context.Context, userID int) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count unread notifications: %w", err)
	}
	return count, nil
}

func (r *notificationRepository) MarkRead(ctx context.Context, userID, id int) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?
	`, id, userID)
	if err != nil {
		return fmt.Errorf("mark notification read: %w", err)
	}
	return requireOneRow(result)
}

func (r *notificationRepository) MarkAllRead(ctx context.Context, userID int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE
	`, userID)
	if err != nil {
		return fmt.Errorf("mark all notifications read: %w", err)
	}
	return nil
}

func (r *notificationRepository) GetGroupInfo(ctx context.Context, groupID int) (int, string, error) {
	var creatorID int
	var title string
	err := r.db.QueryRowContext(ctx, `
		SELECT creator_id, title FROM groups WHERE id = ?
	`, groupID).Scan(&creatorID, &title)
	if err != nil {
		return 0, "", fmt.Errorf("load group info: %w", err)
	}
	return creatorID, title, nil
}

func (r *notificationRepository) GetGroupMemberIDs(ctx context.Context, groupID int) ([]int, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id
		FROM groups g JOIN users u ON u.id = g.creator_id
		WHERE g.id = ?
		UNION
		SELECT gm.user_id
		FROM group_members gm
		WHERE gm.group_id = ? AND gm.status = 'member'
	`, groupID, groupID)
	if err != nil {
		return nil, fmt.Errorf("load group member ids: %w", err)
	}
	defer rows.Close()

	ids := make([]int, 0)
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan group member id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
