package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"testing"

	"social-network-network/pkg/repository"

	_ "github.com/mattn/go-sqlite3"
)

func TestGetUserProfileHidesRestrictedProfileDetailsAndStats(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	_, err = db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			email TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			dob TEXT,
			avatar_path TEXT,
			nickname TEXT,
			about_me TEXT,
			is_private INTEGER NOT NULL DEFAULT 0,
			created_at TEXT
		);
		CREATE TABLE posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			author_id INTEGER NOT NULL,
			content TEXT NOT NULL DEFAULT ''
		);
		CREATE TABLE followers (
			follower_id INTEGER NOT NULL,
			followed_id INTEGER NOT NULL,
			status TEXT NOT NULL,
			PRIMARY KEY (follower_id, followed_id)
		);
		INSERT INTO users (
			id, email, password_hash, first_name, last_name, dob,
			avatar_path, nickname, about_me, is_private, created_at
		) VALUES (
			2, 'target@example.com', 'hash', 'Target', 'User',
			'1990-01-01', '', 'target', 'Building thoughtful products.', 1, '2026-01-01'
		);
	`)
	if err != nil {
		t.Fatal(err)
	}

	profileService := NewProfileService(
		repository.NewProfileUserRepository(db),
		repository.NewFollowerRepo(db),
	)

	profile, err := profileService.GetUserProfile(context.Background(), 1, 2)
	if err != nil {
		t.Fatalf("GetUserProfile() error = %v", err)
	}
	if !profile.Restricted {
		t.Fatal("profile should be restricted for a non-follower")
	}
	if profile.User.AboutMe != "" {
		t.Fatalf("AboutMe = %q, want bio to be hidden", profile.User.AboutMe)
	}
	if profile.User.Email != "" || profile.User.Dob != "" || profile.User.Nickname != "" || profile.User.CreatedAt != "" {
		t.Fatalf("restricted profile exposed private details: %+v", profile.User)
	}
	if profile.Stats != nil {
		t.Fatalf("Stats = %+v, want stats omitted for a restricted profile", profile.Stats)
	}
	response, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("marshal restricted profile: %v", err)
	}
	for _, privateValue := range []string{"target@example.com", "1990-01-01", "target", "Building thoughtful products.", `"stats"`} {
		if strings.Contains(string(response), privateValue) {
			t.Errorf("restricted profile response contains private value %q: %s", privateValue, response)
		}
	}

	if _, err := db.Exec(`INSERT INTO followers (follower_id, followed_id, status) VALUES (3, 2, 'accepted')`); err != nil {
		t.Fatal(err)
	}
	acceptedProfile, err := profileService.GetUserProfile(context.Background(), 3, 2)
	if err != nil {
		t.Fatalf("GetUserProfile() for accepted follower error = %v", err)
	}
	if acceptedProfile.Restricted {
		t.Fatal("profile should be visible to an accepted follower")
	}
	if acceptedProfile.User.AboutMe != "Building thoughtful products." {
		t.Fatalf("accepted follower AboutMe = %q, want selected user's bio", acceptedProfile.User.AboutMe)
	}
	if acceptedProfile.Stats == nil {
		t.Fatal("accepted follower should receive profile stats")
	}
}

func TestUpdateProfilePersistsBio(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	_, err = db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			email TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			dob TEXT,
			avatar_path TEXT,
			nickname TEXT,
			about_me TEXT,
			is_private INTEGER NOT NULL DEFAULT 0,
			created_at TEXT
		);
		CREATE TABLE followers (
			follower_id INTEGER NOT NULL,
			followed_id INTEGER NOT NULL,
			status TEXT NOT NULL,
			PRIMARY KEY (follower_id, followed_id)
		);
		INSERT INTO users (
			id, email, password_hash, first_name, last_name, dob,
			avatar_path, nickname, about_me, is_private, created_at
		) VALUES (
			1, 'target@example.com', 'hash', 'Target', 'User',
			'1990-01-01', '', 'target', '', 0, '2026-01-01'
		);
	`)
	if err != nil {
		t.Fatal(err)
	}

	if err := repository.UpdateProfile(db, 1, "Saved bio", false); err != nil {
		t.Fatalf("UpdateProfile() error = %v", err)
	}

	user, err := repository.NewProfileUserRepository(db).GetProfileUser(context.Background(), 1)
	if err != nil {
		t.Fatalf("GetProfileUser() error = %v", err)
	}
	if user.AboutMe != "Saved bio" {
		t.Fatalf("AboutMe = %q, want persisted bio", user.AboutMe)
	}
	if user.IsPrivate {
		t.Fatal("profile should remain public after updating the bio")
	}
}
