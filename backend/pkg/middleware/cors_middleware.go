package middleware

import (
	"net/http"
	"os"
)

// Cors allows the frontend to call backend with cookies.
// Allowed origin defaults to http://localhost:3000, override with FRONTEND_URL env var (used by Docker later).
func Cors(next http.Handler) http.Handler {
	allowed := os.Getenv("FRONTEND_URL")
	if allowed == "" {
		allowed = "http://localhost:3000"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		// Reflect the origin only if it matches the allowed one.
		if origin == allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")

		// Browser preflight check -> answer OK and stop.
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
