package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"social-network-network/pkg/db/sqlite"
	"social-network-network/pkg/handlers"
	"social-network-network/pkg/middleware"
	"social-network-network/pkg/repository"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
	ws "social-network-network/pkg/websocket"
)

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./social-network.db"
	}
	db, err := sqlite.Init(dbPath)
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
	mux.Handle("/media/", http.StripPrefix("/media/", http.FileServer(http.Dir(utils.ResolveMediaDir()))))
	mux.HandleFunc("/api/auth/register", handlers.Register)
	mux.HandleFunc("/api/auth/login", handlers.Login)
	mux.HandleFunc("/api/auth/logout", handlers.Logout)

	// Protected rouollowing"tes (need login cookie)
	mux.Handle("/api/auth/me", middleware.Auth(db, http.HandlerFunc(handlers.Me)))
	mux.Handle("/api/users/privacy", middleware.Auth(db, http.HandlerFunc(handlers.UpdatePrivacy)))

	// notifications
	notificationRepo := repository.NewNotificationRepository(db)
	notificationService := services.NewNotificationService(notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	mux.Handle("GET /api/notifications", middleware.Auth(db, http.HandlerFunc(notificationHandler.HandleList)))
	mux.Handle("GET /api/notifications/unread-count", middleware.Auth(db, http.HandlerFunc(notificationHandler.HandleUnreadCount)))
	mux.Handle("POST /api/notifications/read-all", middleware.Auth(db, http.HandlerFunc(notificationHandler.HandleMarkAllRead)))
	mux.Handle("POST /api/notifications/{id}/read", middleware.Auth(db, http.HandlerFunc(notificationHandler.HandleMarkRead)))

	// followers inicialization
	followrepo := repository.NewFollowerRepo(db)
	followerService := services.NewFollowerService(followrepo)
	followerHandler := handlers.NewFollowerHandler(followerService, notificationService)
	profileService := services.NewProfileService(repository.NewProfileUserRepository(db), followrepo)
	profileHandler := handlers.NewProfileHandler(profileService)

	// Protected follower and profile endpoints.
	mux.Handle("POST /api/users/{id}/follow", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleFollow)))
	mux.Handle("POST /api/users/{id}/unfollow", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleUnfollow)))
	mux.Handle("POST /api/users/follow-response", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleFollowResponse)))
	mux.Handle("GET /api/users/follow-requests", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleGetPendingRequests)))
	mux.Handle("GET /api/users/{id}/followers", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleGetFollowers)))
	mux.Handle("GET /api/users/{id}/following", middleware.Auth(db, http.HandlerFunc(followerHandler.HandleGetFollowing)))
	mux.Handle("GET /api/users/discover", middleware.Auth(db, http.HandlerFunc(profileHandler.HandleDiscoverUsers)))
	mux.Handle("GET /api/users/{id}/profile", middleware.Auth(db, http.HandlerFunc(profileHandler.HandleGetProfile)))
	mux.Handle("PUT /api/users/profile", middleware.Auth(db, http.HandlerFunc(profileHandler.HandleUpdateProfile)))

	// group routes
	groupRepo := repository.NewGroupRepository(db)
	groupService := services.NewGroupService(groupRepo)
	groupHandler := handlers.NewGroupHandler(groupService, notificationService)
	mux.Handle("POST /api/groups", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleCreateGroup)))
	mux.Handle("GET /api/groups", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleGetGroups)))
	mux.Handle("GET /api/groups/invites", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleGetPendingInvites)))
	mux.Handle("POST /api/groups/{id}/invite-response", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleRespondToInvite)))
	mux.Handle("GET /api/groups/discover", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleBrowseGroups)))
	mux.Handle("GET /api/groups/{id}/members", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleGetMembers)))
	mux.Handle("GET /api/groups/{id}/invite-candidates", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleInviteCandidates)))
	mux.Handle("POST /api/groups/{id}/invites", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleInviteMembers)))
	mux.Handle("POST /api/groups/{id}/join-requests", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleRequestToJoin)))
	mux.Handle("GET /api/groups/{id}/join-requests", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleGetJoinRequests)))
	mux.Handle("POST /api/groups/{id}/join-requests/{userID}/response", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleRespondToJoinRequest)))
	mux.Handle("GET /api/groups/{id}/posts", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleGetPosts)))
	mux.Handle("POST /api/groups/{id}/posts", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleCreatePost)))
	mux.Handle("POST /api/groups/{id}/posts/{postID}/comments", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleCreateComment)))
	mux.Handle("GET /api/groups/{id}/events", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleGetEvents)))
	mux.Handle("POST /api/groups/{id}/events", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleCreateEvent)))
	mux.Handle("POST /api/groups/{id}/events/{eventID}/response", middleware.Auth(db, http.HandlerFunc(groupHandler.HandleRespondToEvent)))

	// post routes
	postRepo := repository.NewPostRepository(db)
	postService := services.NewPostService(postRepo)
	postHandler := handlers.NewPostHandler(postService)
	mux.Handle("GET /api/posts", middleware.Auth(db, http.HandlerFunc(postHandler.HandleGetFeed)))
	mux.Handle("POST /api/posts", middleware.Auth(db, http.HandlerFunc(postHandler.HandleCreatePost)))
	mux.Handle("GET /api/posts/{postID}", middleware.Auth(db, http.HandlerFunc(postHandler.HandleGetPost)))
	mux.Handle("DELETE /api/posts/{postID}", middleware.Auth(db, http.HandlerFunc(postHandler.HandleDeletePost)))
	mux.Handle("GET /api/users/{id}/posts", middleware.Auth(db, http.HandlerFunc(postHandler.HandleGetUserPosts)))

	// comment routes
	commentRepo := repository.NewCommentRepository(db)
	commentService := services.NewCommentService(commentRepo, postRepo)
	commentHandler := handlers.NewCommentHandler(commentService)
	mux.Handle("GET /api/posts/{postID}/comments", middleware.Auth(db, http.HandlerFunc(commentHandler.HandleGetComments)))
	mux.Handle("POST /api/posts/{postID}/comments", middleware.Auth(db, http.HandlerFunc(commentHandler.HandleCreateComment)))

	// chat routes
	chatrepo := repository.NewChatRepository(db)
	chatservices := services.NewChatServices(chatrepo)
	chatHandler := handlers.NewChatHandler(chatservices)
	wsHandler := handlers.NewWSHandler(chatservices)

	mux.Handle("/api/ws", middleware.Auth(db, http.HandlerFunc(wsHandler.WebsocketHandler)))
	mux.Handle("/api/chatuserlist/", middleware.Auth(db, http.HandlerFunc(chatHandler.HandleChat)))
	mux.Handle("/api/messages/{id}", middleware.Auth(db, http.HandlerFunc(chatHandler.HandleGetMessages)))
	mux.Handle("/api/groups/{id}/messages", middleware.Auth(db, http.HandlerFunc(chatHandler.HandleGetGroupMessages)))
	mux.Handle("/api/messages/read/{id}", middleware.Auth(db, http.HandlerFunc(chatHandler.HandleReadAllMessages)))

	fmt.Println("//beforte chat start")

	fmt.Println("backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", middleware.Cors(mux)))
}
