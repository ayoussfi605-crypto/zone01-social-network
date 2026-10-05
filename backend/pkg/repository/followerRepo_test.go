package repository

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestFollowerRepositoryUsesMigrationColumns(t *testing.T) {
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
		CREATE TABLE followers (
			follower_id INTEGER NOT NULL,
			followed_id INTEGER NOT NULL,
			status TEXT NOT NULL CHECK(status IN ('pending', 'accepted')),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (follower_id, followed_id)
		);
		INSERT INTO users (id, first_name, last_name, avatar_path, nickname, is_private) VALUES
			(1, 'Ari', 'Follower', '/media/ari.png', 'ari_follower', 0),
			(2, 'Sam', 'Private', '/media/sam.gif', 'sam_private', 1);
	`)
	if err != nil {
		t.Fatal(err)
	}

	repo := NewFollowerRepo(db)
	ctx := context.Background()
	if err := repo.CreateFollowRequest(ctx, 1, 2, "pending"); err != nil {
		t.Fatalf("create follow request: %v", err)
	}
	if got, err := repo.GetFollowStatus(ctx, 1, 2); err != nil || got != "pending" {
		t.Fatalf("GetFollowStatus() = %q, %v; want pending", got, err)
	}
	if isPrivate, err := repo.GetUserPrivacy(ctx, 2); err != nil || !isPrivate {
		t.Fatalf("GetUserPrivacy() = %t, %v; want true", isPrivate, err)
	}

	pending, err := repo.GetPendingFollowRequests(ctx, 2)
	if err != nil || len(pending) != 1 || pending[0].AvatarPath != "/media/ari.png" {
		t.Fatalf("GetPendingFollowRequests() = %#v, %v", pending, err)
	}
	if err := repo.UpdateFollowStatus(ctx, 1, 2, "accepted"); err != nil {
		t.Fatalf("accept follow request: %v", err)
	}

	followers, err := repo.GetFollowers(ctx, 2)
	if err != nil || len(followers) != 1 || followers[0].ID != 1 {
		t.Fatalf("GetFollowers() = %#v, %v", followers, err)
	}
	following, err := repo.GetFollowing(ctx, 1)
	if err != nil || len(following) != 1 || following[0].ID != 2 || following[0].AvatarPath != "/media/sam.gif" {
		t.Fatalf("GetFollowing() = %#v, %v", following, err)
	}
	if err := repo.DeleteFollower(ctx, 1, 2); err != nil {
		t.Fatalf("delete follower: %v", err)
	}
	if got, err := repo.GetFollowStatus(ctx, 1, 2); err != nil || got != "none" {
		t.Fatalf("GetFollowStatus() after delete = %q, %v; want none", got, err)
	}
}
