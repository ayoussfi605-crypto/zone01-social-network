frontend/
├── Dockerfile
├── package.tson
├── next.config.ts
├── public/
│   ├── images/
│   └── avatars/
└── src/
    ├── app/                           # Next.ts App Router (Pages & Routes)
    │   ├── layout.ts                  # Root layout (Auth & WS Context Providers)
    │   ├── page.ts                    # Root redirect or landing page
    │   ├── (auth)/                    # Route Group: Authentication
    │   │   ├── login/
    │   │   │   └── page.tsx            # Login Page
    │   │   └── register/
    │   │       └── page.tsx            # Registration Page
    │   ├── (dashboard)/               # Route Group: Authenticated Layout (Includes Header/Nav)
    │   │   ├── layout.tsx              # Navbar, Sidebar & Notification Bell Wrapper
    │   │   ├── feed/
    │   │   │   └── page.tsx            # Main Newsfeed Page
    │   │   ├── profile/
    │   │   │   └── [id]/
    │   │   │       └── page.tsx        # Dynamic User Profile Page
    │   │   ├── groups/
    │   │   │   ├── page.tsx            # Group Directory Page
    │   │   │   └── [id]/
    │   │   │       └── page.tsx        # Group Details, Events & Feed Page
    │   │   └── chat/
    │   │       └── page.tsx            # Main Direct Messaging Interface
    │   └── api/                       # Next.ts proxy/helper endpoints (optional)
    │
    ├── components/                    # UI Component Layer
    │   ├── layout/                    # Layout UI
    │   │   ├── Navbar.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── ProtectedRoute.tsx     # Client auth-check wrapper
    │   ├── auth/                      # Auth UI
    │   │   ├── LoginForm.tsx
    │   │   └── RegisterForm.tsx
    │   ├── profile/                   # Profile UI
    │   │   ├── ProfileHeader.tsx
    │   │   ├── PrivacyToggle.tsx      # Public / Private profile switch
    │   │   └── FollowersModal.tsx     # Followers & Following list
    │   ├── posts/                     # Posts & Comments UI
    │   │   ├── CreatePostModal.tsx    # Privacy selector + media dropzone
    │   │   ├── PostCard.tsx
    │   │   └── CommentSection.tsx
    │   ├── groups/                    # Groups & Events UI
    │   │   ├── GroupCard.tsx
    │   │   ├── CreateGroupModal.tsx
    │   │   ├── CreateEventModal.tsx
    │   │   └── EventRSVPCard.tsx
    │   ├── chat/                      # Real-time Messaging UI
    │   │   ├── ChatWindow.tsx
    │   │   ├── MessageBubble.tsx
    │   │   └── EmojiPicker.tsx
    │   └── notifications/             # Notification UI
    │       ├── NotificationBell.tsx
    │       └── NotificationDropdown.tsx
    │
    ├── services/                      # Service Layer (Backend API Communication)
    │   ├── api.ts                     # Base fetch client with `credentials: 'include'`
    │   ├── authService.ts             # Login, register, logout, getMe
    │   ├── profileService.ts          # Fetch profile, update privacy, follow actions
    │   ├── postService.ts             # Create post, comment, fetch feed
    │   ├── groupService.ts            # Groups CRUD, invite, join request, events
    │   └── websocketService.ts        # Native WS connection, reconnects, event bus
    │
    ├── context/                       # Global React State Layer
    │   ├── AuthContext.tsx            # User state & authentication session checks
    │   ├── WebSocketContext.tsx       # Global WS connection hub state
    │   └── NotificationContext.tsx   # Live unread notifications state
    │
    ├── hooks/                         # Custom React Hooks
    │   ├── useAuth.ts
    │   ├── useWebSocket.ts
    │   └── useNotifications.ts
    │
    ├── types/                         # Shared Models / Data Contracts
    │   ├── user.ts
    │   ├── post.ts
    │   └── chat.ts
    │
    └── utils/                         # Helper Utilities
        ├── validators.ts              # Form validation helpers
        └── formatDate.ts              # Timestamp formatters