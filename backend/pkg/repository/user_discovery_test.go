package repository

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestDiscoverUsersSearchesAndPaginatesExcludingViewer(t *testing.T) {
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
			nickname TEXT
		);
		CREATE TABLE followers (
			follower_id INTEGER NOT NULL,
			followed_id INTEGER NOT NULL,
			status TEXT NOT NULL,
			PRIMARY KEY (follower_id, followed_id)
		);
		INSERT INTO users (id, first_name, last_name, nickname) VALUES
			(1, 'Current', 'Viewer', 'viewer'),
			(2, 'Alex', 'One', 'alexone'),
			(3, 'Blair', 'Two', 'blairtwo'),
			(4, 'Alex', 'Three', 'alexthree'),
			(5, 'Casey', 'Four', 'caseyfour');
		INSERT INTO followers (follower_id, followed_id, status) VALUES
			(1, 3, 'accepted'),
			(1, 4, 'pending');
	`)
	if err != nil {
		t.Fatal(err)
	}

	repo := NewProfileUserRepository(db)
	ctx := context.Background()
	firstPage, err := repo.DiscoverUsers(ctx, 1, "", 2, 0)
	if err != nil {
		t.Fatalf("first discovery page: %v", err)
	}
	if len(firstPage) != 2 || firstPage[0].ID != 2 || firstPage[1].ID != 3 {
		t.Fatalf("first discovery page = %#v, want users 2 and 3", firstPage)
	}
	if firstPage[1].FollowStatus != "accepted" {
		t.Fatalf("follow status = %q, want accepted", firstPage[1].FollowStatus)
	}

	secondPage, err := repo.DiscoverUsers(ctx, 1, "alex", 2, 1)
	if err != nil {
		t.Fatalf("searched discovery page: %v", err)
	}
	if len(secondPage) != 1 || secondPage[0].ID != 4 || secondPage[0].FollowStatus != "pending" {
		t.Fatalf("searched discovery page = %#v, want pending Alex user 4", secondPage)
	}
}
