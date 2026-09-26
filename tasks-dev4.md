# Developer 4 Tasks: Groups, Events, Real-time Chat & Notifications

## 🛠️ Module 0: Database Migrations
- [ ] **Task 0.1: Database Migrations**
  - [ ] Write `000007_create_groups_table.up.sql` / `.down.sql` (id, creator_id, title, description, created_at).
  - [ ] Write `000008_create_group_members_table.up.sql` / `.down.sql` (group_id, user_id, status: 'pending_invite'|'pending_request'|'member').
  - [ ] Write `000009_create_group_events_table.up.sql` / `.down.sql` (id, group_id, creator_id, title, description, event_time, created_at).
  - [ ] Write `000010_create_event_responses_table.up.sql` / `.down.sql` (event_id, user_id, response: 'going'|'not_going').
  - [ ] Write `000011_create_messages_table.up.sql` / `.down.sql` (id, sender_id, recipient_id, group_id, content, created_at).
  - [ ] Write `000012_create_notifications_table.up.sql` / `.down.sql` (id, user_id, type, payload, is_read, created_at).

---

## ⚡ Module 1: WebSocket Infrastructure & Messaging
- [ ] **Task 1.1: WS Hub Architecture (`pkg/websocket/hub.go`, `client.go`)**
  - [ ] Build Connection Hub mapping `userID` $\rightarrow$ WebSocket client connections.
  - [ ] Handle connection upgrades (`/ws`) and authenticate incoming sockets via session cookies.
  - [ ] Broadcast messages to specific users or channel groups.

- [ ] **Task 1.2: Chat Repository & Service Layer (`service/chat.go`)**
  - [ ] `SavePrivateMessage(senderID, targetID, content)`:
    - Validate follow relationship: user can chat if `sender` follows `target` OR `target` follows `sender`.
    - Save message to DB.
    - Push WebSocket frame to `targetID` client if connected.
  - [ ] `SaveGroupMessage(senderID, groupID, content)`:
    - Validate sender is member of group.
    - Save message to DB.
    - Broadcast via WS to all connected group members.
  - [ ] `GetChatHistory(userID, targetID / groupID)`: Paginated message history retrieval.

- [ ] **Task 1.3: Chat Handlers (`handler/chat.go`)**
  - [ ] `GET /ws`: WebSocket endpoint.
  - [ ] `GET /api/chat/history`: Fetch chat logs.

---

## 👥 Module 2: Groups & Events System
- [ ] **Task 2.1: Group & Event Service Layer (`service/group.go`)**
  - [ ] `CreateGroup`: Create group and set creator as member.
  - [ ] `InviteToGroup` / `RequestToJoinGroup`:
    - Process membership invitations and pending requests.
    - Emit real-time notification to target user or group owner.
  - [ ] `CreateGroupEvent`:
    - Add event row.
    - Trigger group event notification for all group members.
  - [ ] `RespondToEvent(eventID, userID, response)`: Set `'going'` or `'not_going'`.

- [ ] **Task 2.2: Group Handlers (`handler/group.go`)**
  - [ ] CRUD endpoints for groups, invites, join requests, events, and event response selections.

---

## 🔔 Module 3: Notifications System
- [ ] **Task 3.1: Notification System (`service/notification.go`)**
  - [ ] Dispatch engine helper: `NotifyUser(userID, notificationType, payload)`.
  - [ ] Integrate events for follow requests, group invites, join requests, and new group events.

- [ ] **Task 3.2: Frontend Chat & Notification UI**
  - [ ] `services/websocket.js`: Client-side WS manager for auto-reconnects and message listeners.
  - [ ] `components/chat/ChatBox`: Floating/dedicated chat window with emoji picker.
  - [ ] `components/notifications/NotificationBell`: Header item displaying unread count and drop-down notification list.
  - [ ] `components/groups/GroupPage`: Group feed, event listing, RSVP interaction, and group chat drawer.