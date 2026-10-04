package handlers

import (
	"fmt"
	"net/http"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/services"
	ws "social-network-network/pkg/websocket"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSHandler struct {
	ChatServices services.ChatServices
}

func NewWSHandler(chatservices services.ChatServices) *WSHandler {
	return &WSHandler{ChatServices: chatservices}
}

func (h *WSHandler) WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("err1", err)
		// send espose to front
		return
	}

	fmt.Println("connected")
	// get userId helper

	client := ws.Client{
		UserId:       middleware.GetUser(r).Id,
		Conn:         conn,
		Send:         make(chan []byte),
		ChatServices: h.ChatServices,
		HUB:          ws.GlobalHub,
	}

	ws.GlobalHub.Register <- &client

	go client.WritePump()
	go client.ReadPump(r.Context())
}
