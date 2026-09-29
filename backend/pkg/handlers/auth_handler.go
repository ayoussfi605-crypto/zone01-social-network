package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"social-network/pkg/middleware"
	"social-network/pkg/repository"
	"social-network/pkg/services"
	"social-network/pkg/utils"
)

// DB is set once in main.go. Simple global for learning.
var DB *sql.DB

// ---- helpers ----

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// ---- POST /api/auth/register ----

func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var email, password, firstName, lastName, dob, nickname, aboutMe, avatarPath string

	if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
			http.Error(w, "invalid form data (max 10MB)", http.StatusBadRequest)
			return
		}
		email = r.FormValue("email")
		password = r.FormValue("password")
		firstName = r.FormValue("first_name")
		lastName = r.FormValue("last_name")
		dob = r.FormValue("dob")
		nickname = r.FormValue("nickname")
		aboutMe = r.FormValue("about_me")
		path, err := utils.SaveAvatar(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		avatarPath = path
	} else {
		var body struct {
			Email     string `json:"email"`
			Password  string `json:"password"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Dob       string `json:"dob"`
			Nickname  string `json:"nickname"`
			AboutMe   string `json:"about_me"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		email, password, firstName, lastName, dob, nickname, aboutMe = body.Email, body.Password, body.FirstName, body.LastName, body.Dob, body.Nickname, body.AboutMe
	}

	user, err := services.RegisterUser(DB, email, password, firstName, lastName, dob, avatarPath, nickname, aboutMe)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

// ---- POST /api/auth/login ----

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	token, user, err := services.LoginUser(DB, body.Email, body.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// Set HttpOnly cookie so browser sends it automatically.
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400, // 24h
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, user)
}

// ---- POST /api/auth/logout ----

func Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	cookie, err := r.Cookie("session_token")
	if err == nil {
		services.LogoutUser(DB, cookie.Value)
	}
	// Clear cookie in browser.
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// ---- GET /api/auth/me (needs Auth) ----

func Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	user := middleware.GetUser(r)
	writeJSON(w, http.StatusOK, user)
}

// ---- PUT /api/users/privacy (needs Auth) ----

func UpdatePrivacy(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PUT" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	user := middleware.GetUser(r)
	var body struct {
		IsPrivate bool `json:"is_private"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if err := repository.UpdatePrivacy(DB, user.Id, body.IsPrivate); err != nil {
		http.Error(w, "cannot update", http.StatusInternalServerError)
		return
	}
	user.IsPrivate = body.IsPrivate
	writeJSON(w, http.StatusOK, user)
}
