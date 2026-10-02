package handlers

import (
	"fmt"
	"net/http"

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
	fmt.Println("Heloo", r, w)
	User := middleware.GetUser(r)

	users, err := h.ChatServices.GetChatUsers(r.Context(), User.Id)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, utils.ResposAPI{
			Success: false,
			Message: err.Error(),
			Eroor:   err.Error(),
		})
	}
	fmt.Println("users" ,users)

	utils.WriteJSON(w, http.StatusOK, utils.ResposAPI{
		Success: true,
		Data:    users,
	})
}
