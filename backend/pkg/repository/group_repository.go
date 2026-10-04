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
	BrowseGroups(ctx context.Context, userID int) ([]models.GroupDiscovery, error)
	GetGroupMembers(ctx context.Context, groupID int) ([]models.GroupMember, error)
	GetInviteCandidates(ctx context.Context, groupID, viewerID int) ([]models.FollowerData, error)
	IsGroupMember(ctx context.Context, groupID, userID int) (bool, error)
	GetGroupCreatorID(ctx context.Context, groupID int) (int, error)
	InviteMembers(ctx context.Context, groupID int, userIDs []int) error
	RequestToJoin(ctx context.Context, groupID, userID int) error
	GetJoinRequests(ctx context.Context, groupID int) ([]models.GroupJoinRequest, error)
	RespondToJoinRequest(ctx context.Context, groupID, userID int, accept bool) error
	GetGroupPosts(ctx context.Context, groupID int) ([]models.GroupPost, error)
	CreateGroupPost(ctx context.Context, groupID, authorID int, content string) (*models.GroupPost, error)
	GetGroupPostGroupID(ctx context.Context, postID int) (int, error)
	CreateGroupComment(ctx context.Context, postID, authorID int, content string) (*models.GroupComment, error)
	GetGroupEvents(ctx context.Context, groupID, viewerID int) ([]models.GroupEvent, error)
	CreateGroupEvent(ctx context.Context, groupID, creatorID int, title, description, eventTime string) (*models.GroupEvent, error)
	GetGroupEventGroupID(ctx context.Context, eventID int) (int, error)
	RespondToEvent(ctx context.Context, eventID, userID int, response string) error
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

