package repository

import (
	"context"
	"database/sql"
	"errors"
)

type ChatRepository interface {
	GetUserById(ctx context.Context, userId int) (*ChatUsers, error)
	GetChatUsers(ctx context.Context, userID int) ([]ChatUsers, error)
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

func (r *chatRepository) GetUserById(ctx context.Context, userId int) (*ChatUsers, error) {
	query := `
SELECT
	users.id,
	users.nickname
FROM users
WHERE users.id = ?;
`
	rows, err := r.db.Query(query, userId)
	if err != nil || rows.Err() != nil {
		return nil, errors.New("you can't send message to this user you need to follow him first")
	}

	var user ChatUsers

	if rows.Next() {
		err := rows.Scan(&user.Id, &user.Name)
		if err != nil {
			return nil, errors.New("you can't send message to this user you need to follow him first")
		}
	}

	return &user, nil
}

func (r *chatRepository) GetChatUsers(ctx context.Context, userId int) ([]ChatUsers, error) {
	query := `
SELECT
    users.id,
    users.nickname,
	users.first_name|| ' ' || users.last_name AS fullname,
    users.avatar_path
FROM users
INNER JOIN followers
    ON users.id = followers.followed_id
WHERE followers.status = 'accepted'
  AND followers.follower_id = ?;

`
	rows, err := r.db.Query(query, userId)
	if err != nil || rows.Err() != nil {
		return nil, errors.New("invalid rows")
	}

	var AllUsers []ChatUsers

	for rows.Next() {
		var u ChatUsers

		err := rows.Scan(&u.Id, &u.Name, &u.FullName, &u.Avatar)
		if err != nil {
			return nil, errors.New("Invalide Query")
		}
		AllUsers = append(AllUsers, u)
	}

	return AllUsers, nil
}

func (r *chatRepository) SaveMessage(senderID int, receiverID int, message string) error {
	// Implement the logic to save the message to the database
	return nil
}
