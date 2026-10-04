package repository

import (
	"context"
	"os"
	"testing"

	"social-network-network/pkg/db/sqlite"
)

func TestCreateGroupRepository(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "group-repo-*.db")
	if err != nil {
		t.Fatalf("create temp db: %v", err)
	}
	_ = tmpFile.Close()
	defer os.Remove(tmpFile.Name())

	db, err := sqlite.Init(tmpFile.Name())
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	defer db.Close()

	if _, err := db.Exec(`INSERT INTO users (email, password_hash, first_name, last_name, dob) VALUES (?, ?, ?, ?, ?)`, "creator@example.com", "hash", "Alice", "Smith", "2000-01-01"); err != nil {
		t.Fatalf("create creator: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO users (email, password_hash, first_name, last_name, dob) VALUES (?, ?, ?, ?, ?)`, "member@example.com", "hash", "Bob", "Jones", "2000-01-02"); err != nil {
		t.Fatalf("create member: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO users (email, password_hash, first_name, last_name, dob) VALUES (?, ?, ?, ?, ?)`, "invitee@example.com", "hash", "Casey", "Taylor", "2000-01-03"); err != nil {
		t.Fatalf("create invitee: %v", err)
	}

	repo := NewGroupRepository(db)
	group, err := repo.CreateGroup(context.Background(), 1, "Design Circle", "UI Reviews")
	if err != nil {
		t.Fatalf("create group: %v", err)
	}
	if group == nil || group.ID == 0 {
		t.Fatal("group should be created with id")
	}

	if err := repo.AddMembers(context.Background(), group.ID, []int{2, 3}); err != nil {
		t.Fatalf("add group members: %v", err)
	}

	invites, err := repo.GetPendingInvites(context.Background(), 2)
	if err != nil {
		t.Fatalf("get pending invites: %v", err)
	}
	if len(invites) != 1 || invites[0].Title != "Design Circle" || invites[0].CreatorFirstName != "Alice" {
		t.Fatalf("unexpected pending invites: %+v", invites)
	}
	if err := repo.RespondToInvite(context.Background(), 2, group.ID, true); err != nil {
		t.Fatalf("accept group invite: %v", err)
	}
	if err := repo.RespondToInvite(context.Background(), 3, group.ID, false); err != nil {
		t.Fatalf("decline group invite: %v", err)
	}

	groups, err := repo.GetGroupsForUser(context.Background(), 1)
	if err != nil {
		t.Fatalf("get groups for user: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	if groups[0].Title != "Design Circle" {
		t.Fatalf("expected group title to match, got %q", groups[0].Title)
	}

	var memberCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, group.ID, 2).Scan(&memberCount); err != nil {
		t.Fatalf("query member row: %v", err)
	}
	if memberCount != 1 {
		t.Fatalf("expected accepted member row, got %d", memberCount)
	}
	var acceptedStatus string
	if err := db.QueryRow(`SELECT status FROM group_members WHERE group_id = ? AND user_id = ?`, group.ID, 2).Scan(&acceptedStatus); err != nil {
		t.Fatalf("query accepted member status: %v", err)
	}
	if acceptedStatus != "member" {
		t.Fatalf("expected accepted status 'member', got %q", acceptedStatus)
	}
	var remainingInvites int
	if err := db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, group.ID, 3).Scan(&remainingInvites); err != nil {
		t.Fatalf("query declined member row: %v", err)
	}
	if remainingInvites != 0 {
		t.Fatalf("expected declined invite to be removed, got %d rows", remainingInvites)
	}
}
