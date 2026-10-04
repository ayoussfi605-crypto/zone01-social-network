package repository

import (
	"database/sql"
	"errors"
	"fmt"
)

type ChatRepository interface {
	GetUserById(userId int) (*ChatUsers, error)
	GetChatUsers(userID int) ([]ChatUsers, error)
	SaveMessage(senderID int, receiverID int, message string) error
}

type ChatUsers struct {
	Id          string `json:"id"`
	Name        string `json:"name"`
	FullName    string `json:"fullName"`
	Handle      string `json:"handle"`
	Avatar      string `json:"avatar"`
	Time        string `json:"time"`
	LastMessage string `json:"lastMessage"`
	Unread      int    `json:"Unread"`
	Online      bool   `json:"Online"`
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
    users.nickname,
    users.first_name || ' ' || users.last_name AS fullname,
    users.avatar_path
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
			&u.Avatar,
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
