package repository

import "database/sql"

type ChatRepository interface {
	GetChatUsers()
}

type chatRepository struct {
	db *sql.DB
}

func NewChatRepository(db *sql.DB) ChatRepository {
	return &chatRepository{db: db}
}

func (r *chatRepository) GetChatUsers() {}
