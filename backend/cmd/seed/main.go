package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"social-network-network/pkg/db/sqlite"
	"social-network-network/pkg/utils"

	"github.com/google/uuid"
)

type seedUser struct {
	Email     string
	Password  string
	FirstName string
	LastName  string
	Dob       string
	Nickname  string
	AboutMe   string
	IsPrivate bool
}

const (
	totalUsers    = 100
	defaultPass   = "Password123!"
	defaultStatus = "accepted"
	defaultAvatar = "/media/default.webp"
)

func main() {
	cwd, err := os.Getwd()
	if err != nil {
		panic(err)
	}

	dbPath := filepath.Join(cwd, "social-network.db")
	db, err := sqlite.Init(dbPath)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	if err := resetSeedData(db); err != nil {
		panic(err)
	}

	users := buildSeedUsers()
	if len(users) != totalUsers {
		panic(fmt.Sprintf("expected %d users, got %d", totalUsers, len(users)))
	}

	userIDs, err := seedUsers(db, users)
	if err != nil {
		panic(err)
	}

	if err := seedSessions(db, userIDs); err != nil {
		panic(err)
	}

	if err := seedFollowers(db, users, userIDs); err != nil {
		panic(err)
	}

	if err := seedGroupsAndMessages(db, users, userIDs); err != nil {
		panic(err)
	}

	if err := seedNotifications(db, userIDs); err != nil {
		panic(err)
	}

	if err := writeCredentialFile(cwd, users); err != nil {
		panic(err)
	}

	fmt.Println("Seed completed successfully.")
	fmt.Printf("Database created at: %s\n", dbPath)
	fmt.Printf("Inserted %d users with realistic follows, sessions, chats, groups, and notifications.\n", len(users))
	fmt.Println("Test accounts saved to: backend/test-users.txt")
	fmt.Println("Demo logins:")
	for _, user := range users[:6] {
		fmt.Printf("- %s / %s\n", user.Email, user.Password)
	}
}

func buildSeedUsers() []seedUser {
	firstNames := []string{"Alice", "Bob", "Charlie", "Dana", "Emma", "Finn", "Grace", "Henry", "Iris", "Jack", "Kate", "Leo", "Maya", "Noah", "Olivia", "Paul", "Quinn", "Ruby", "Sam", "Tara", "Uma", "Victor", "Wendy", "Xavier", "Yara", "Zane", "Aiden", "Bella", "Carter", "Diana", "Ethan", "Faith", "Gabriel", "Hannah", "Isaac", "Jasmine", "Kevin", "Lila", "Mason", "Nora", "Oscar", "Priya", "Quentin", "Rosa", "Sofia", "Theo", "Umaira", "Vera", "Wyatt", "Yvonne", "Zoe"}
	lastNames := []string{"Martin", "Lee", "Brown", "Nguyen", "Patel", "Garcia", "Young", "King", "Scott", "Hall", "Baker", "Adams", "Turner", "Ward", "Cruz", "Morris", "Rivera", "Cook", "Taylor", "Hill", "Campbell", "Mitchell", "Perez", "Roberts", "Evans", "Flores", "Howard", "Brooks", "Price", "Diaz", "Ross", "Barnes", "Sanders", "Murphy", "Powell", "Long", "Russell", "Butler", "Gray", "James", "Jenkins", "Foster", "Coleman", "Perry", "Bennett", "Hughes", "Hansen"}
	bios := []string{
		"Product designer focused on user experience and clarity.",
		"Frontend engineer building clean interfaces and fast experiences.",
		"Growth strategist who loves community, testing, and feedback.",
		"Backend developer passionate about APIs, security, and performance.",
		"Photographer and traveler who loves documenting everyday life.",
		"Startup founder with a focus on AI and sustainable growth.",
		"Community builder who enjoys events, networking, and creative work.",
		"Marketing specialist obsessed with storytelling and brand strategy.",
	}

	users := []seedUser{
		{Email: "alice@example.com", Password: defaultPass, FirstName: "Alice", LastName: "Martin", Dob: "1994-03-10", Nickname: "alice", AboutMe: "Product designer and coffee lover.", IsPrivate: false},
		{Email: "bob@example.com", Password: defaultPass, FirstName: "Bob", LastName: "Lee", Dob: "1992-08-22", Nickname: "bobby", AboutMe: "Frontend developer who loves clean UI.", IsPrivate: false},
		{Email: "charlie@example.com", Password: defaultPass, FirstName: "Charlie", LastName: "Brown", Dob: "1996-11-04", Nickname: "charlie", AboutMe: "Backend developer focused on APIs.", IsPrivate: false},
		{Email: "dana@example.com", Password: defaultPass, FirstName: "Dana", LastName: "Nguyen", Dob: "1991-05-17", Nickname: "dana", AboutMe: "Community manager and event organizer.", IsPrivate: true},
	}

	for i := 1; i <= totalUsers-4; i++ {
		firstName := firstNames[(i*3+1)%len(firstNames)]
		lastName := lastNames[(i*7+2)%len(lastNames)]
		email := fmt.Sprintf("user%03d@example.com", i)
		users = append(users, seedUser{
			Email:     email,
			Password:  defaultPass,
			FirstName: firstName,
			LastName:  lastName,
			Dob:       fmt.Sprintf("199%d-%02d-%02d", (i%10)+1, (i%12)+1, (i%28)+1),
			Nickname:  strings.ToLower(firstName) + fmt.Sprintf("%d", i),
			AboutMe:   bios[i%len(bios)],
			IsPrivate: i%5 == 0,
		})
	}

	return users
}

