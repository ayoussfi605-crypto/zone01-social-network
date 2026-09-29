package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"social/middlewares"
	"social/pkg/services"
	"social/utils"
)

type ProfileHandler struct {
	profileService services.ProfileService
}

func NewProfileHandler(s services.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileService: s}
}

// GET /api/users/{id}/profile
func (h *ProfileHandler) HandleGetProfile(w http.ResponseWriter, r *http.Request) {
	middlewares.EnableCores(w, r)
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Method Not Allowed"})
		return
	}

	if err := utils.IsValidSeesion(r); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid Token"})
		return
	}

	viewerID := middlewares.GetUserId(r)
	if viewerID == 0 {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Unauthorized"})
		return
	}

	targetIDStr := r.PathValue("id")
	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid user ID"})
		return
	}

	profile, err := h.profileService.GetUserProfile(r.Context(), viewerID, targetID)
	
	// Handle restricted private profiles
	if err != nil && err.Error() == "private profile" {
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: true,
			Message: profile, // Restricted profile (only basic info)
			Error:   "Profile is private",
		})
		return
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Server error"})
		return
	}

	json.NewEncoder(w).Encode(utils.ResponseApi{
		Success: true,
		Message: profile,
	})
}