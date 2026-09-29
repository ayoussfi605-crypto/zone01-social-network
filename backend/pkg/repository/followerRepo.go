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
	query := `INSERT INTO followers (follower_id, following_id, status) VALUES (?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, followerID, targetID, status)
	return err
}

// Task 1.1: Accept/Reject request
func (r *followerRepository) UpdateFollowStatus(ctx context.Context, followerID, targetID int, newStatus string) error {
	query := `UPDATE followers SET status = ? WHERE follower_id = ? AND following_id = ?`
	_, err := r.db.ExecContext(ctx, query, newStatus, followerID, targetID)
	return err
}

// Task 1.1: Unfollow user
func (r *followerRepository) DeleteFollower(ctx context.Context, followerID, targetID int) error {
	query := `DELETE FROM followers WHERE follower_id = ? AND following_id = ?`
	_, err := r.db.ExecContext(ctx, query, followerID, targetID)
	return err	
}

func (r *followerRepository) GetFollowers(ctx context.Context, userID int) ([]models.FollowerData, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, u.avatar_url 
		FROM users u 
		INNER JOIN followers f ON u.id = f.follower_id 
		WHERE f.following_id = ? AND f.status = 'accepted'`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var followers []models.FollowerData
	for rows.Next() {
		var user models.FollowerData
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarUrl); err != nil {
			return nil, err
		}
		followers = append(followers, user)
	}
	return followers, nil
}

func (r *followerRepository) GetFollowing(ctx context.Context, userID int) ([]models.FollowerData, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, u.avatar_url 
		FROM users u 
		INNER JOIN followers f ON u.id = f.following_id 
		WHERE f.follower_id = ? AND f.status = 'accepted'`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var following []models.FollowerData
	for rows.Next() {
		var user models.FollowerData
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.AvatarUrl); err != nil {
			return nil, err
		}
		following = append(following, user)
	}
	return following, nil
}

func (r *followerRepository) GetFollowStatus(ctx context.Context, followerID, followingID int) (string, error) {
	var status string
	query := `SELECT status FROM followers WHERE follower_id = ? AND following_id = ?`
	
	err := r.db.QueryRowContext(ctx, query, followerID, followingID).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			// if not found any ligne, he is not fllow
			return "none", nil
		}
		return "", err
	}
	
	return status, nil
}