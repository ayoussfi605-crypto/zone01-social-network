package models

type Group struct {
	ID          int    `json:"id"`
	CreatorID   int    `json:"creator_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

type GroupInvite struct {
	GroupID          int    `json:"group_id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	CreatorID        int    `json:"creator_id"`
	CreatorFirstName string `json:"creator_first_name"`
	CreatorLastName  string `json:"creator_last_name"`
	CreatedAt        string `json:"created_at"`
}

type GroupDiscovery struct {
	ID               int    `json:"id"`
	CreatorID        int    `json:"creator_id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	CreatedAt        string `json:"created_at"`
	MembershipStatus string `json:"membership_status"`
	IsCreator        bool   `json:"is_creator"`
	MemberCount      int    `json:"member_count"`
}

type GroupMember struct {
	ID         int    `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	AvatarPath string `json:"avatar_path"`
}

type GroupJoinRequest struct {
	UserID     int    `json:"user_id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	AvatarPath string `json:"avatar_path"`
}

type GroupPost struct {
	ID           int            `json:"id"`
	GroupID      int            `json:"group_id"`
	AuthorID     int            `json:"author_id"`
	AuthorName   string         `json:"author_name"`
	AuthorAvatar string         `json:"author_avatar"`
	Content      string         `json:"content"`
	CreatedAt    string         `json:"created_at"`
	Comments     []GroupComment `json:"comments"`
}

type GroupComment struct {
	ID           int    `json:"id"`
	PostID       int    `json:"post_id"`
	AuthorID     int    `json:"author_id"`
	AuthorName   string `json:"author_name"`
	AuthorAvatar string `json:"author_avatar"`
	Content      string `json:"content"`
	CreatedAt    string `json:"created_at"`
}

type GroupEvent struct {
	ID            int    `json:"id"`
	GroupID       int    `json:"group_id"`
	CreatorID     int    `json:"creator_id"`
	CreatorName   string `json:"creator_name"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	EventTime     string `json:"event_time"`
	CreatedAt     string `json:"created_at"`
	GoingCount    int    `json:"going_count"`
	NotGoingCount int    `json:"not_going_count"`
	MyResponse    string `json:"my_response"`
}

type CreateGroupRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	MemberIDs   []int  `json:"member_ids"`
}
