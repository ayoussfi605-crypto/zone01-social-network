package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
)

type ChatHandler struct {
	ChatServices services.ChatServices
}

func NewChatHandler(chatservices services.ChatServices) *ChatHandler {
	return &ChatHandler{ChatServices: chatservices}
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.WriteJSON(w, http.StatusMethodNotAllowed, utils.ResposAPI{
			Success: false,
			Eroor:   "method not allowed",
		})
		return
	}

	User := middleware.GetUser(r)

	users, err := h.ChatServices.GetChatUsers(r.Context(), User.Id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{
			Success: false,
			Eroor:   err.Error(),
		})
	}

	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{
		Success: true,
		Data:    users,
	})
}

func (h *ChatHandler) HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	fmt.Println("HandleGetMessages called")
	if r.Method != http.MethodGet {
		utils.WriteJSON(w, http.StatusMethodNotAllowed, utils.ResposAPI{
			Success: false,
			Eroor:   "method not allowed",
		})
		return
	}

	senderId := middleware.GetUser(r).Id
	receiverId := r.PathValue("id")
	id, err := strconv.Atoi(receiverId)
	if err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, utils.ResposAPI{
			Success: false,
			Eroor:   "invalid receiver id",
		})
		return
	}

	messages, err := h.ChatServices.GetMessages(senderId, id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{
			Success: false,
			Eroor:   err.Error(),
		})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{
		Success: true,
		Data:    messages,
	})
}
