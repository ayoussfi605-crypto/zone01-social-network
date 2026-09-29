package main

import (
	"fmt"
	"log"
	"net/http"

	"social-network/pkg/db/sqlite"
	"social-network/pkg/handlers"
	"social-network/pkg/middleware"
)

func main() {
	db, err := sqlite.Init("./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	handlers.DB = db // give DB to handlers (simple global)

	mux := http.NewServeMux()

	// Public routes (Go 1.21: plain paths, method checked inside handler)
	mux.HandleFunc("/api/auth/register", handlers.Register)
	mux.HandleFunc("/api/auth/login", handlers.Login)
	mux.HandleFunc("/api/auth/logout", handlers.Logout)

	// Protected routes (need login cookie)
	mux.Handle("/api/auth/me", middleware.Auth(db, http.HandlerFunc(handlers.Me)))
	mux.Handle("/api/users/privacy", middleware.Auth(db, http.HandlerFunc(handlers.UpdatePrivacy)))

	fmt.Println("backend running on :8088")
	log.Fatal(http.ListenAndServe(":8088", middleware.Cors(mux)))
}
