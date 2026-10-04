package services

import (
	"os"
	"testing"

	"social-network-network/pkg/db/sqlite"
	"social-network-network/pkg/repository"
)

func TestChatServiceEnforcesPrivateAndGroupAccess(t *testing.T) {
	databaseFile, err := os.CreateTemp("", "chat-service-*.db")
	if err != nil {
		t.Fatalf("create temp db: %v", err)
	}
	_ = databaseFile.Close()
	defer os.Remove(databaseFile.Name())

	db, err := sqlite.Init(databaseFile.Name())
	if err != nil {
		t.Fatalf("initialize db: %v", err)
	}
	defer db.Close()

	for index, user := range []struct {
		email   string
		private int
	}{
		{email: "sender@example.com", private: 1},
		{email: "follower@example.com", private: 1},
		{email: "public@example.com", private: 0},
		{email: "outsider@example.com", private: 1},
	} {
		_, err := db.Exec(`
			INSERT INTO users (email, password_hash, first_name, last_name, dob, is_private)
			VALUES (?, 'hash', ?, 'User', '2000-01-01', ?)
		`, user.email, []string{"Sender", "Follower", "Public", "Outsider"}[index], user.private)
		if err != nil {
			t.Fatalf("create user %d: %v", index+1, err)
		}
	}
	if _, err := db.Exec(`INSERT INTO followers (follower_id, followed_id, status) VALUES (2, 1, 'accepted')`); err != nil {
		t.Fatalf("create accepted relationship: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO groups (creator_id, title, description) VALUES (1, 'Studio', 'Group chat')`); err != nil {
		t.Fatalf("create group: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO group_members (group_id, user_id, status) VALUES (1, 2, 'member')`); err != nil {
		t.Fatalf("add member: %v", err)
	}

	chatService := NewChatServices(repository.NewChatRepository(db))
	if err := chatService.SaveMessage(1, 2, "Can you see this?"); err != nil {
		t.Fatalf("allow follower-to-followed message: %v", err)
	}
	if err := chatService.SaveMessage(1, 3, "Public profile message"); err != nil {
		t.Fatalf("allow message to public profile: %v", err)
	}
	if err := chatService.SaveMessage(1, 4, "Blocked message"); err == nil {
		t.Fatal("expected message to unconnected private profile to be rejected")
	}

	if err := chatService.SaveGroupMessage(2, 1, "Members only"); err != nil {
		t.Fatalf("allow group member message: %v", err)
	}
	if err := chatService.SaveGroupMessage(4, 1, "Outsider message"); err == nil {
		t.Fatal("expected nonmember group message to be rejected")
	}
	messages, err := chatService.GetGroupMessages(2, 1)
	if err != nil || len(messages) != 1 || messages[0].Message != "Members only" {
		t.Fatalf("GetGroupMessages() = %+v, %v", messages, err)
	}
	if _, err := chatService.GetGroupMessages(4, 1); err == nil {
		t.Fatal("expected nonmember group history request to be rejected")
	}
	memberIDs, err := chatService.GetGroupMemberIDs(1)
	if err != nil || len(memberIDs) != 2 || memberIDs[0] != 1 || memberIDs[1] != 2 {
		t.Fatalf("GetGroupMemberIDs() = %v, %v", memberIDs, err)
	}
}
