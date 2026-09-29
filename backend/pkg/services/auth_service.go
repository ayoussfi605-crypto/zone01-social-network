package services

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/gofrs/uuid"

	"social-network/pkg/models"
	"social-network/pkg/repository"
	"social-network/pkg/utils"
)

// RegisterUser checks inputs, hashes password, saves user.
// avatarPath is already saved by handler ("" if no avatar).
func RegisterUser(db *sql.DB, email, password, firstName, lastName, dob, avatarPath, nickname, aboutMe string) (*models.User, error) {
	// 1. Simple validation
	email = strings.TrimSpace(email)
	if !strings.Contains(email, "@") {
		return nil, errors.New("invalid email")
	}
	if len(password) < 6 {
		return nil, errors.New("password too short (min 6)")
	}
	if strings.TrimSpace(firstName) == "" || strings.TrimSpace(lastName) == "" || strings.TrimSpace(dob) == "" {
		return nil, errors.New("first name, last name and dob are required")
	}

	// 2. Email already used?
	existing, err := repository.GetUserByEmail(db, email)
	if err == nil && existing != nil {
		return nil, errors.New("email already registered")
	}

	// 3. Hash password with bcrypt (helper in utils)
	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	// 4. Save
	u := models.User{
		Email:        email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Dob:          dob,
		AvatarPath:   avatarPath,
		Nickname:     nickname,
		AboutMe:      aboutMe,
	}
	id, err := repository.CreateUser(db, u)
	if err != nil {
		return nil, err
	}

	// 5. Return user without password
	u.Id = int(id)
	u.PasswordHash = ""
	return &u, nil
}

// LoginUser checks email+password, creates a session token (24h).
// Returns token + user (without password).
func LoginUser(db *sql.DB, email, password string) (string, *models.User, error) {
	// 1. Find user
	u, err := repository.GetUserByEmail(db, strings.TrimSpace(email))
	if err != nil {
		return "", nil, errors.New("invalid email or password")
	}

	// 2. Compare password with hash (helper in utils)
	if !utils.CheckPassword(u.PasswordHash, password) {
		return "", nil, errors.New("invalid email or password")
	}

	// 3. Make random token with UUID
	tokenID, err := uuid.NewV4()
	if err != nil {
		return "", nil, err
	}
	token := tokenID.String()

	// 4. Save session for 24 hours
	expires := time.Now().Add(24 * time.Hour)
	if err := repository.CreateSession(db, u.Id, token, expires); err != nil {
		return "", nil, err
	}

	u.PasswordHash = "" // never return hash
	return token, u, nil
}

// ValidateSession checks token and returns the logged-in user.
func ValidateSession(db *sql.DB, token string) (*models.User, error) {
	s, err := repository.GetSessionByToken(db, token)
	if err != nil {
		return nil, errors.New("not logged in")
	}
	u, err := repository.GetUserByID(db, s.UserId)
	if err != nil {
		return nil, errors.New("not logged in")
	}
	u.PasswordHash = ""
	return u, nil
}

// LogoutUser deletes the session token.
func LogoutUser(db *sql.DB, token string) error {
	return repository.DeleteSession(db, token)
}
