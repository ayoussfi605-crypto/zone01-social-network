package models

import "mime/multipart"

type Post struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	ImagePath string `json:"image_path"`
	Privacy   string `json:"privacy"`
	CreatedAt string `json:"created_at"`
}

type Postdata = Post

type CreatePostDTO struct {
	Title            string
	Content          string
	Privacy          string
	Image            *multipart.FileHeader
	PermittedUserIDs []int
}