func resetSeedData(db *sql.DB) error {
	queries := []string{
		"PRAGMA foreign_keys = OFF",
		"DELETE FROM messages",
		"DELETE FROM notifications",
		"DELETE FROM group_members",
		"DELETE FROM groups",
		"DELETE FROM followers",
		"DELETE FROM sessions",
		"DELETE FROM users",
		"PRAGMA foreign_keys = ON",
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}
	return nil
}

func seedUsers(db *sql.DB, users []seedUser) (map[string]int, error) {
	userIDs := make(map[string]int, len(users))
	for _, user := range users {
		hash, err := utils.HashPassword(user.Password)
		if err != nil {
			return nil, err
		}

		result, err := db.Exec(
			`INSERT INTO users (email, password_hash, first_name, last_name, dob, avatar_path, nickname, about_me, is_private)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			user.Email,
			hash,
			user.FirstName,
			user.LastName,
			user.Dob,
			defaultAvatar,
			user.Nickname,
			user.AboutMe,
			boolToInt(user.IsPrivate),
		)
		if err != nil {
			return nil, err
		}

		id, err := result.LastInsertId()
		if err != nil {
			return nil, err
		}
		userIDs[user.Email] = int(id)
	}
	return userIDs, nil
}

func seedSessions(db *sql.DB, userIDs map[string]int) error {
	for _, userID := range userIDs {
		token := strings.ReplaceAll(uuid.NewString(), "-", "")
		expiresAt := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
		if _, err := db.Exec(
			`INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)`,
			userID,
			token,
			expiresAt,
		); err != nil {
			return err
		}
	}
	return nil
}

func seedFollowers(db *sql.DB, users []seedUser, userIDs map[string]int) error {
	for i := range users {
		followerEmail := users[i].Email
		count := 8
		switch i {
		case 0:
			count = 10
		case 1:
			count = 50
		case 2:
			count = 25
		case 3:
			count = 15
		default:
			count = 3 + (i % 12)
		}

		seen := map[int]bool{}
		for attempt := 0; len(seen) < count && attempt < totalUsers*20; attempt++ {
			candidateIdx := (i + 7*attempt + 3) % len(users)
			if candidateIdx == i {
				continue
			}
			seen[candidateIdx] = true
		}

		for candidateIdx := range seen {
			followedEmail := users[candidateIdx].Email
			status := defaultStatus
			if (i+candidateIdx)%11 == 0 && i > 3 {
				status = "pending"
			}
			if _, err := db.Exec(
				`INSERT INTO followers (follower_id, followed_id, status) VALUES (?, ?, ?)`,
				userIDs[followerEmail],
				userIDs[followedEmail],
				status,
			); err != nil {
				return fmt.Errorf("follow %s -> %s: %w", followerEmail, followedEmail, err)
			}
		}
	}
	return nil
}

func seedGroupsAndMessages(db *sql.DB, users []seedUser, userIDs map[string]int) error {
	groupNames := []string{"Design Circle", "Growth Lab", "AI Friends", "Product Crew", "Weekend Hangout"}
	groupDescriptions := []string{
		"Design feedback and idea sharing for the product team.",
		"Growth experiments, analytics, and user feedback.",
		"AI trends, demos, and collaboration updates.",
		"Product planning and roadmap chats.",
		"Casual conversations and community catch-ups.",
	}

	for gIdx, groupName := range groupNames {
		creatorEmail := users[gIdx].Email
		result, err := db.Exec(
			`INSERT INTO groups (creator_id, title, description) VALUES (?, ?, ?)`,
			userIDs[creatorEmail],
			groupName,
			groupDescriptions[gIdx],
		)
		if err != nil {
			return err
		}
		groupID, err := result.LastInsertId()
		if err != nil {
			return err
		}

		for uIdx := range users {
			if uIdx%(len(groupNames)+2) != gIdx && uIdx%7 != gIdx%7 {
				continue
			}
			status := "member"
			if uIdx%9 == gIdx%9 {
				status = "pending_request"
			}
			if _, err := db.Exec(
				`INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)`,
				groupID,
				userIDs[users[uIdx].Email],
				status,
			); err != nil {
				return err
			}
		}

		for msgNo := 0; msgNo < 8; msgNo++ {
			senderIdx := (gIdx + msgNo*3) % len(users)
			if senderIdx == 0 && msgNo%2 == 1 {
				senderIdx = 1
			}
			content := fmt.Sprintf("Group update %d: %s conversation for %s.", msgNo+1, groupName, users[senderIdx].FirstName)
			if _, err := db.Exec(
				`INSERT INTO messages (sender_id, group_id, content) VALUES (?, ?, ?)`,
				userIDs[users[senderIdx].Email],
				groupID,
				content,
			); err != nil {
				return err
			}
		}
	}

	messageTemplates := []string{
		"Hi, I just checked the latest build and it looks great.",
		"Can we sync on the roadmap this afternoon?",
		"The design mockup is ready for review.",
		"I found a few small improvements we could make.",
		"Thanks for the update — this looks promising.",
		"Let’s meet after lunch and finalize the plan.",
		"I have the notes from the demo ready to share.",
		"Nice work today, the launch plan feels solid.",
		"Could you send the latest screenshot again?",
		"I’m reviewing the feedback and will respond soon.",
	}

	for i := range users {
		for msgNo := 0; msgNo < 10; msgNo++ {
			recipientIdx := (i + 7 + msgNo*5) % len(users)
			if recipientIdx == i {
				recipientIdx = (recipientIdx + 1) % len(users)
			}
			content := fmt.Sprintf("[%s] %s", users[i].FirstName, messageTemplates[(i+msgNo)%len(messageTemplates)])
			if _, err := db.Exec(
				`INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)`,
				userIDs[users[i].Email],
				userIDs[users[recipientIdx].Email],
				content,
			); err != nil {
				return fmt.Errorf("direct message from %s to %s: %w", users[i].Email, users[recipientIdx].Email, err)
			}
		}
	}

	return nil
}

func seedNotifications(db *sql.DB, userIDs map[string]int) error {
	notificationTypes := []string{"follow", "message", "group_invite", "like", "profile_update"}
	for _, userID := range userIDs {
		for i := 0; i < 4; i++ {
			payload := fmt.Sprintf("{\"type\":\"%s\",\"index\":%d}", notificationTypes[(userID+i)%len(notificationTypes)], i+1)
			if _, err := db.Exec(
				`INSERT INTO notifications (user_id, type, payload, is_read) VALUES (?, ?, ?, ?)`,
				userID,
				notificationTypes[(userID+i)%len(notificationTypes)],
				payload,
				(i%2 == 0),
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func writeCredentialFile(basePath string, users []seedUser) error {
	lines := make([]string, 0, len(users)+1)
	lines = append(lines, "Use these accounts to log in to the app.")
	for _, user := range users {
		lines = append(lines, fmt.Sprintf("%s | %s", user.Email, user.Password))
	}
	filePath := filepath.Join(basePath, "test-users.txt")
	return os.WriteFile(filePath, []byte(strings.Join(lines, "\n")+"\n"), 0o644)
}
