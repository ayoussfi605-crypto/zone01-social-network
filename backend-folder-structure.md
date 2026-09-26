backend/
├── Dockerfile
├── go.mod
├── go.sum
├── main.go                       # Web server startup & route registrations
└── pkg/
    ├── db/
    │   ├── sqlite/
    │   │   └── sqlite.go         # SQLite DB setup & PRAGMA connection rules
    │   └── migrations/
    │       └── sqlite/           # Required migration folder structure
    │           ├── 000001_create_users_table.up.sql
    │           ├── 000001_create_users_table.down.sql
    │           ├── 000002_create_sessions_table.up.sql
    │           ├── 000002_create_sessions_table.down.sql
    │           ├── 000003_create_followers_table.up.sql
    │           ├── 000003_create_followers_table.down.sql
    │           ├── 000004_create_posts_table.up.sql
    │           ├── 000004_create_posts_table.down.sql
    │           ├── 000005_create_comments_table.up.sql
    │           ├── 000005_create_comments_table.down.sql
    │           ├── 000006_create_groups_table.up.sql
    │           ├── 000006_create_groups_table.down.sql
    │           ├── 000007_create_messages_table.up.sql
    │           ├── 000007_create_messages_table.down.sql
    │           └── 000008_create_notifications_table.up.sql
    │               └── 000008_create_notifications_table.down.sql
    ├── handlers/                 # Handler / Controller Layer (HTTP REST Endpoints)
    │   ├── auth_handler.go
    │   ├── user_handler.go
    │   ├── follower_handler.go
    │   ├── post_handler.go
    │   ├── group_handler.go
    │   ├── chat_handler.go
    │   └── notification_handler.go
    ├── services/                 # Service / Business Logic Layer
    │   ├── auth_service.go
    │   ├── user_service.go
    │   ├── follower_service.go
    │   ├── post_service.go
    │   ├── group_service.go
    │   ├── chat_service.go
    │   └── notification_service.go
    ├── repository/               # Repository / Data Access Layer (SQL Queries)
    │   ├── user_repository.go
    │   ├── session_repository.go
    │   ├── follower_repository.go
    │   ├── post_repository.go
    │   ├── group_repository.go
    │   └── message_repository.go
    ├── models/                   # Go Data Structures & DTOs
    │   ├── user.go
    │   ├── post.go
    │   ├── group.go
    │   ├── message.go
    │   └── notification.go
    ├── middleware/               # HTTP Middlewares
    │   ├── auth_middleware.go    # Validates sessions & cookies
    │   └── cors_middleware.go
    ├── websocket/                # Real-time WebSocket Hub
    │   ├── hub.go                # Central client registry & message router
    │   ├── client.go             # WS read/write pumps
    │   └── payload.go            # WS event types (Chat, Notification)
    └── utils/                    # Helper packages
        ├── password.go           # Bcrypt hashing
        └── storage.go            # Media upload handlers (JPEG, PNG, GIF)