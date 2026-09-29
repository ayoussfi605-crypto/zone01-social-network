package middleware

import (
	"context"
	"database/sql"
	"net/http"

	"social-network-network/pkg/models"
	"social-network-network/pkg/services"
)

// Key for storing user in request context. Simple string for learning.
type ctxKey string

const UserKey ctxKey = "user"

// Auth checks cookie "session_token" and loads user.
// If OK -> puts user in context and calls next handler.
// If not -> returns 401.
func Auth(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			http.Error(w, "not logged in", http.StatusUnauthorized)
			return
		}
		user, err := services.ValidateSession(db, cookie.Value)
		if err != nil {
			http.Error(w, "not logged in", http.StatusUnauthorized)
			return
		}
		// Save user for handler to use.
		ctx := context.WithValue(r.Context(), UserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUser reads user back from context (set by Auth above).
func GetUser(r *http.Request) *models.User {
	u, _ := r.Context().Value(UserKey).(*models.User)
	return u
}
