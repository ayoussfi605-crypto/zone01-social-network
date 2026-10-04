package models

import "database/sql"

type ChatMessage struct {
	SenderId   int           `json:"sender_id"`
	ReceiverId int           `json:"receiver_id"`
	GroupId    sql.NullInt64 `json:"group_id"`
	Message    string        `json:"message"`
	Timestamp  string        `json:"timestamp"`
}

type GroupChatMessage struct {
	ID         int    `json:"id"`
	GroupID    int    `json:"group_id"`
	SenderID   int    `json:"sender_id"`
	SenderName string `json:"sender_name"`
	Message    string `json:"message"`
	Timestamp  string `json:"timestamp"`
}