func (r *groupRepository) BrowseGroups(ctx context.Context, userID int) ([]models.GroupDiscovery, error) {
	query := `
		SELECT g.id, g.creator_id, g.title, COALESCE(g.description, ''), g.created_at,
	       CASE WHEN g.creator_id = ? THEN 'member' ELSE COALESCE(mine.status, 'none') END,
	       CASE WHEN g.creator_id = ? THEN 1 ELSE 0 END,
		       1 + COUNT(DISTINCT members.user_id)
		FROM groups g
		LEFT JOIN group_members mine ON mine.group_id = g.id AND mine.user_id = ?
		LEFT JOIN group_members members ON members.group_id = g.id AND members.status = 'member'
		GROUP BY g.id
		ORDER BY g.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("browse groups: %w", err)
	}
	defer rows.Close()

	groups := make([]models.GroupDiscovery, 0)
	for rows.Next() {
		var group models.GroupDiscovery
		if err := rows.Scan(
			&group.ID,
			&group.CreatorID,
			&group.Title,
			&group.Description,
			&group.CreatedAt,
			&group.MembershipStatus,
			&group.IsCreator,
			&group.MemberCount,
		); err != nil {
			return nil, fmt.Errorf("scan discoverable group: %w", err)
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (r *groupRepository) GetGroupMembers(ctx context.Context, groupID int) ([]models.GroupMember, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM groups g JOIN users u ON u.id = g.creator_id
		WHERE g.id = ?
		UNION
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM group_members gm JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = ? AND gm.status = 'member'
		ORDER BY first_name, last_name
	`
	rows, err := r.db.QueryContext(ctx, query, groupID, groupID)
	if err != nil {
		return nil, fmt.Errorf("load group members: %w", err)
	}
	defer rows.Close()

	members := make([]models.GroupMember, 0)
	for rows.Next() {
		var member models.GroupMember
		if err := rows.Scan(&member.ID, &member.FirstName, &member.LastName, &member.AvatarPath); err != nil {
			return nil, fmt.Errorf("scan group member: %w", err)
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

func (r *groupRepository) GetInviteCandidates(ctx context.Context, groupID, viewerID int) ([]models.FollowerData, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM users u
		WHERE u.id != ?
		  AND u.id != (SELECT creator_id FROM groups WHERE id = ?)
		  AND NOT EXISTS (
		      SELECT 1 FROM group_members gm
		      WHERE gm.group_id = ? AND gm.user_id = u.id
	        AND gm.status IN ('member', 'pending_invite')
	      )
		ORDER BY u.first_name, u.last_name
	`
	rows, err := r.db.QueryContext(ctx, query, viewerID, groupID, groupID)
	if err != nil {
		return nil, fmt.Errorf("load group invite candidates: %w", err)
	}
	defer rows.Close()

	candidates := make([]models.FollowerData, 0)
	for rows.Next() {
		var candidate models.FollowerData
		if err := rows.Scan(&candidate.ID, &candidate.FirstName, &candidate.LastName, &candidate.AvatarPath); err != nil {
			return nil, fmt.Errorf("scan invite candidate: %w", err)
		}
		candidates = append(candidates, candidate)
	}
	return candidates, rows.Err()
}

func (r *groupRepository) IsGroupMember(ctx context.Context, groupID, userID int) (bool, error) {
	var isMember bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM groups WHERE id = ? AND creator_id = ?
			UNION ALL
			SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'member'
		)
	`, groupID, userID, groupID, userID).Scan(&isMember)
	return isMember, err
}

func (r *groupRepository) GetGroupCreatorID(ctx context.Context, groupID int) (int, error) {
	var creatorID int
	err := r.db.QueryRowContext(ctx, `SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&creatorID)
	return creatorID, err
}

func (r *groupRepository) InviteMembers(ctx context.Context, groupID int, userIDs []int) error {
	query := `
		INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'pending_invite')
		ON CONFLICT(group_id, user_id) DO UPDATE SET status = 'pending_invite'
		WHERE group_members.status = 'pending_request'
	`
	for _, userID := range userIDs {
		if _, err := r.db.ExecContext(ctx, query, groupID, userID); err != nil {
			return fmt.Errorf("invite user %d to group %d: %w", userID, groupID, err)
		}
	}
	return nil
}

func (r *groupRepository) RequestToJoin(ctx context.Context, groupID, userID int) error {
	result, err := r.db.ExecContext(ctx, `
		INSERT OR IGNORE INTO group_members (group_id, user_id, status)
		VALUES (?, ?, 'pending_request')
	`, groupID, userID)
	if err != nil {
		return fmt.Errorf("request to join group: %w", err)
	}
	return requireOneRow(result)
}

func (r *groupRepository) GetJoinRequests(ctx context.Context, groupID int) ([]models.GroupJoinRequest, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar_path, '')
		FROM group_members gm JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = ? AND gm.status = 'pending_request'
		ORDER BY u.first_name, u.last_name
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("load group join requests: %w", err)
	}
	defer rows.Close()

	requests := make([]models.GroupJoinRequest, 0)
	for rows.Next() {
		var request models.GroupJoinRequest
		if err := rows.Scan(&request.UserID, &request.FirstName, &request.LastName, &request.AvatarPath); err != nil {
			return nil, fmt.Errorf("scan group join request: %w", err)
		}
		requests = append(requests, request)
	}
	return requests, rows.Err()
}

func (r *groupRepository) RespondToJoinRequest(ctx context.Context, groupID, userID int, accept bool) error {
	query := `DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending_request'`
	if accept {
		query = `UPDATE group_members SET status = 'member' WHERE group_id = ? AND user_id = ? AND status = 'pending_request'`
	}
	result, err := r.db.ExecContext(ctx, query, groupID, userID)
	if err != nil {
		return fmt.Errorf("respond to group join request: %w", err)
	}
	return requireOneRow(result)
}

func (r *groupRepository) GetGroupPosts(ctx context.Context, groupID int) ([]models.GroupPost, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.group_id, p.author_id,
		       TRIM(u.first_name || ' ' || u.last_name), COALESCE(u.avatar_path, ''),
		       p.content, p.created_at
		FROM group_posts p JOIN users u ON u.id = p.author_id
		WHERE p.group_id = ?
		ORDER BY p.created_at DESC, p.id DESC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("load group posts: %w", err)
	}

	posts := make([]models.GroupPost, 0)
	for rows.Next() {
		var post models.GroupPost
		if err := rows.Scan(
			&post.ID,
			&post.GroupID,
			&post.AuthorID,
			&post.AuthorName,
			&post.AuthorAvatar,
			&post.Content,
			&post.CreatedAt,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan group post: %w", err)
		}
		post.Comments = make([]models.GroupComment, 0)
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, fmt.Errorf("group post rows: %w", err)
	}
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("close group post rows: %w", err)
	}

	for i := range posts {
		comments, err := r.getGroupComments(ctx, posts[i].ID)
		if err != nil {
			return nil, err
		}
		posts[i].Comments = comments
	}
	return posts, nil
}

func (r *groupRepository) CreateGroupPost(ctx context.Context, groupID, authorID int, content string) (*models.GroupPost, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO group_posts (group_id, author_id, content) VALUES (?, ?, ?)
	`, groupID, authorID, content)
	if err != nil {
		return nil, fmt.Errorf("create group post: %w", err)
	}
	postID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read group post id: %w", err)
	}
	return r.getGroupPost(ctx, int(postID))
}

func (r *groupRepository) GetGroupPostGroupID(ctx context.Context, postID int) (int, error) {
	var groupID int
	err := r.db.QueryRowContext(ctx, `SELECT group_id FROM group_posts WHERE id = ?`, postID).Scan(&groupID)
	return groupID, err
}

func (r *groupRepository) CreateGroupComment(ctx context.Context, postID, authorID int, content string) (*models.GroupComment, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO group_comments (post_id, author_id, content) VALUES (?, ?, ?)
	`, postID, authorID, content)
	if err != nil {
		return nil, fmt.Errorf("create group comment: %w", err)
	}
	commentID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read group comment id: %w", err)
	}
	var comment models.GroupComment
	err = r.db.QueryRowContext(ctx, `
		SELECT c.id, c.post_id, c.author_id,
		       TRIM(u.first_name || ' ' || u.last_name), COALESCE(u.avatar_path, ''),
		       c.content, c.created_at
		FROM group_comments c JOIN users u ON u.id = c.author_id
		WHERE c.id = ?
	`, commentID).Scan(
		&comment.ID,
		&comment.PostID,
		&comment.AuthorID,
		&comment.AuthorName,
		&comment.AuthorAvatar,
		&comment.Content,
		&comment.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("load created group comment: %w", err)
	}
	return &comment, nil
}

