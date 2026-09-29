package repository

import (
	"context"
	"database/sql"
	"errors"
	
	"social/pkg/models"
)

type UserRepository interface {
	GetUserByID(ctx context.Context, userID int) (*models.User, error)
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

// 4. Fonction to get profile profil
func (r *userRepository) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, first_name, last_name, avatar_url, is_public FROM users WHERE id = ?`
	
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&user.ID,
		&user.First_Name,
		&user.Last_Name,
		&user.Avatar_Url,
		&user.Is_Public,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return user, nil
}