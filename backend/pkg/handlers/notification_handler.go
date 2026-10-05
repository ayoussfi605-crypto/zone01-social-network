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

type NotificationHandler struct {
	notificationService services.NotificationService
}

func NewNotificationHandler(s services.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: s}
}

// GET /api/notifications
func (h *NotificationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeNotificationResponse(w, http.StatusMethodNotAllowed, false, "method not allowed", nil)
		return
	}
	viewer := middleware.GetUser(r)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	list, err := h.notificationService.List(r.Context(), viewer.Id, limit)
	if err != nil {
		writeNotificationResponse(w, http.StatusInternalServerError, false, "could not load notifications", nil)
		return
	}
	writeNotificationResponse(w, http.StatusOK, true, "", list)
}

// GET /api/notifications/unread-count
func (h *NotificationHandler) HandleUnreadCount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeNotificationResponse(w, http.StatusMethodNotAllowed, false, "method not allowed", nil)
		return
	}
	viewer := middleware.GetUser(r)
	count, err := h.notificationService.UnreadCount(r.Context(), viewer.Id)
	if err != nil {
		writeNotificationResponse(w, http.StatusInternalServerError, false, "could not count notifications", nil)
		return
	}
	writeNotificationResponse(w, http.StatusOK, true, "", map[string]int{"count": count})
}

// POST /api/notifications/{id}/read
func (h *NotificationHandler) HandleMarkRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeNotificationResponse(w, http.StatusMethodNotAllowed, false, "method not allowed", nil)
		return
	}
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		writeNotificationResponse(w, http.StatusBadRequest, false, "invalid notification id", nil)
		return
	}
	viewer := middleware.GetUser(r)
	if err := h.notificationService.MarkRead(r.Context(), viewer.Id, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeNotificationResponse(w, http.StatusNotFound, false, "notification not found", nil)
			return
		}
		writeNotificationResponse(w, http.StatusInternalServerError, false, "could not update notification", nil)
		return
	}
	writeNotificationResponse(w, http.StatusOK, true, "notification read", map[string]string{"status": "read"})
}

// POST /api/notifications/read-all
func (h *NotificationHandler) HandleMarkAllRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeNotificationResponse(w, http.StatusMethodNotAllowed, false, "method not allowed", nil)
		return
	}
	viewer := middleware.GetUser(r)
	if err := h.notificationService.MarkAllRead(r.Context(), viewer.Id); err != nil {
		writeNotificationResponse(w, http.StatusInternalServerError, false, "could not update notifications", nil)
		return
	}
	writeNotificationResponse(w, http.StatusOK, true, "all notifications read", map[string]string{"status": "read"})
}

// pushNotification delivers a notification to a user over the websocket if they
// are online. Notifications use their own "notification" frame type so the
// frontend can show them separately from private messages.
func pushNotification(n *models.Notification) {
	if n == nil || ws.GlobalHub == nil {
		return
	}
	frame, err := json.Marshal(map[string]any{
		"type":         "notification",
		"notification": n,
	})
	if err != nil {
		return
	}
	ws.GlobalHub.SendToUser(frame, n.UserID)
}

func writeNotificationResponse(w http.ResponseWriter, status int, success bool, responseError string, data any) {
	utils.WriteJSON(w, status, utils.ResposAPI{
		Success: success,
		Eroor:   responseError,
		Data:    data,
	})
}
