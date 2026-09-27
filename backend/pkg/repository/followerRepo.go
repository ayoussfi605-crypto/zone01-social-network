package repository

import (
	"database/sql"
)

type FollowerRepo struct {
	DB *sql.DB
}

func NewFollowerRepo(db *sql.DB) *FollowerRepo {
	return &FollowerRepo{DB: db}
}

// Task 1.1: Insert relationship (Send follow request)
func (r *FollowerRepo) CreateFollowRequest(followerID, targetID int, status string) error {
	query := `INSERT INTO followers (follower_id, followed_id, status) VALUES (?, ?, ?)`
	_, err := r.DB.Exec(query, followerID, targetID, status)
	return err
}

// Task 1.1: Accept/Reject request
func (r *FollowerRepo) UpdateFollowStatus(followerID, targetID int, newStatus string) error {
	query := `UPDATE followers SET status = ? WHERE follower_id = ? AND followed_id = ?`
	_, err := r.DB.Exec(query, newStatus, followerID, targetID)
	return err
}

// Task 1.1: Unfollow user
func (r *FollowerRepo) DeleteFollower(followerID, targetID int) error {
	query := `DELETE FROM followers WHERE follower_id = ? AND followed_id = ?`
	_, err := r.DB.Exec(query, followerID, targetID)
	return err
}
