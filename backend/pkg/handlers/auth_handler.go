package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
)

// DB is set once in main.go. Simple global for learning.
var DB *sql.DB

// ---- helpers ----

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

	res := utils.ResposAPI{
		Success: true,
		Message: "User Created",
		Data:    user,
	}

	utils.WriteJSON(w, http.StatusCreated, res)
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
	fmt.Println("all done ", token)
	type resposne struct {
		User  *models.User `json:"user"`
		Token string       `json:"token"`
	}
	res := utils.ResposAPI{
		Success: true,
		Data: resposne{
			User:  user,
			Token: token,
		},
	}

	utils.WriteJSON(w, http.StatusOK, res)
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
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{
		Message: "logged out",
	})
}

// ---- GET /api/auth/me (needs Auth) ----

func Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := middleware.GetUser(r)

	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Data: user})
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
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Data: user})
}
