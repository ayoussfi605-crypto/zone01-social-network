frontend/
├── Dockerfile
├── package.json
├── next.config.js
├── public/
│   ├── images/
│   └── avatars/
└── src/
    ├── app/                           # Next.js App Router (Pages & Routes)
    │   ├── layout.js                  # Root layout (Auth & WS Context Providers)
    │   ├── page.js                    # Root redirect or landing page
    │   ├── (auth)/                    # Route Group: Authentication
    │   │   ├── login/
    │   │   │   └── page.js            # Login Page
    │   │   └── register/
    │   │       └── page.js            # Registration Page
    │   ├── (dashboard)/               # Route Group: Authenticated Layout (Includes Header/Nav)
    │   │   ├── layout.js              # Navbar, Sidebar & Notification Bell Wrapper
    │   │   ├── feed/
    │   │   │   └── page.js            # Main Newsfeed Page
    │   │   ├── profile/
    │   │   │   └── [id]/
    │   │   │       └── page.js        # Dynamic User Profile Page
    │   │   ├── groups/
    │   │   │   ├── page.js            # Group Directory Page
    │   │   │   └── [id]/
    │   │   │       └── page.js        # Group Details, Events & Feed Page
    │   │   └── chat/
    │   │       └── page.js            # Main Direct Messaging Interface
    │   └── api/                       # Next.js proxy/helper endpoints (optional)
    │
    ├── components/                    # UI Component Layer
    │   ├── layout/                    # Layout UI
    │   │   ├── Navbar.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── ProtectedRoute.jsx     # Client auth-check wrapper
    │   ├── auth/                      # Auth UI
    │   │   ├── LoginForm.jsx
    │   │   └── RegisterForm.jsx
    │   ├── profile/                   # Profile UI
    │   │   ├── ProfileHeader.jsx
    │   │   ├── PrivacyToggle.jsx      # Public / Private profile switch
    │   │   └── FollowersModal.jsx     # Followers & Following list
    │   ├── posts/                     # Posts & Comments UI
    │   │   ├── CreatePostModal.jsx    # Privacy selector + media dropzone
    │   │   ├── PostCard.jsx
    │   │   └── CommentSection.jsx
    │   ├── groups/                    # Groups & Events UI
    │   │   ├── GroupCard.jsx
    │   │   ├── CreateGroupModal.jsx
    │   │   ├── CreateEventModal.jsx
    │   │   └── EventRSVPCard.jsx
    │   ├── chat/                      # Real-time Messaging UI
    │   │   ├── ChatWindow.jsx
    │   │   ├── MessageBubble.jsx
    │   │   └── EmojiPicker.jsx
    │   └── notifications/             # Notification UI
    │       ├── NotificationBell.jsx
    │       └── NotificationDropdown.jsx
    │
    ├── services/                      # Service Layer (Backend API Communication)
    │   ├── api.js                     # Base fetch client with `credentials: 'include'`
    │   ├── authService.js             # Login, register, logout, getMe
    │   ├── profileService.js          # Fetch profile, update privacy, follow actions
    │   ├── postService.js             # Create post, comment, fetch feed
    │   ├── groupService.js            # Groups CRUD, invite, join request, events
    │   └── websocketService.js        # Native WS connection, reconnects, event bus
    │
    ├── context/                       # Global React State Layer
    │   ├── AuthContext.jsx            # User state & authentication session checks
    │   ├── WebSocketContext.jsx       # Global WS connection hub state
    │   └── NotificationContext.jsx   # Live unread notifications state
    │
    ├── hooks/                         # Custom React Hooks
    │   ├── useAuth.js
    │   ├── useWebSocket.js
    │   └── useNotifications.js
    │
    ├── types/                         # Shared Models / Data Contracts
    │   ├── user.js
    │   ├── post.js
    │   └── chat.js
    │
    └── utils/                         # Helper Utilities
        ├── validators.js              # Form validation helpers
        └── formatDate.js              # Timestamp formatters