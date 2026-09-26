# Developer 3 Tasks: Posts, Comments & Feed Engine

## 🛠️ Module 0: Database Migrations
- [ ] **Task 0.1: Database Migrations**
  - [ ] Write migration `000004_create_posts_table.up.sql` / `.down.sql` (id, user_id, title, content, image_path, privacy_type: 'public'|'almost_private'|'private', created_at).
  - [ ] Write migration `000005_create_post_permissions_table.up.sql` / `.down.sql` (post_id, user_id) for explicit private access.
  - [ ] Write migration `000006_create_comments_table.up.sql` / `.down.sql` (id, post_id, user_id, content, image_path, created_at).

---

## 📝 Module 1: Posts & Privacy Logic
- [ ] **Task 1.1: Post Repository Layer (`repository/post.go`)**
  - [ ] `CreatePost(post)`: Save post record.
  - [ ] `AddPostPermissions(postID, userIDs)`: Insert explicitly permitted users for targeted private posts.
  - [ ] `GetPostByID(postID)`: Fetch post metadata.
  - [ ] `GetFeedPosts(userID)`: Fetch all posts visible to `userID` based on privacy rules.
  - [ ] `GetUserPosts(userID)`: Fetch posts created by a specific user.

- [ ] **Task 1.2: Post Service Layer (`service/post.go`)**
  - [ ] `CreateNewPost(dto)`:
    - Validate content and media uploads (JPEG, PNG, GIF).
    - Handle privacy types:
      - `public`: Visible to all.
      - `almost_private`: Fetch follower list and permit followers.
      - `private`: Fetch explicitly selected follower IDs and save into permissions table.
  - [ ] `GetFeedForUser(userID)`:
    - Query posts where:
      - Post is `public`.
      - Post is `almost_private` AND creator is followed by `userID`.
      - Post is `private` AND `userID` exists in post permission table.
      - Post author is `userID`.

- [ ] **Task 1.3: Comment Repository & Service Layer (`service/comment.go`, `repository/comment.go`)**
  - [ ] `CreateComment(comment)`: Create a comment with optional image attachment.
  - [ ] `GetPostComments(postID)`: Retrieve comments associated with a post.

- [ ] **Task 1.4: Post & Comment Handlers (`handler/post.go`, `handler/comment.go`)**
  - [ ] `POST /api/posts`: Handle multipart/form-data for text, image, and privacy selection.
  - [ ] `GET /api/posts/feed`: Fetch main newsfeed.
  - [ ] `POST /api/posts/{id}/comments`: Add comment to post.
  - [ ] `GET /api/posts/{id}/comments`: Get comments list for a post.

---

## 🎨 Module 2: Frontend Feed Components
- [ ] **Task 2.1: Post UI Components**
  - [ ] `services/postService.js`: API client for posts and comments.
  - [ ] `components/posts/CreatePostForm`: Content input, image attachment picker, privacy dropdown (`Public`, `Followers`, `Custom Select Followers`).
  - [ ] `components/posts/PostCard`: Render author info, timestamp, text content, media display.
  - [ ] `components/posts/CommentSection`: Display comments list and add comment input form.
  - [ ] `pages/FeedPage`: Main newsfeed page displaying aggregated feeds.