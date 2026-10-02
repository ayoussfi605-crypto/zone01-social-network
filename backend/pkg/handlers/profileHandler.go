package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
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
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Eroor: "invalid user id"})
		return
	}
	viewer := middleware.GetUser(r)
	profile, err := h.profileService.GetUserProfile(r.Context(), viewer.Id, targetID)
	if errors.Is(err, sql.ErrNoRows) {
		utils.WriteJSON(w, http.StatusNotFound, utils.ResposAPI{Eroor: "user not found"})
		return
	}
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Eroor: "could not load profile"})
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: profile})
}
