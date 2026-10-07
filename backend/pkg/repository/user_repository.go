package repository

import (
	"context"
	"database/sql"

	"social-network-network/pkg/models"
)

type ProfileUserRepository interface {
	GetProfileUser(ctx context.Context, userID int) (*models.User, error)
	GetProfileStats(ctx context.Context, userID int) (models.ProfileStats, error)
	DiscoverUsers(ctx context.Context, viewerID int, query string, limit, offset int) ([]models.FollowerData, error)
}

type profileUserRepository struct {
	db *sql.DB
}

func NewProfileUserRepository(db *sql.DB) ProfileUserRepository {
	return &profileUserRepository{db: db}
}

func (r *profileUserRepository) GetProfileStats(ctx context.Context, userID int) (models.ProfileStats, error) {
	var stats models.ProfileStats
	err := r.db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*) FROM posts WHERE author_id = ?),
			(SELECT COUNT(*) FROM followers WHERE followed_id = ? AND status = 'accepted'),
			(SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted')
	`, userID, userID, userID).Scan(
		&stats.PostCount,
		&stats.FollowerCount,
		&stats.FollowingCount,
	)
	return stats, err
}

func (r *profileUserRepository) GetProfileUser(ctx context.Context, userID int) (*models.User, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, first_name, last_name, dob,
		        COALESCE(avatar_path,''), COALESCE(nickname,''), COALESCE(about_me,''),
		        is_private, created_at
		 FROM users WHERE id = ?`, userID)
	return scanUser(row)
}

func (r *profileUserRepository) DiscoverUsers(ctx context.Context, viewerID int, query string, limit, offset int) ([]models.FollowerData, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id, u.first_name, u.last_name,
		       COALESCE(u.avatar_path, ''), COALESCE(u.nickname, ''),
		       COALESCE(f.status, 'none')
		FROM users u
		LEFT JOIN followers f ON f.follower_id = ? AND f.followed_id = u.id
		WHERE u.id != ?
		  AND (? = '' OR instr(lower(u.first_name || ' ' || u.last_name || ' ' || COALESCE(u.nickname, '')), lower(?)) > 0)
		ORDER BY u.id ASC
		LIMIT ? OFFSET ?`, viewerID, viewerID, query, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.FollowerData, 0, limit)
	for rows.Next() {
		var user models.FollowerData
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarPath, &user.Nickname, &user.FollowStatus); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

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

// UpdateProfile persists the current user's bio and privacy setting.
func UpdateProfile(db *sql.DB, userID int, aboutMe string, isPrivate bool) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE users SET about_me = ?, is_private = ? WHERE id = ?`,
		aboutMe, boolToInt(isPrivate), userID,
	); err != nil {
		return err
	}
	if !isPrivate {
		if _, err := tx.Exec(`
			UPDATE followers
			SET status = 'accepted'
			WHERE followed_id = ? AND status = 'pending'
		`, userID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// UpdatePrivacy switches profile public/private and automatically grants
// previously pending followers when the profile becomes public.
func UpdatePrivacy(db *sql.DB, userID int, isPrivate bool) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE users SET is_private = ? WHERE id = ?`, boolToInt(isPrivate), userID); err != nil {
		return err
	}
	if !isPrivate {
		if _, err := tx.Exec(`
			UPDATE followers
			SET status = 'accepted'
			WHERE followed_id = ? AND status = 'pending'
		`, userID); err != nil {
			return err
		}
	}
	return tx.Commit()
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
