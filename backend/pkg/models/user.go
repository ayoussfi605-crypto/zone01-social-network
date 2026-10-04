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

// FollowerData is Dev 2's DTO for follower/following lists.
// Kept from the merged branch so dev2's repository code keeps compiling.
type FollowerData struct {
	ID         int    `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	AvatarPath string `json:"avatar_path"`
	Nickname   string `json:"nickname"`
	Online     bool   `json:"online"`
}

type UserProfile struct {
	User         *User  `json:"user"`
	Restricted   bool   `json:"restricted"`
	FollowStatus string `json:"follow_status"`
}
