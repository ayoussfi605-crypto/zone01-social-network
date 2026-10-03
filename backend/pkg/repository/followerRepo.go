package repository

import (
	"context"
	"database/sql"
	"social-network-network/pkg/models"
)

type FollowerRepository interface {
	GetFollowStatus(ctx context.Context, followerID, followingID int) (string, error)
	GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error)
	GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error)
	GetPendingFollowRequests(ctx context.Context, userID int) ([]models.FollowerData, error)
	GetUserPrivacy(ctx context.Context, userID int) (bool, error)
	CreateFollowRequest(ctx context.Context, followerID, targetID int, status string) error
	UpdateFollowStatus(ctx context.Context, followerID, targetID int, newStatus string) error
	DeleteFollower(ctx context.Context, followerID, targetID int) error
}

type followerRepository struct {
	db *sql.DB
}

func NewFollowerRepo(db *sql.DB) FollowerRepository {
	return &followerRepository{db: db}
}

// Task 1.1: Insert relationship (Send follow request)
func (r *followerRepository) CreateFollowRequest(ctx context.Context, followerID, targetID int, status string) error {
	query := `INSERT INTO followers (follower_id, followed_id, status) VALUES (?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, followerID, targetID, status)
	return err
}

// Task 1.1: Accept/Reject request
func (r *followerRepository) UpdateFollowStatus(ctx context.Context, followerID, targetID int, newStatus string) error {
	query := `UPDATE followers SET status = ? WHERE follower_id = ? AND followed_id = ? AND status = 'pending'`
	result, err := r.db.ExecContext(ctx, query, newStatus, followerID, targetID)
	if err != nil {
		return err
	}
	return requireOneRow(result)
}

// Task 1.1: Unfollow user
func (r *followerRepository) DeleteFollower(ctx context.Context, followerID, targetID int) error {
	query := `DELETE FROM followers WHERE follower_id = ? AND followed_id = ?`
	result, err := r.db.ExecContext(ctx, query, followerID, targetID)
	if err != nil {
		return err
	}
	return requireOneRow(result)
}

func (r *followerRepository) GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM users u 
		INNER JOIN followers f ON u.id = f.follower_id 
		WHERE f.followed_id = ? AND f.status = 'accepted'`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var followers []models.FollowerData
	for rows.Next() {
		var user models.FollowerData
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarPath); err != nil {
			return nil, err
		}
		followers = append(followers, user)
	}
	return followers, rows.Err()
}

func (r *followerRepository) GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM users u 
		INNER JOIN followers f ON u.id = f.followed_id
		WHERE f.follower_id = ? AND f.status = 'accepted'`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var following []models.FollowerData
	for rows.Next() {
		var user models.FollowerData
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarPath); err != nil {
			return nil, err
		}
		following = append(following, user)
	}
	return following, rows.Err()
}

func (r *followerRepository) GetPendingFollowRequests(ctx context.Context, userID int) ([]models.FollowerData, error) {
	query := `SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM users u INNER JOIN followers f ON u.id = f.follower_id
		WHERE f.followed_id = ? AND f.status = 'pending' ORDER BY f.created_at`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]models.FollowerData, 0)
	for rows.Next() {
		var user models.FollowerData
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarPath); err != nil {
			return nil, err
		}
		requests = append(requests, user)
	}
	return requests, rows.Err()
}

func (r *followerRepository) GetUserPrivacy(ctx context.Context, userID int) (bool, error) {
	var isPrivate int
	err := r.db.QueryRowContext(ctx, `SELECT COALESCE(is_private, 0) FROM users WHERE id = ?`, userID).Scan(&isPrivate)
	return isPrivate == 1, err
}

func (r *followerRepository) GetFollowStatus(ctx context.Context, followerID, followingID int) (string, error) {
	var status string
	query := `SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?`
	err := r.db.QueryRowContext(ctx, query, followerID, followingID).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			// No row means the users do not have a follow relationship.
			return "none", nil
		}
		return "", err
	}
	return status, nil
}

func requireOneRow(result sql.Result) error {
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return sql.ErrNoRows
	}
	return nil
}