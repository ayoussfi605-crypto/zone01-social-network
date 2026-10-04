package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"social-network-network/pkg/models"
)

type GroupRepository interface {
	CreateGroup(ctx context.Context, creatorID int, title, description string) (*models.Group, error)
	AddMembers(ctx context.Context, groupID int, userIDs []int) error
	GetGroupsForUser(ctx context.Context, userID int) ([]models.Group, error)
	GetPendingInvites(ctx context.Context, userID int) ([]models.GroupInvite, error)
	RespondToInvite(ctx context.Context, userID, groupID int, accept bool) error
}

type groupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) GroupRepository {
	return &groupRepository{db: db}
}

func (r *groupRepository) CreateGroup(ctx context.Context, creatorID int, title, description string) (*models.Group, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, errors.New("group title is required")
	}

	result, err := r.db.ExecContext(ctx, `
		INSERT INTO groups (creator_id, title, description)
		VALUES (?, ?, ?)
	`, creatorID, title, strings.TrimSpace(description))
	if err != nil {
		return nil, fmt.Errorf("create group: %w", err)
	}

	groupID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read new group id: %w", err)
	}

	return &models.Group{
		ID:          int(groupID),
		CreatorID:   creatorID,
		Title:       title,
		Description: strings.TrimSpace(description),
	}, nil
}

func (r *groupRepository) AddMembers(ctx context.Context, groupID int, userIDs []int) error {
	if groupID <= 0 || len(userIDs) == 0 {
		return nil
	}

	seen := make(map[int]struct{}, len(userIDs))
	uniqueIDs := make([]int, 0, len(userIDs))
	for _, userID := range userIDs {
		if userID <= 0 {
			continue
		}
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		uniqueIDs = append(uniqueIDs, userID)
	}
	if len(uniqueIDs) == 0 {
		return nil
	}

	query := `INSERT OR IGNORE INTO group_members (group_id, user_id, status) VALUES (?, ?, 'pending_invite')`
	for _, userID := range uniqueIDs {
		if _, err := r.db.ExecContext(ctx, query, groupID, userID); err != nil {
			return fmt.Errorf("add member %d to group %d: %w", userID, groupID, err)
		}
	}

	return nil
}

func (r *groupRepository) GetGroupsForUser(ctx context.Context, userID int) ([]models.Group, error) {
	query := `
		SELECT g.id, g.creator_id, g.title, g.description, g.created_at
		FROM groups g
		JOIN group_members gm ON gm.group_id = g.id
		WHERE gm.user_id = ? AND gm.status = 'member'
		UNION
		SELECT g.id, g.creator_id, g.title, g.description, g.created_at
		FROM groups g
		WHERE g.creator_id = ?
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("load groups for user %d: %w", userID, err)
	}
	defer rows.Close()

	groups := make([]models.Group, 0)
	for rows.Next() {
		var group models.Group
		if err := rows.Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan group: %w", err)
		}
		groups = append(groups, group)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("group rows: %w", err)
	}

	return groups, nil
}

func (r *groupRepository) GetPendingInvites(ctx context.Context, userID int) ([]models.GroupInvite, error) {
	query := `
		SELECT g.id, g.title, COALESCE(g.description, ''), g.creator_id,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), g.created_at
		FROM group_members gm
		JOIN groups g ON g.id = gm.group_id
		JOIN users u ON u.id = g.creator_id
		WHERE gm.user_id = ? AND gm.status = 'pending_invite'
		ORDER BY g.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("load group invites for user %d: %w", userID, err)
	}
	defer rows.Close()

	invites := make([]models.GroupInvite, 0)
	for rows.Next() {
		var invite models.GroupInvite
		if err := rows.Scan(
			&invite.GroupID,
			&invite.Title,
			&invite.Description,
			&invite.CreatorID,
			&invite.CreatorFirstName,
			&invite.CreatorLastName,
			&invite.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan group invite: %w", err)
		}
		invites = append(invites, invite)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("group invite rows: %w", err)
	}
	return invites, nil
}

func (r *groupRepository) RespondToInvite(ctx context.Context, userID, groupID int, accept bool) error {
	query := `DELETE FROM group_members WHERE user_id = ? AND group_id = ? AND status = 'pending_invite'`
	if accept {
		query = `UPDATE group_members SET status = 'member' WHERE user_id = ? AND group_id = ? AND status = 'pending_invite'`
	}
	result, err := r.db.ExecContext(ctx, query, userID, groupID)
	if err != nil {
		return fmt.Errorf("respond to group invite: %w", err)
	}
	return requireOneRow(result)
}
