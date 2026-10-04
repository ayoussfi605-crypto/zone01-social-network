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
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	handlers.DB = db // give DB to handlers (simple global)

	ws.GlobalHub = ws.InitHUb()

	go ws.ManageHub(ws.GlobalHub)

	mux := http.NewServeMux()

	// Public routes
	mux.Handle("/media/", http.StripPrefix("/media/", http.FileServer(http.Dir("./media"))))
	mux.HandleFunc("/api/auth/register", handlers.Register)
	mux.HandleFunc("/api/auth/login", handlers.Login)
	mux.HandleFunc("/api/auth/logout", handlers.Logout)

	// Protected routes (need login cookie)
	mux.Handle("/api/auth/me", middleware.Auth(db, http.HandlerFunc(handlers.Me)))
	mux.Handle("/api/users/privacy", middleware.Auth(db, http.HandlerFunc(handlers.UpdatePrivacy)))

	// followers inicialization
	followrepo := repository.NewFollowerRepo(db)
	followerService := services.NewFollowerService(followrepo)
	followerHandler := handlers.NewFollowerHandler(followerService)
	profileService := services.NewProfileService(repository.NewProfileUserRepository(db), followrepo)
	profileHandler := handlers.NewProfileHandler(profileService)

	// Protected follower and profile endpoints.
	mux.Handle("POST /api/users/{id}/follow", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleFollow)))
	mux.Handle("POST /api/users/{id}/unfollow", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleUnfollow)))
	mux.Handle("POST /api/users/follow-response", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleFollowResponse)))
	mux.Handle("GET /api/users/follow-requests", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleGetPendingRequests)))
	mux.Handle("GET /api/users/{id}/followers", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleGetFollowers)))
	mux.Handle("GET /api/users/{id}/following", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleGetFollowing)))
	mux.Handle("GET /api/users/{id}/profile", middleware.Auth(db, http.HandlerFunc(profileHandler.HandleGetProfile)))

	// chat routes

	chatrepo := repository.NewChatRepository(db)
	chatservices := services.NewChatServices(chatrepo)
	chatHandler := handlers.NewChatHandler(chatservices)
	wsHandler := handlers.NewWSHandler(chatservices)

	mux.Handle("/api/ws", middleware.Auth(db, http.HandlerFunc(wsHandler.WebsocketHandler)))
	mux.Handle("/api/chatuserlist/", middleware.Auth(db, http.HandlerFunc(chatHandler.HandleChat)))
	fmt.Println("//beforte chat start")

	fmt.Println("backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", middleware.Cors(mux)))
}
