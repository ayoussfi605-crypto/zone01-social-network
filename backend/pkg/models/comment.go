package models

type Comment struct {
	ID             int    `json:"id"`
	PostID         int    `json:"post_id"`
	AuthorID       int    `json:"author_id"`
	AuthorName     string `json:"author_name"`
	AuthorAvatar   string `json:"author_avatar"`
	AuthorNickname string `json:"author_nickname"`
	Content        string `json:"content"`
	ImagePath      string `json:"image_path"`
	CreatedAt      string `json:"created_at"`
}

type CreateCommentRequest struct {
	Content  string `json:"content"`
	ImageURL string `json:"image_url,omitempty"`
}
