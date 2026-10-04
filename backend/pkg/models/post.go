package models

// Post matches 000004_create_posts_table.
// Privacy is one of "public", "almost_private" (followers only) or "private"
// (only users listed in post_permissions can see it).
type Post struct {
	ID             int       `json:"id"`
	AuthorID       int       `json:"author_id"`
	AuthorName     string    `json:"author_name"`
	AuthorAvatar   string    `json:"author_avatar"`
	AuthorNickname string    `json:"author_nickname"`
	Content        string    `json:"content"`
	ImagePath      string    `json:"image_path"`
	Privacy        string    `json:"privacy"`
	CreatedAt      string    `json:"created_at"`
	Comments       []Comment `json:"comments"`
	CommentCount   int       `json:"comment_count"`
	AllowedUserIDs []int     `json:"allowed_user_ids,omitempty"`
}

// Comment matches 000006_create_comments_table.
type Comment struct {
	ID           int    `json:"id"`
	PostID       int    `json:"post_id"`
	AuthorID     int    `json:"author_id"`
	AuthorName   string `json:"author_name"`
	AuthorAvatar string `json:"author_avatar"`
	Content      string `json:"content"`
	ImagePath    string `json:"image_path"`
	CreatedAt    string `json:"created_at"`
}

// CreatePostRequest is the JSON body accepted by POST /api/posts.
type CreatePostRequest struct {
	Content        string `json:"content"`
	Privacy        string `json:"privacy"`
	AllowedUserIDs []int  `json:"allowed_user_ids"`
}
