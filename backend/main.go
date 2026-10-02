package main

import (
	"fmt"
	"log"
	"net/http"

	"social-network-network/pkg/db/sqlite"
	"social-network-network/pkg/handlers"
	"social-network-network/pkg/middleware"
	"social-network-network/pkg/repository"
	"social-network-network/pkg/services"
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
	// mux.HandleFunc("/api/chatuserlist/", handlers.HandlerUserList)

	// followers inicialization
	followrepo := repository.NewFollowerRepo(db)
	Newfollowerserveses := services.NewFollowerService(followrepo)
	Newfollowhandlers := handlers.NewFollowerHandler(Newfollowerserveses)

	// followers routes
	mux.HandleFunc("/api/follow-action", func(w http.ResponseWriter, r *http.Request) {
		Newfollowhandlers.HandleFollowAction(w, r)
	})
	mux.HandleFunc("/api/followers", func(w http.ResponseWriter, r *http.Request) {
		Newfollowhandlers.HandleGetFollowers(w, r)
	})

	mux.HandleFunc("/api/following", func(w http.ResponseWriter, r *http.Request) {
		Newfollowhandlers.HandleGetFollowing(w, r)
	})

	// chat routes

	chatrepo := repository.NewChatRepository(db)
	chatservices := services.NewChatServices(chatrepo)
	chatHandler := handlers.NewChatHandler(chatservices)

	fmt.Println("//beforte chat start")

	mux.Handle("/api/chatuserlist/", middleware.Auth(db, http.HandlerFunc(chatHandler.HandleChat)))

	fmt.Println("backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", middleware.Cors(mux)))
}
