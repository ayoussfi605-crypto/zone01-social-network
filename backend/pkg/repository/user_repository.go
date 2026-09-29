package repository

import (
	"database/sql"

	"social-network/pkg/models"
)

// CreateUser inserts a new user. Returns new user id.
func CreateUser(db *sql.DB, u models.User) (int64, error) {
	result, err := db.Exec(
		`INSERT INTO users (email, password_hash, first_name, last_name, dob, avatar_path, nickname, about_me, is_private)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		u.Email, u.PasswordHash, u.FirstName, u.LastName, u.Dob,
		u.AvatarPath, u.Nickname, u.AboutMe, boolToInt(u.IsPrivate),
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetUserByEmail finds a user by email. Returns sql.ErrNoRows if not found.
func GetUserByEmail(db *sql.DB, email string) (*models.User, error) {
	row := db.QueryRow(
		`SELECT id, email, password_hash, first_name, last_name, dob,
		        COALESCE(avatar_path,''), COALESCE(nickname,''), COALESCE(about_me,''),
		        is_private, created_at
		 FROM users WHERE email = ?`, email,
	)
	return scanUser(row)
}

// GetUserByID finds a user by id.
func GetUserByID(db *sql.DB, id int) (*models.User, error) {
	row := db.QueryRow(
		`SELECT id, email, password_hash, first_name, last_name, dob,
		        COALESCE(avatar_path,''), COALESCE(nickname,''), COALESCE(about_me,''),
		        is_private, created_at
		 FROM users WHERE id = ?`, id,
	)
	return scanUser(row)
}

// UpdatePrivacy switches profile public/private.
func UpdatePrivacy(db *sql.DB, userID int, isPrivate bool) error {
	_, err := db.Exec(`UPDATE users SET is_private = ? WHERE id = ?`, boolToInt(isPrivate), userID)
	return err
}

// scanUser converts one DB row into a User struct.
// *sql.Row has Scan, *sql.Rows also has Scan, so we use an interface.
func scanUser(row interface{ Scan(...any) error }) (*models.User, error) {
	var u models.User
	var isPrivate int
	err := row.Scan(
		&u.Id, &u.Email, &u.PasswordHash, &u.FirstName, &u.LastName, &u.Dob,
		&u.AvatarPath, &u.Nickname, &u.AboutMe,
		&isPrivate, &u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	u.IsPrivate = isPrivate == 1
	return &u, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

