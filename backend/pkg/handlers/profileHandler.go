package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/repository"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
	ws "social-network-network/pkg/websocket"
)

type ProfileHandler struct {
	profileService services.ProfileService
}

func (h *ProfileHandler) HandleDiscoverUsers(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	limit := 10
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed < 1 {
			utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid limit"})
			return
		}
		limit = parsed
	}
	if limit > 50 {
		limit = 50
	}
	offset := 0
	if rawOffset := r.URL.Query().Get("offset"); rawOffset != "" {
		parsed, err := strconv.Atoi(rawOffset)
		if err != nil || parsed < 0 {
			utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid offset"})
			return
		}
		offset = parsed
	}
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	queryRunes := []rune(query)
	if len(queryRunes) > 100 {
		query = string(queryRunes[:100])
	}
	page, err := h.profileService.DiscoverUsers(r.Context(), viewer.Id, query, limit, offset)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Success: false, Eroor: "could not discover users"})
		return
	}
	for index := range page.Users {
		page.Users[index].Online = ws.GlobalHub != nil && ws.GlobalHub.IsUserOnline(page.Users[index].ID)
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: page})
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

func (h *ProfileHandler) HandleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r)
	var body struct {
		AboutMe   string `json:"about_me"`
		IsPrivate bool   `json:"is_private"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid request"})
		return
	}
	if err := repository.UpdateProfile(DB, user.Id, body.AboutMe, body.IsPrivate); err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Success: false, Eroor: "could not update profile"})
		return
	}
	updatedUser, err := repository.GetUserByID(DB, user.Id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Success: false, Eroor: "could not load updated profile"})
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: updatedUser})
}
