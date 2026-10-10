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
	MarkMessagesAsRead(id int, userId int) error
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
	COALESCE(users.nickname, '')
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
    u.id,
    COALESCE(u.nickname, '') AS name,
    COALESCE(u.first_name || ' ' || u.last_name, '') AS full_name,
    COALESCE('@' || u.nickname, '') AS handle,
    COALESCE(u.avatar_path, '') AS avatar,

    COALESCE(last_msg.content, '') AS last_message,
    COALESCE(strftime('%H:%M', last_msg.created_at), '') AS time,

    (
        SELECT COUNT(*)
        FROM messages
        WHERE sender_id = u.id
          AND recipient_id = ?
          AND read_at IS NULL
    ) AS unread_count,

    0 AS online

FROM users u

INNER JOIN followers f
    ON (
        (f.follower_id = ? AND f.followed_id = u.id)
        OR
        (f.followed_id = ? AND f.follower_id = u.id)
    )
    AND f.status = 'accepted'

LEFT JOIN messages last_msg
    ON last_msg.id = (
        SELECT id
        FROM messages
        WHERE (sender_id = u.id AND recipient_id = ?)
           OR (sender_id = ? AND recipient_id = u.id)
        ORDER BY created_at DESC
        LIMIT 1
    )

WHERE u.id != ?

; 
	`
	rows, err := r.db.Query(
		query,
		userId,
		userId,
		userId,
		userId,
		userId,
		userId,
	)
	if err != nil {
		return nil, fmt.Errorf("get chat users: %w", err)
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
			&u.LastMessage,
			&u.Time,
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

func (r *chatRepository) MarkMessagesAsRead(recipient_id int, sender_id int) error {
	query := `
UPDATE messages
SET read_at = CURRENT_DATE
WHERE sender_id = ?
AND recipient_id = ?;	
	`
	_, err := r.db.Exec(query, sender_id, recipient_id)
	if err != nil {
		return errors.New("we can not inster now reat at")
	}
	fmt.Println("Messages goood senderID is :", sender_id, "reciverId is :", recipient_id)
	return nil
}
