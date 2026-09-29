package repository

import (
	"database/sql"
	"time"

	"social-network-network/pkg/models"
)

// CreateSession stores a login token with expiry time.
func CreateSession(db *sql.DB, userID int, token string, expiresAt time.Time) error {
	_, err := db.Exec(
		`INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)`,
		userID, token, expiresAt.Format(time.RFC3339),
	)
	return err
}

// GetSessionByToken returns session only if it exists AND is not expired.
func GetSessionByToken(db *sql.DB, token string) (*models.Session, error) {
	var s models.Session
	err := db.QueryRow(
		`SELECT id, user_id, session_token, expires_at, created_at
		 FROM sessions WHERE session_token = ?`, token,
	).Scan(&s.Id, &s.UserId, &s.Token, &s.ExpiresAt, &s.CreatedAt)
	if err != nil {
		return nil, err // sql.ErrNoRows = invalid token
	}

	// Check expiry date.
	expires, err := time.Parse(time.RFC3339, s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	if time.Now().After(expires) {
		// Token expired -> delete it so DB stays clean.
		DeleteSession(db, token)
		return nil, sql.ErrNoRows
	}
	return &s, nil
}

// DeleteSession removes token on logout.
func DeleteSession(db *sql.DB, token string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE session_token = ?`, token)
	return err
}
