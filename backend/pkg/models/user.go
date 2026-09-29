package models

// User matches 000001_create_users_table.
// Optional fields (Avatar, Nickname, AboutMe) are simple strings.
// Empty string = not provided. This keeps SQL simple for learning.
type User struct {
	Id           int    `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"` // never send this to frontend
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Dob          string `json:"dob"` // store as "2000-01-15" string, simple
	AvatarPath   string `json:"avatar_path"`
	Nickname     string `json:"nickname"`
	AboutMe      string `json:"about_me"`
	IsPrivate    bool   `json:"is_private"`
	CreatedAt    string `json:"created_at"`
}
