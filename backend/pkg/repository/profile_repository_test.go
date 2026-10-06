package repository

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestGetProfileStatsReturnsAuthorAndAcceptedRelationshipCounts(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	_, err = db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			avatar_path TEXT,
			nickname TEXT,
			is_private INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			author_id INTEGER NOT NULL,
			content TEXT NOT NULL DEFAULT '',
			privacy TEXT NOT NULL DEFAULT 'public'
		);
		CREATE TABLE followers (
			follower_id INTEGER NOT NULL,
			followed_id INTEGER NOT NULL,
			status TEXT NOT NULL CHECK(status IN ('pending', 'accepted')),
			PRIMARY KEY (follower_id, followed_id)
		);
		INSERT INTO users (id, first_name, last_name) VALUES (1, 'Ari', 'Profile');
		INSERT INTO posts (author_id, content) VALUES
			(1, 'first'),
			(1, 'second');
		INSERT INTO followers (follower_id, followed_id, status) VALUES
			(2, 1, 'accepted'),
			(3, 1, 'accepted'),
			(4, 1, 'pending'),
			(1, 5, 'accepted'),
			(1, 6, 'accepted');
	`)
	if err != nil {
		t.Fatal(err)
	}

	repo := NewProfileUserRepository(db)
	stats, err := repo.GetProfileStats(context.Background(), 1)
	if err != nil {
		t.Fatalf("GetProfileStats() error = %v", err)
	}
	if stats.PostCount != 2 {
		t.Fatalf("PostCount = %d, want 2", stats.PostCount)
	}
	if stats.FollowerCount != 2 {
		t.Fatalf("FollowerCount = %d, want 2", stats.FollowerCount)
	}
	if stats.FollowingCount != 2 {
		t.Fatalf("FollowingCount = %d, want 2", stats.FollowingCount)
	}
}