func (r *groupRepository) getGroupPost(ctx context.Context, postID int) (*models.GroupPost, error) {
	var post models.GroupPost
	err := r.db.QueryRowContext(ctx, `
		SELECT p.id, p.group_id, p.author_id,
		       TRIM(u.first_name || ' ' || u.last_name), COALESCE(u.avatar_path, ''),
		       p.content, p.created_at
		FROM group_posts p JOIN users u ON u.id = p.author_id
		WHERE p.id = ?
	`, postID).Scan(
		&post.ID,
		&post.GroupID,
		&post.AuthorID,
		&post.AuthorName,
		&post.AuthorAvatar,
		&post.Content,
		&post.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("load created group post: %w", err)
	}
	post.Comments = make([]models.GroupComment, 0)
	return &post, nil
}

func (r *groupRepository) getGroupComments(ctx context.Context, postID int) ([]models.GroupComment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.post_id, c.author_id,
		       TRIM(u.first_name || ' ' || u.last_name), COALESCE(u.avatar_path, ''),
		       c.content, c.created_at
		FROM group_comments c JOIN users u ON u.id = c.author_id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC, c.id ASC
	`, postID)
	if err != nil {
		return nil, fmt.Errorf("load post comments: %w", err)
	}
	defer rows.Close()

	comments := make([]models.GroupComment, 0)
	for rows.Next() {
		var comment models.GroupComment
		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.AuthorID,
			&comment.AuthorName,
			&comment.AuthorAvatar,
			&comment.Content,
			&comment.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan group comment: %w", err)
		}
		comments = append(comments, comment)
	}
	return comments, rows.Err()
}

func (r *groupRepository) GetGroupEvents(ctx context.Context, groupID, viewerID int) ([]models.GroupEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.group_id, e.creator_id,
		       TRIM(u.first_name || ' ' || u.last_name), e.title,
		       COALESCE(e.description, ''), e.event_time, e.created_at,
	       SUM(CASE WHEN responses.response = 'going' THEN 1 ELSE 0 END),
	       SUM(CASE WHEN responses.response = 'not_going' THEN 1 ELSE 0 END),
	       COALESCE(mine.response, '')
		FROM group_events e
		JOIN users u ON u.id = e.creator_id
		LEFT JOIN event_responses responses ON responses.event_id = e.id
		LEFT JOIN event_responses mine ON mine.event_id = e.id AND mine.user_id = ?
		WHERE e.group_id = ?
		GROUP BY e.id
		ORDER BY e.event_time ASC, e.id ASC
	`, viewerID, groupID)
	if err != nil {
		return nil, fmt.Errorf("load group events: %w", err)
	}
	defer rows.Close()

	events := make([]models.GroupEvent, 0)
	for rows.Next() {
		var event models.GroupEvent
		if err := rows.Scan(
			&event.ID,
			&event.GroupID,
			&event.CreatorID,
			&event.CreatorName,
			&event.Title,
			&event.Description,
			&event.EventTime,
			&event.CreatedAt,
			&event.GoingCount,
			&event.NotGoingCount,
			&event.MyResponse,
		); err != nil {
			return nil, fmt.Errorf("scan group event: %w", err)
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (r *groupRepository) CreateGroupEvent(ctx context.Context, groupID, creatorID int, title, description, eventTime string) (*models.GroupEvent, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO group_events (group_id, creator_id, title, description, event_time)
		VALUES (?, ?, ?, ?, ?)
	`, groupID, creatorID, title, description, eventTime)
	if err != nil {
		return nil, fmt.Errorf("create group event: %w", err)
	}
	eventID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("read group event id: %w", err)
	}
	events, err := r.GetGroupEvents(ctx, groupID, creatorID)
	if err != nil {
		return nil, err
	}
	for i := range events {
		if events[i].ID == int(eventID) {
			return &events[i], nil
		}
	}
	return nil, sql.ErrNoRows
}

func (r *groupRepository) GetGroupEventGroupID(ctx context.Context, eventID int) (int, error) {
	var groupID int
	err := r.db.QueryRowContext(ctx, `SELECT group_id FROM group_events WHERE id = ?`, eventID).Scan(&groupID)
	return groupID, err
}

func (r *groupRepository) RespondToEvent(ctx context.Context, eventID, userID int, response string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO event_responses (event_id, user_id, response) VALUES (?, ?, ?)
		ON CONFLICT(event_id, user_id) DO UPDATE SET response = excluded.response
	`, eventID, userID, response)
	if err != nil {
		return fmt.Errorf("respond to group event: %w", err)
	}
	return nil
}
