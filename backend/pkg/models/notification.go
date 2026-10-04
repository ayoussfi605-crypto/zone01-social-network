package models

// Notification matches 000012_create_notifications_table.
// The display data (actor, group and event info) is stored as JSON in the
// payload column so a notification can be rendered without extra joins.
type Notification struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	Type        string `json:"type"`
	ActorID     int    `json:"actor_id"`
	ActorName   string `json:"actor_name"`
	ActorAvatar string `json:"actor_avatar"`
	GroupID     int    `json:"group_id,omitempty"`
	GroupTitle  string `json:"group_title,omitempty"`
	EventID     int    `json:"event_id,omitempty"`
	EventTitle  string `json:"event_title,omitempty"`
	Text        string `json:"text"`
	IsRead      bool   `json:"is_read"`
	CreatedAt   string `json:"created_at"`
}

// Notification types used across the backend and frontend.
const (
	NotificationFollowRequest   = "follow_request"
	NotificationGroupInvite     = "group_invite"
	NotificationGroupJoinReq    = "group_join_request"
	NotificationGroupEvent      = "group_event"
)
