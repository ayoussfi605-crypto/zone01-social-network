package handlers

import (
	"fmt"
	"net/http"

	"social-network-network/pkg/services"
)

type ChatHandler struct {
	ChatServices services.ChatServices
}

func NewChatHandler(chatservices services.ChatServices) *ChatHandler {
	return &ChatHandler{ChatServices: chatservices}
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Heloo", r, w)
}
