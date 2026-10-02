package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/services"
)

type ProfileHandler struct {
	profileService services.ProfileService
}

func NewProfileHandler(s services.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileService: s}
}

func (h *ProfileHandler) HandleGetProfile(w http.ResponseWriter, r *http.Request) {
	targetID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || targetID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid user id"})
		return
	}
	viewer := middleware.GetUser(r)
	profile, err := h.profileService.GetUserProfile(r.Context(), viewer.Id, targetID)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not load profile"})
		return
	}
	writeJSON(w, http.StatusOK, profile)
}
