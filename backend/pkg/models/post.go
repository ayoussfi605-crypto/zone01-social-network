package models

type Post struct {
	Title   string `json:"title"`
	Content string `json:"post_content"`
	Privacy string `json:"privacy"`
}

type Postdata struct {
	Id         int    `json:"id"`
	User_Id    int    `json:"user_id"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	Image_path string `json:"image_path"`
	Privacy    string `json:"privacy"`
	Created_At string `json:"created_at"`
}
