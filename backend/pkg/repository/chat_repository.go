package repository

import (
	"database/sql"
	"errors"
	"fmt"

	"social-network-network/pkg/models"
)

type ChatRepository interface {
	GetUserById(userId int) (*ChatUsers, error)
	GetChatUsers(userID int) ([]ChatUsers, error)
	SaveMessage(senderID int, receiverID int, message string) error
	GetMessages(senderID int, receiverID int) ([]models.ChatMessage, error)
	CanMessage(senderID, receiverID int) (bool, error)
	IsGroupMember(groupID, userID int) (bool, error)
	SaveGroupMessage(senderID, groupID int, message string) error
	GetGroupMessages(groupID int) ([]models.GroupChatMessage, error)
	GetGroupMemberIDs(groupID int) ([]int, error)
}

type ChatUsers struct {
	Id          string `json:"id"`
	Name        string `json:"name"`
	FullName    string `json:"fullName"`
	Handle      string `json:"handle"`
	Avatar      string `json:"avatar"`
	Time        string `json:"time"`
	LastMessage string `json:"lastMessage"`
	Unread      int    `json:"unread"`
	Online      bool   `json:"online"`
}

type chatRepository struct {
	db *sql.DB
}

func NewChatRepository(db *sql.DB) ChatRepository {
	return &chatRepository{db: db}
}

func (r *chatRepository) GetUserById(userId int) (*ChatUsers, error) {
	query := `
SELECT
	users.id,
	users.nickname
FROM users
WHERE users.id = ?;
`
	var user ChatUsers
	err := r.db.QueryRow(query, userId).Scan(&user.Id, &user.Name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New(
				"you can't send message to this user",
			)
		}

		return nil, err
	}

	return &user, nil
}

func (r *chatRepository) GetChatUsers(
	userId int,
) ([]ChatUsers, error) {
	query := `
SELECT
    users.id,
    COALESCE(users.nickname, '') AS name,
    COALESCE(users.first_name || ' ' || users.last_name, '') AS full_name,
    COALESCE('@' || users.nickname, '') AS handle,
    COALESCE(users.avatar_path, '') AS avatar,
    COALESCE(
        (SELECT strftime('%H:%M', messages.created_at)
         FROM messages
         WHERE (messages.sender_id = users.id OR messages.recipient_id = users.id)
         ORDER BY messages.created_at DESC
         LIMIT 1),
        ''
    ) AS time,
    COALESCE(
        (SELECT messages.content
         FROM messages
         WHERE (messages.sender_id = users.id OR messages.recipient_id = users.id)
         ORDER BY messages.created_at DESC
         LIMIT 1),
        ''
    ) AS last_message,
    0 AS unread,
    0 AS online
FROM users
INNER JOIN followers
    ON users.id = followers.followed_id
WHERE followers.status = 'accepted'
  AND followers.follower_id = ?;
`

	rows, err := r.db.Query(query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allUsers []ChatUsers

	for rows.Next() {
		var u ChatUsers

		if err := rows.Scan(
			&u.Id,
			&u.Name,
			&u.FullName,
			&u.Handle,
			&u.Avatar,
			&u.Time,
			&u.LastMessage,
			&u.Unread,
			&u.Online,
		); err != nil {
			return nil, err
		}

		allUsers = append(allUsers, u)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return allUsers, nil
}

func (r *chatRepository) SaveMessage(senderID int, receiverID int, message string) error {
	fmt.Println("Saving message to DB:", senderID, receiverID, message)
	query := `
INSERT INTO messages (sender_id, recipient_id, content)
VALUES (?, ?, ?);
`
	_, err := r.db.Exec(query, senderID, receiverID, message)
	if err != nil {
		return err
	}
	fmt.Println("Message saved successfully")
	return nil
}

func (r *chatRepository) GetMessages(senderID int, receiverID int) ([]models.ChatMessage, error) {
	query := `
SELECT
	sender_id,
	recipient_id AS receiver_id,
	group_id,
	content,
	created_at AS timestamp
FROM messages
WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
ORDER BY created_at ASC;
`

	rows, err := r.db.Query(query, senderID, receiverID, receiverID, senderID)
	if err != nil || rows.Err() != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.ChatMessage

	for rows.Next() {
		var m models.ChatMessage

		if err := rows.Scan(
			&m.SenderId,
			&m.ReceiverId,
			&m.GroupId,
			&m.Message,
			&m.Timestamp,
		); err != nil {
			return nil, err
		}
		fmt.Println("Retrieved message:", m.Message, "<")

		messages = append(messages, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return messages, nil
}

func (r *chatRepository) CanMessage(senderID, receiverID int) (bool, error) {
	var allowed bool
	err := r.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM followers
			WHERE status = 'accepted' AND (
				(follower_id = ? AND followed_id = ?) OR
				(follower_id = ? AND followed_id = ?)
			)
			UNION ALL
			SELECT 1 FROM users WHERE id = ? AND COALESCE(is_private, 0) = 0
		)
	`, senderID, receiverID, receiverID, senderID, receiverID).Scan(&allowed)
	return allowed, err
}

func (r *chatRepository) IsGroupMember(groupID, userID int) (bool, error) {
	var member bool
	err := r.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM groups WHERE id = ? AND creator_id = ?
			UNION ALL
			SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'member'
		)
	`, groupID, userID, groupID, userID).Scan(&member)
	return member, err
}

func (r *chatRepository) SaveGroupMessage(senderID, groupID int, message string) error {
	_, err := r.db.Exec(`
		INSERT INTO messages (sender_id, group_id, content) VALUES (?, ?, ?)
	`, senderID, groupID, message)
	return err
}

func (r *chatRepository) GetGroupMessages(groupID int) ([]models.GroupChatMessage, error) {
	rows, err := r.db.Query(`
		SELECT m.id, m.group_id, m.sender_id,
		       TRIM(u.first_name || ' ' || u.last_name), m.content, m.created_at
		FROM messages m JOIN users u ON u.id = m.sender_id
		WHERE m.group_id = ?
		ORDER BY m.created_at ASC, m.id ASC
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]models.GroupChatMessage, 0)
	for rows.Next() {
		var message models.GroupChatMessage
		if err := rows.Scan(
			&message.ID,
			&message.GroupID,
			&message.SenderID,
			&message.SenderName,
			&message.Message,
			&message.Timestamp,
		); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

func (r *chatRepository) GetGroupMemberIDs(groupID int) ([]int, error) {
	rows, err := r.db.Query(`
		SELECT creator_id FROM groups WHERE id = ?
		UNION
		SELECT user_id FROM group_members WHERE group_id = ? AND status = 'member'
	`, groupID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	userIDs := make([]int, 0)
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, userID)
	}
	return userIDs, rows.Err()
}
