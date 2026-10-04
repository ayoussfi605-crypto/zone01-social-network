package middleware

import (
	"context"
	"database/sql"
	"fmt"
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
	fmt.Println("Helooo 1")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("2", w, r)
		cookie, err := r.Cookie("session_token")
		if err != nil {
			fmt.Println("Heloo err1", err)
			http.Error(w, "not logged in", http.StatusUnauthorized)
			return
		}
		user, err := services.ValidateSession(db, cookie.Value)
		if err != nil {
			fmt.Println("Heloo err2", err)

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
