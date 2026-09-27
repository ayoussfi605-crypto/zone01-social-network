package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"backend/pkg/services"
)

type FollowerHandler struct {
	FollowerService *services.FollowerService
}

func NewFollowerHandler(s *services.FollowerService) *FollowerHandler {
	return &FollowerHandler{FollowerService: s}
}

// POST /api/users/{id}/follow
func (h *FollowerHandler) FollowUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract targetID from URL (e.g., /api/users/5/follow)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	targetID, err := strconv.Atoi(parts[3])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// TODO: Replace with actual logged-in user ID from Session/Cookie
	followerID := 1 

	err = h.FollowerService.FollowUser(followerID, targetID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Follow action successful"})
}

// POST /api/users/{id}/unfollow
func (h *FollowerHandler) UnfollowUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	targetID, err := strconv.Atoi(parts[3])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	followerID := 1 // Placeholder for logged-in user

	err = h.FollowerService.UnfollowUser(followerID, targetID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Unfollowed successfully"})
}

// POST /api/users/follow-response
func (h *FollowerHandler) RespondToFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse JSON body to get followerID and the decision (accept: true/false)
	var reqBody struct {
		FollowerID int  `json:"follower_id"`
		Accept     bool `json:"accept"`
	}

	err := json.NewDecoder(r.Body).Decode(&reqBody)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	targetID := 1 // Placeholder: This is the logged-in user receiving the request

	err = h.FollowerService.RespondToFollowRequest(targetID, reqBody.FollowerID, reqBody.Accept)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Response recorded successfully"})
}