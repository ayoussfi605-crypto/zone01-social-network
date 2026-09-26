# Developer 2 Tasks: Followers, Follow Requests & Profile Management

## 🛠️ Module 0: Migrations & Media Storage
- [ ] **Task 0.1: Database Migrations**
  - [ ] Write migration `000003_create_followers_table.up.sql` / `.down.sql` (follower_id, followed_id, status: 'pending'|'accepted', created_at).
- [ ] **Task 0.2: File Storage Utility (`pkg/utils/image.go`)**
  - [ ] Validate image types (JPEG, PNG, GIF).
  - [ ] Implement local disk upload/storage helper with unique file naming.

---

## 👥 Module 1: Follow System Logic
- [ ] **Task 1.1: Follow Repository Layer (`repository/follower.go`)**
  - [ ] `CreateFollowRequest(followerID, targetID, status)`: Insert relationship.
  - [ ] `UpdateFollowStatus(followerID, targetID, newStatus)`: Accept/Reject request.
  - [ ] `DeleteFollower(followerID, targetID)`: Unfollow user.
  - [ ] `GetFollowers(userID)`: Fetch list of accepted followers.
  - [ ] `GetFollowing(userID)`: Fetch list of accepted following users.
  - [ ] `GetFollowStatus(followerID, targetID)`: Returns `none`, `pending`, or `accepted`.

- [ ] **Task 1.2: Follow Service Layer (`service/follower.go`)**
  - [ ] `FollowUser(followerID, targetID)`:
    - Check target user's privacy status via User service.
    - If user profile is public $\rightarrow$ set status to `'accepted'`.
    - If user profile is private $\rightarrow$ set status to `'pending'` and trigger notification payload.
  - [ ] `UnfollowUser(followerID, targetID)`: Remove follow relationship.
  - [ ] `RespondToFollowRequest(targetID, followerID, accept)`:
    - If accepted $\rightarrow$ update status to `'accepted'`.
    - If declined $\rightarrow$ delete follow row.

- [ ] **Task 1.3: Follow Handlers (`handler/follower.go`)**
  - [ ] `POST /api/users/{id}/follow`: Send follow request or follow directly.
  - [ ] `POST /api/users/{id}/unfollow`: Unfollow user.
  - [ ] `POST /api/users/follow-response`: Accept/decline pending requests.
  - [ ] `GET /api/users/{id}/followers`: Retrieve list of user's followers.
  - [ ] `GET /api/users/{id}/following`: Retrieve list of users being followed.

---

## 👤 Module 2: User Profile Logic
- [ ] **Task 2.1: Profile Service Layer (`service/profile.go`)**
  - [ ] `GetUserProfile(viewerID, targetID)`:
    - Retrieve profile data.
    - Check if `viewerID == targetID`.
    - Check target's privacy settings: If private AND `viewerID` is NOT an accepted follower, omit posts/activity data and return restricted profile metadata.

- [ ] **Task 2.2: Profile Handlers (`handler/profile.go`)**
  - [ ] `GET /api/users/{id}/profile`: Fetch profile page data.

- [ ] **Task 2.3: Frontend Profile & Follow Components**
  - [ ] `services/profileService.js`: API methods for profile and follow workflows.
  - [ ] `components/profile/ProfileHeader`: Display user info, avatar, privacy badge.
  - [ ] `components/profile/FollowButton`: Dynamic state (Follow, Pending, Unfollow).
  - [ ] `components/profile/FollowersModal`: List popup displaying followers/following list.
  - [ ] `components/profile/PrivateProfileView`: Lock screen placeholder for private non-followed users.