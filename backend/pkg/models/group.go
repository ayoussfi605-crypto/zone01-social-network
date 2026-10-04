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

type CreateGroupRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	MemberIDs   []int  `json:"member_ids"`
}
