package models

// Session matches 000002_create_sessions_table.
type Session struct {
	Id        int
	UserId    int
	Token     string
	ExpiresAt string
	CreatedAt string
}
