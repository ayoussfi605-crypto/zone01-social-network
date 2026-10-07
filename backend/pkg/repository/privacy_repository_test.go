package repository

import (
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestUpdatePrivacyAcceptsPendingRequestsWhenProfileBecomesPublic(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	_, err = db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			is_private INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE followers (
			follower_id INTEGER NOT NULL,
			followed_id INTEGER NOT NULL,
			status TEXT NOT NULL CHECK(status IN ('pending', 'accepted')),
			PRIMARY KEY (follower_id, followed_id)
		);
		INSERT INTO users (id, is_private) VALUES (1, 1), (2, 0);
		INSERT INTO followers (follower_id, followed_id, status) VALUES
			(10, 1, 'pending'),
			(11, 1, 'accepted'),
			(12, 2, 'pending');
	`)
	if err != nil {
		t.Fatal(err)
	}

	if err := UpdatePrivacy(db, 1, false); err != nil {
		t.Fatalf("UpdatePrivacy() error = %v", err)
	}

	var profilePrivate int
	if err := db.QueryRow("SELECT is_private FROM users WHERE id = 1").Scan(&profilePrivate); err != nil {
		t.Fatal(err)
	}
	if profilePrivate != 0 {
		t.Fatalf("is_private = %d, want 0", profilePrivate)
	}

	var acceptedPending int
	if err := db.QueryRow(`SELECT COUNT(*) FROM followers WHERE followed_id = 1 AND status = 'accepted'`).Scan(&acceptedPending); err != nil {
		t.Fatal(err)
	}
	if acceptedPending != 2 {
		t.Fatalf("accepted followers after public switch = %d, want 2", acceptedPending)
	}

	var pendingForOtherProfile int
	if err := db.QueryRow(`SELECT COUNT(*) FROM followers WHERE followed_id = 2 AND status = 'pending'`).Scan(&pendingForOtherProfile); err != nil {
		t.Fatal(err)
	}
	if pendingForOtherProfile != 1 {
		t.Fatalf("pending count for unrelated profile = %d, want 1", pendingForOtherProfile)
	}

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM followers WHERE followed_id = 1 AND status = 'pending'").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("pending requests after public switch = %d, want 0", count)
	}
}
