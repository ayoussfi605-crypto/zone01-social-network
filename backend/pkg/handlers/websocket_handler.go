package handlers

import (
	"fmt"
	"net/http"

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

func WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("err1", err)
		// send espose to front
		return
	}

	fmt.Println("connected")
	// get userId helper

	client := ws.Client{
		UserId: 1,
		Conn:   conn,
		Send:   make(chan []byte),
	}

	ws.GlobalHub.Register <- &client

	go client.WritePump()
	go client.ReadPump()
}
