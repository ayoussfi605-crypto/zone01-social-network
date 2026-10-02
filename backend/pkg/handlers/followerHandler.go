package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/services"
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
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		case errors.Is(err, sql.ErrNoRows):
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		default:
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not follow user"})
		}
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *FollowerHandler) HandleUnfollow(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	targetID, ok := pathUserID(w, r)
	if !ok {
		return
	}
	if err := h.followerService.UnfollowUser(r.Context(), viewer.Id, targetID); err != nil {
		writeFollowerError(w, err, "could not unfollow user")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "none"})
}

func (h *FollowerHandler) HandleFollowResponse(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	var body struct {
		FollowerID int  `json:"follower_id"`
		Accept     bool `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.FollowerID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.followerService.RespondToFollowRequest(r.Context(), viewer.Id, body.FollowerID, body.Accept); err != nil {
		if errors.Is(err, services.ErrFollowRequestNotPending) || errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": services.ErrFollowRequestNotPending.Error()})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not respond to follow request"})
		return
	}
	status := "none"
	if body.Accept {
		status = "accepted"
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (h *FollowerHandler) HandleGetFollowers(w http.ResponseWriter, r *http.Request) {
	userID, ok := pathUserID(w, r)
	if !ok || !h.requireRelationshipAccess(w, r, userID) {
		return
	}
	users, err := h.followerService.GetFollowers(r.Context(), userID)
	if err != nil {
		writeFollowerError(w, err, "could not load followers")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *FollowerHandler) HandleGetFollowing(w http.ResponseWriter, r *http.Request) {
	userID, ok := pathUserID(w, r)
	if !ok || !h.requireRelationshipAccess(w, r, userID) {
		return
	}
	users, err := h.followerService.GetFollowing(r.Context(), userID)
	if err != nil {
		writeFollowerError(w, err, "could not load following")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *FollowerHandler) HandleGetPendingRequests(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	users, err := h.followerService.GetPendingFollowRequests(r.Context(), viewer.Id)
	if err != nil {
		writeFollowerError(w, err, "could not load follow requests")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *FollowerHandler) requireRelationshipAccess(w http.ResponseWriter, r *http.Request, targetID int) bool {
	viewer := middleware.GetUser(r)
	allowed, err := h.followerService.CanViewRelationships(r.Context(), viewer.Id, targetID)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return false
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not check profile access"})
		return false
	}
	if !allowed {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "profile is private"})
		return false
	}
	return true
}

func pathUserID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid user id"})
		return 0, false
	}
	return id, true
}

func writeFollowerError(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "relationship not found"})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": fallback})
}
