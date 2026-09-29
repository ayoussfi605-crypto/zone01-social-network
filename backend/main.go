package main

import (
	"fmt"
	"log"
	"net/http"

	"social-network-network/pkg/db/sqlite"
	"social-network-network/pkg/handlers"
	"social-network-network/pkg/middleware"
	ws "social-network-network/pkg/websocket"
)

func main() {
	db, err := sqlite.Init("./social-network.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	handlers.DB = db // give DB to handlers (simple global)

	ws.GlobalHub = ws.InitHUb()

	go ws.ManageHub(ws.GlobalHub)

	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("/api/auth/register", handlers.Register)
	mux.HandleFunc("/api/auth/login", handlers.Login)
	mux.HandleFunc("/api/auth/logout", handlers.Logout)
	mux.HandleFunc("/api/ws", handlers.WebsocketHandler)

	// Protected routes (need login cookie)
	mux.Handle("/api/auth/me", middleware.Auth(db, http.HandlerFunc(handlers.Me)))
	mux.Handle("/api/users/privacy", middleware.Auth(db, http.HandlerFunc(handlers.UpdatePrivacy)))

	fmt.Println("backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", middleware.Cors(mux)))
}
