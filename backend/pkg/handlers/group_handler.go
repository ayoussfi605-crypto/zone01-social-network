package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/models"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
)

type GroupHandler struct {
	groupService services.GroupService
}

func NewGroupHandler(s services.GroupService) *GroupHandler {
	return &GroupHandler{groupService: s}
}

func (h *GroupHandler) HandleCreateGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteJSON(w, http.StatusMethodNotAllowed, utils.ResposAPI{
			Success: false,
			Eroor:   "method not allowed",
		})
		return
	}

	var payload models.CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{
			Success: false,
			Eroor:   "invalid request body",
		})
		return
	}

	payload.Title = strings.TrimSpace(payload.Title)
	payload.Description = strings.TrimSpace(payload.Description)
	if payload.Title == "" {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{
			Success: false,
			Eroor:   "group title is required",
		})
		return
	}

	viewer := middleware.GetUser(r)
	group, err := h.groupService.CreateGroup(r.Context(), viewer.Id, payload.Title, payload.Description, payload.MemberIDs)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{
			Success: false,
			Eroor:   err.Error(),
		})
		return
	}

	utils.WriteJSON(w, http.StatusCreated, utils.ResposAPI{
		Success: true,
		Message: "group created",
		Data:    group,
	})
}

func (h *GroupHandler) HandleGetGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteJSON(w, http.StatusMethodNotAllowed, utils.ResposAPI{
			Success: false,
			Eroor:   "method not allowed",
		})
		return
	}

	viewer := middleware.GetUser(r)
	groups, err := h.groupService.GetGroups(r.Context(), viewer.Id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{
			Success: false,
			Eroor:   err.Error(),
		})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{
		Success: true,
		Data:    groups,
	})
}

func (h *GroupHandler) HandleGetPendingInvites(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteJSON(w, http.StatusMethodNotAllowed, utils.ResposAPI{Success: false, Eroor: "method not allowed"})
		return
	}

	viewer := middleware.GetUser(r)
	invites, err := h.groupService.GetPendingInvites(r.Context(), viewer.Id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Success: false, Eroor: "could not load group invites"})
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: invites})
}

func (h *GroupHandler) HandleRespondToInvite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteJSON(w, http.StatusMethodNotAllowed, utils.ResposAPI{Success: false, Eroor: "method not allowed"})
		return
	}

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid group id"})
		return
	}
	var payload struct {
		Accept *bool `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Accept == nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid request body"})
		return
	}

	viewer := middleware.GetUser(r)
	if err := h.groupService.RespondToInvite(r.Context(), viewer.Id, groupID, *payload.Accept); err != nil {
		if errors.Is(err, services.ErrGroupInviteNotPending) || errors.Is(err, sql.ErrNoRows) {
			utils.WriteJSON(w, http.StatusNotFound, utils.ResposAPI{Success: false, Eroor: "group invite is not pending"})
			return
		}
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Success: false, Eroor: "could not respond to group invite"})
		return
	}
	status := "declined"
	if *payload.Accept {
		status = "accepted"
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: map[string]string{"status": status}})
}
