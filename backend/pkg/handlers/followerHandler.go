package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/models"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
	ws "social-network-network/pkg/websocket"
)

type FollowerHandler struct {
	followerService services.FollowerService
}

func NewFollowerHandler(s services.FollowerService) *FollowerHandler {
	return &FollowerHandler{followerService: s}
}

func (h *FollowerHandler) HandleFollow(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	targetID, ok := pathUserID(w, r)
	if !ok {
		return
	}
	result, err := h.followerService.FollowUser(r.Context(), viewer.Id, targetID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidFollow):
			writeFollowerResponse(w, http.StatusBadRequest, false, "", err.Error(), nil)
		case errors.Is(err, sql.ErrNoRows):
			writeFollowerResponse(w, http.StatusNotFound, false, "", "user not found", nil)
		default:
			writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not follow user", nil)
		}
		return
	}
	writeFollowerResponse(w, http.StatusOK, true, "", "", result)
}

func (h *FollowerHandler) HandleUnfollow(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	targetID, ok := pathUserID(w, r)
	if !ok {
		return
	}
	if err := h.followerService.UnfollowUser(r.Context(), viewer.Id, targetID); err != nil {
		writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not unfollow user", nil)
		return
	}
	writeFollowerResponse(w, http.StatusOK, true, "", "", map[string]string{"status": "none"})
}

func (h *FollowerHandler) HandleFollowResponse(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	var body struct {
		FollowerID int  `json:"follower_id"`
		Accept     bool `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.FollowerID <= 0 {
		writeFollowerResponse(w, http.StatusBadRequest, false, "", "invalid request body", nil)
		return
	}
	if err := h.followerService.RespondToFollowRequest(r.Context(), viewer.Id, body.FollowerID, body.Accept); err != nil {
		if errors.Is(err, services.ErrFollowRequestNotPending) || errors.Is(err, sql.ErrNoRows) {
			writeFollowerResponse(w, http.StatusNotFound, false, "", services.ErrFollowRequestNotPending.Error(), nil)
			return
		}
		writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not respond to follow request", nil)
		return
	}
	status := "none"
	if body.Accept {
		status = "accepted"
	}
	writeFollowerResponse(w, http.StatusOK, true, "", "", map[string]string{"status": status})
}

func (h *FollowerHandler) HandleGetFollowers(w http.ResponseWriter, r *http.Request) {
	userID, ok := pathUserID(w, r)
	if !ok || !h.requireRelationshipAccess(w, r, userID) {
		return
	}
	users, err := h.followerService.GetFollowers(r.Context(), userID)
	if err != nil {
		writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not load followers", nil)
		return
	}
	addOnlineStatus(users)
	writeFollowerResponse(w, http.StatusOK, true, "", "", map[string]any{"users": users})
}

func (h *FollowerHandler) HandleGetFollowing(w http.ResponseWriter, r *http.Request) {
	userID, ok := pathUserID(w, r)
	if !ok || !h.requireRelationshipAccess(w, r, userID) {
		return
	}
	users, err := h.followerService.GetFollowing(r.Context(), userID)
	if err != nil {
		writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not load following", nil)
		return
	}
	addOnlineStatus(users)
	writeFollowerResponse(w, http.StatusOK, true, "", "", map[string]any{"users": users})
}

func (h *FollowerHandler) HandleGetPendingRequests(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	users, err := h.followerService.GetPendingFollowRequests(r.Context(), viewer.Id)
	if err != nil {
		writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not load follow requests", nil)
		return
	}
	writeFollowerResponse(w, http.StatusOK, true, "", "", map[string]any{"users": users})
}

func addOnlineStatus(users []models.FollowerData) {
	for index := range users {
		users[index].Online = ws.GlobalHub != nil && ws.GlobalHub.IsUserOnline(users[index].ID)
	}
}

func (h *FollowerHandler) requireRelationshipAccess(w http.ResponseWriter, r *http.Request, targetID int) bool {
	viewer := middleware.GetUser(r)
	allowed, err := h.followerService.CanViewRelationships(r.Context(), viewer.Id, targetID)
	if errors.Is(err, sql.ErrNoRows) {
		writeFollowerResponse(w, http.StatusNotFound, false, "", "user not found", nil)
		return false
	}
	if err != nil {
		writeFollowerResponse(w, http.StatusInternalServerError, false, "", "could not check profile access", nil)
		return false
	}
	if !allowed {
		writeFollowerResponse(w, http.StatusForbidden, false, "", "profile is private", nil)
		return false
	}
	return true
}

func pathUserID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		writeFollowerResponse(w, http.StatusBadRequest, false, "", "invalid user id", nil)
		return 0, false
	}
	return id, true
}

func writeFollowerError(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, sql.ErrNoRows) {
		writeFollowerResponse(w, http.StatusNotFound, false, "", "relationship not found", nil)
		return
	}
	writeFollowerResponse(w, http.StatusInternalServerError, false, "", fallback, nil)
}

func writeFollowerResponse(w http.ResponseWriter, status int, success bool, message, responseError string, data any) {
	utils.WriteJSON(w, status, utils.ResposAPI{
		Success: success,
		Message: message,
		Eroor:   responseError,
		Data:    data,
	})
}
