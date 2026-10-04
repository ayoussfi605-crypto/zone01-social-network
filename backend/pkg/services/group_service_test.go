package services

import (
	"context"
	"errors"
	"os"
	"testing"

	"social-network-network/pkg/db/sqlite"
	"social-network-network/pkg/repository"
)

func TestGroupServiceEnforcesMembershipAndCreatorPermissions(t *testing.T) {
	databaseFile, err := os.CreateTemp("", "group-service-*.db")
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
		email     string
		firstName string
	}{
		{email: "creator@example.com", firstName: "Ari"},
		{email: "member@example.com", firstName: "Blair"},
		{email: "outsider@example.com", firstName: "Casey"},
		{email: "requester@example.com", firstName: "Devon"},
		{email: "second-requester@example.com", firstName: "Emery"},
	} {
		_, err := db.Exec(
			`INSERT INTO users (email, password_hash, first_name, last_name, dob) VALUES (?, ?, ?, ?, ?)`,
			user.email,
			"hash",
			user.firstName,
			"User",
			"2000-01-01",
		)
		if err != nil {
			t.Fatalf("create user %d: %v", index+1, err)
		}
	}

	groupRepo := repository.NewGroupRepository(db)
	groupService := NewGroupService(groupRepo)
	ctx := context.Background()
	group, err := groupService.CreateGroup(ctx, 1, "Private space", "Members only", []int{2})
	if err != nil {
		t.Fatalf("create group: %v", err)
	}
	if err := groupRepo.RespondToInvite(ctx, 2, group.ID, true); err != nil {
		t.Fatalf("accept member invite: %v", err)
	}

	post, err := groupService.CreateGroupPost(ctx, 2, group.ID, "Member post")
	if err != nil {
		t.Fatalf("member creates post: %v", err)
	}
	if _, err := groupService.GetGroupPosts(ctx, 3, group.ID); !errors.Is(err, ErrNotGroupMember) {
		t.Fatalf("nonmember should not read group posts, got %v", err)
	}
	if _, err := groupService.CreateGroupPost(ctx, 3, group.ID, "Outsider post"); !errors.Is(err, ErrNotGroupMember) {
		t.Fatalf("nonmember should not create group posts, got %v", err)
	}
	if _, err := groupService.CreateGroupComment(ctx, 3, group.ID, post.ID, "Outsider comment"); !errors.Is(err, ErrNotGroupMember) {
		t.Fatalf("nonmember should not comment, got %v", err)
	}

	event, err := groupService.CreateGroupEvent(ctx, 1, group.ID, "Planning", "Member event", "2030-06-01T09:00:00Z")
	if err != nil {
		t.Fatalf("creator creates event: %v", err)
	}
	if err := groupService.RespondToEvent(ctx, 3, group.ID, event.ID, "going"); !errors.Is(err, ErrNotGroupMember) {
		t.Fatalf("nonmember should not answer group event, got %v", err)
	}
	if _, err := groupService.CreateGroupEvent(ctx, 3, group.ID, "Outsider", "Valid description", "2030-06-01T09:00:00Z"); !errors.Is(err, ErrNotGroupMember) {
		t.Fatalf("nonmember should not create group events, got %v", err)
	}

	if err := groupService.RequestToJoin(ctx, 4, group.ID); err != nil {
		t.Fatalf("request to join: %v", err)
	}
	if err := groupService.RequestToJoin(ctx, 5, group.ID); err != nil {
		t.Fatalf("second request to join: %v", err)
	}
	if _, err := groupService.GetJoinRequests(ctx, 2, group.ID); !errors.Is(err, ErrNotGroupCreator) {
		t.Fatalf("member should not manage join requests, got %v", err)
	}
	if err := groupService.RespondToJoinRequest(ctx, 2, group.ID, 4, true); !errors.Is(err, ErrNotGroupCreator) {
		t.Fatalf("member should not accept join requests, got %v", err)
	}
	if err := groupService.RespondToJoinRequest(ctx, 1, group.ID, 4, true); err != nil {
		t.Fatalf("creator accepts join request: %v", err)
	}
	if err := groupService.RespondToJoinRequest(ctx, 1, group.ID, 5, false); err != nil {
		t.Fatalf("creator declines join request: %v", err)
	}

	if err := groupService.InviteMembers(ctx, 2, group.ID, []int{3}); err != nil {
		t.Fatalf("member invites another user: %v", err)
	}
	if err := groupService.InviteMembers(ctx, 3, group.ID, []int{4}); !errors.Is(err, ErrNotGroupMember) {
		t.Fatalf("nonmember should not invite users, got %v", err)
	}
}
