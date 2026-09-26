# Developer 1 Tasks: Setup, Authentication & Profile

## 🛠️ Module 0: Architecture & Docker Setup
- [ ] **Task 0.1: Docker & Environment Setup**
  - [ ] Create `Dockerfile.backend` for Go app.
  - [ ] Create `Dockerfile.frontend` for JS framework.
  - [ ] Write `docker-compose.yml` linking frontend (port 3000) and backend (port 8080) with networks and persistent SQLite volume.
- [ ] **Task 0.2: SQLite Migration Pipeline**
  - [ ] Set up `backend/pkg/db/sqlite/sqlite.go` for database connection & PRAGMA foreign keys enablement.
  - [ ] Set up `backend/pkg/db/migrations/sqlite` directory.
  - [ ] Write migration `000001_create_users_table.up.sql` / `.down.sql` (id, email, password_hash, first_name, last_name, dob, avatar_path, nickname, about_me, is_private, created_at).
  - [ ] Write migration `000002_create_sessions_table.up.sql` / `.down.sql` (id, user_id, session_token, expires_at, created_at).

---

## 🔐 Module 1: Authentication System (Sessions & Cookies)
- [ ] **Task 1.1: Database Repository Layer (`repository/user.go`, `repository/session.go`)**
  - [ ] `CreateUser(user)`: Insert new user record into DB.
  - [ ] `GetUserByEmail(email)`: Fetch user record by email.
  - [ ] `GetUserByID(id)`: Fetch user record by ID.
  - [ ] `CreateSession(session)`: Store session token, user_id, and expiration time.
  - [ ] `GetSessionByToken(token)`: Query active session and check `expires_at`.
  - [ ] `DeleteSession(token)`: Remove session on logout.

- [ ] **Task 1.2: Service / Business Logic Layer (`service/auth.go`)**
  - [ ] `RegisterUser(dto)`:
    - Validate inputs (email format, password strength, required DOB/Name fields).
    - Check if email is already registered (`GetUserByEmail`).
    - Hash password using `bcrypt`.
    - Handle optional avatar file upload saving to disk/media folder.
    - Call `CreateUser`.
  - [ ] `LoginUser(dto)`:
    - Get user by email.
    - Compare hash with provided password.
    - Generate secure UUID session token.
    - Store session in DB with expiry (e.g., 24h).
    - Return session cookie configuration.
  - [ ] `ValidateSession(token)`: Check token validity and check expiry.
  - [ ] `LogoutUser(token)`: Invalidate and delete session token.

- [ ] **Task 1.3: HTTP Handlers & Middleware (`handler/auth.go`, `middleware/auth.go`)**
  - [ ] Create `AuthMiddleware`: Extract cookie `session_id`, check session validity, inject `userID` into context.
  - [ ] `POST /api/auth/register`: Read multipart-form/json, call `RegisterUser`, return user data.
  - [ ] `POST /api/auth/login`: Parse body, call `LoginUser`, set HTTP-only cookie `Set-Cookie: session_token=...; HttpOnly; SameSite=Lax`.
  - [ ] `POST /api/auth/logout`: Read cookie, call `LogoutUser`, clear cookie.
  - [ ] `GET /api/auth/me`: Get current authenticated user details.

- [ ] **Task 1.4: Frontend Implementation (Auth & Layout)**
  - [ ] `services/api.js`: Configure base HTTP fetcher with `credentials: 'include'`.
  - [ ] `store/authStore.js`: State management for authenticated user.
  - [ ] `components/auth/RegisterForm`: Form UI, validation, payload submission.
  - [ ] `components/auth/LoginForm`: Form UI, submit login credentials, redirect to feed.
  - [ ] `components/ProfilePrivacyToggle`: Toggle button to switch profile privacy between public and private (`PUT /api/users/privacy`).