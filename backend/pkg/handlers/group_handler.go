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
		writeGroupServiceError(w, err)
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

func (h *GroupHandler) HandleBrowseGroups(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.GetUser(r)
	groups, err := h.groupService.BrowseGroups(r.Context(), viewer.Id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{Success: false, Eroor: "could not browse groups"})
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: groups})
}

func (h *GroupHandler) HandleGetMembers(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	members, err := h.groupService.GetGroupMembers(r.Context(), viewer.Id, groupID)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: members})
}

func (h *GroupHandler) HandleGetPosts(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	posts, err := h.groupService.GetGroupPosts(r.Context(), viewer.Id, groupID)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: posts})
}

func (h *GroupHandler) HandleCreatePost(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	var payload struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid request body"})
		return
	}
	viewer := middleware.GetUser(r)
	post, err := h.groupService.CreateGroupPost(r.Context(), viewer.Id, groupID, payload.Content)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusCreated, utils.ResposAPI{Success: true, Data: post})
}

func (h *GroupHandler) HandleCreateComment(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	postID, err := strconv.Atoi(r.PathValue("postID"))
	if err != nil || postID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid post id"})
		return
	}
	var payload struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid request body"})
		return
	}
	viewer := middleware.GetUser(r)
	comment, err := h.groupService.CreateGroupComment(r.Context(), viewer.Id, groupID, postID, payload.Content)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusCreated, utils.ResposAPI{Success: true, Data: comment})
}

func (h *GroupHandler) HandleGetEvents(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	events, err := h.groupService.GetGroupEvents(r.Context(), viewer.Id, groupID)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: events})
}

func (h *GroupHandler) HandleCreateEvent(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	var payload struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		EventTime   string `json:"event_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid request body"})
		return
	}
	viewer := middleware.GetUser(r)
	event, err := h.groupService.CreateGroupEvent(r.Context(), viewer.Id, groupID, payload.Title, payload.Description, payload.EventTime)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusCreated, utils.ResposAPI{Success: true, Data: event})
}

func (h *GroupHandler) HandleRespondToEvent(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	eventID, err := strconv.Atoi(r.PathValue("eventID"))
	if err != nil || eventID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid event id"})
		return
	}
	var payload struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid request body"})
		return
	}
	viewer := middleware.GetUser(r)
	if err := h.groupService.RespondToEvent(r.Context(), viewer.Id, groupID, eventID, payload.Response); err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: map[string]string{"response": payload.Response}})
}

func (h *GroupHandler) HandleInviteCandidates(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	candidates, err := h.groupService.GetInviteCandidates(r.Context(), viewer.Id, groupID)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: candidates})
}

func (h *GroupHandler) HandleInviteMembers(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	var payload struct {
		UserIDs []int `json:"user_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || len(payload.UserIDs) == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "at least one user id is required"})
		return
	}
	viewer := middleware.GetUser(r)
	if err := h.groupService.InviteMembers(r.Context(), viewer.Id, groupID, payload.UserIDs); err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Message: "invitations sent"})
}

func (h *GroupHandler) HandleRequestToJoin(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	if err := h.groupService.RequestToJoin(r.Context(), viewer.Id, groupID); err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusCreated, utils.ResposAPI{Success: true, Data: map[string]string{"status": "pending_request"}})
}

func (h *GroupHandler) HandleGetJoinRequests(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	requests, err := h.groupService.GetJoinRequests(r.Context(), viewer.Id, groupID)
	if err != nil {
		writeGroupServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: requests})
}

func (h *GroupHandler) HandleRespondToJoinRequest(w http.ResponseWriter, r *http.Request) {
	groupID, ok := groupPathID(w, r)
	if !ok {
		return
	}
	userID, err := strconv.Atoi(r.PathValue("userID"))
	if err != nil || userID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid user id"})
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
	if err := h.groupService.RespondToJoinRequest(r.Context(), viewer.Id, groupID, userID, *payload.Accept); err != nil {
		writeGroupServiceError(w, err)
		return
	}
	status := "declined"
	if *payload.Accept {
		status = "accepted"
	}
	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{Success: true, Data: map[string]string{"status": status}})
}

func groupPathID(w http.ResponseWriter, r *http.Request) (int, bool) {
	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{Success: false, Eroor: "invalid group id"})
		return 0, false
	}
	return groupID, true
}

func writeGroupServiceError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := "group request failed"
	switch {
	case errors.Is(err, services.ErrNotGroupMember):
		status, message = http.StatusForbidden, services.ErrNotGroupMember.Error()
	case errors.Is(err, services.ErrNotGroupCreator):
		status, message = http.StatusForbidden, services.ErrNotGroupCreator.Error()
	case errors.Is(err, services.ErrGroupInviteNotPending):
		status, message = http.StatusNotFound, services.ErrGroupInviteNotPending.Error()
	case errors.Is(err, services.ErrJoinRequestNotPending):
		status, message = http.StatusNotFound, services.ErrJoinRequestNotPending.Error()
	case errors.Is(err, services.ErrInvalidGroupInput),
		errors.Is(err, services.ErrInvalidGroupPost),
		errors.Is(err, services.ErrInvalidGroupComment),
		errors.Is(err, services.ErrInvalidGroupEvent):
		status, message = http.StatusBadRequest, err.Error()
	case errors.Is(err, sql.ErrNoRows):
		status, message = http.StatusNotFound, "group not found"
	}
	utils.WriteJSON(w, status, utils.ResposAPI{Success: false, Eroor: message})
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
