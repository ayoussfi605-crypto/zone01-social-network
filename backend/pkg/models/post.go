package models

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

type CreatePostRequest struct {
	Content        string `json:"content"`
	Privacy        string `json:"privacy"`
	AllowedUserIDs []int  `json:"allowed_user_ids"`
	ImageURL       string `json:"image_url,omitempty"`
}
