package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"sync"

	"social-network-network/pkg/services"

	"github.com/gorilla/websocket"
)

var GlobalHub *HUB

type Client struct {
	UserId       int
	Conn         *websocket.Conn
	Send         chan []byte
	ChatServices services.ChatServices
	HUB          *HUB
}

type HUB struct {
	Clients    map[int]map[*Client]bool
	Register   chan *Client
	UnRegister chan *Client
	Brodcast   chan []byte
	MX         sync.Mutex
}

func InitHUb() *HUB {
	return &HUB{
		Clients:    map[int]map[*Client]bool{},
		Register:   make(chan *Client),
		UnRegister: make(chan *Client),
		Brodcast:   make(chan []byte),
	}
}

func ManageHub(hub *HUB) {
	for {
		select {
		case client := <-hub.Register:
			hub.register(client)
		case client := <-hub.UnRegister:
			hub.unregister(client)
		case message := <-hub.Brodcast:
			hub.brodcast(message)
		}
	}
}

func (h *HUB) register(client *Client) {
	h.MX.Lock()
	defer h.MX.Unlock()

	if h.Clients[client.UserId] == nil {
		h.Clients[client.UserId] = make(map[*Client]bool)
	}
	h.Clients[client.UserId][client] = true
}

func (h *HUB) unregister(client *Client) {
	h.MX.Lock()
	defer h.MX.Unlock()
	clients, exsite := h.Clients[client.UserId]

	if !exsite {
		return
	}
	_, exsite = clients[client]

	if !exsite {
		return
	}
	delete(clients, client)
	close(client.Send)

	if len(clients) == 0 {
		delete(h.Clients, client.UserId)
	}
}

func (h *HUB) brodcast(message []byte) {
	fmt.Println("message", string(message))
	h.MX.Lock()
	defer h.MX.Unlock()
	for _, clients := range h.Clients {
		for client := range clients {
			select {
			case client.Send <- message:
			default:
				// nothing to do Now
			}
		}
	}
}

func (h *HUB) sendToUser(message []byte, userId int) {
	fmt.Println("message", string(message))

	h.MX.Lock()
	defer h.MX.Unlock()
	fmt.Println("clients", h.Clients)
	clients, exists := h.Clients[userId]
	if !exists {
		return
	}
	for client := range clients {
		select {
		case client.Send <- message:
			h.saveMessageToDB(message, userId)
		default:
			// nothing to do Now
		}
	}
}

func (h *HUB) saveMessageToDB(message []byte, userId int) {
	// Save the message to the database using your repository
}

func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()

	for messages := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, messages)
		if err != nil {
			fmt.Println("err pump   ,", err)
			return
		}
	}
}

func (c *Client) ReadPump(ctx context.Context) {
	defer func() {
		fmt.Println("UNREGISTER CLIENT:", c.UserId)
		c.HUB.UnRegister <- c
		c.Conn.Close()
	}()
	type message struct {
		Type        string `json:"type"`
		Message     string `json:"content"`
		Sender_id   int `json:"sender_id"`
		Receiver_id string `json:"receiver_id"`
		Sender_name string `json:"sender_name"`
	}
	for {

		_, payload, err := c.Conn.ReadMessage()
		if err != nil {
			fmt.Println("read error:", err)
			break
		}
		var msg message
		err = json.Unmarshal(payload, &msg)
		if err != nil {
			fmt.Println("unmarshal error:", err)
			break
		}
		recipientId, err := strconv.Atoi(msg.Receiver_id)
		if err != nil {
			fmt.Println("error converting recipient ID:", err)
			break
		}
		err = c.ChatServices.SaveMessage(ctx, c.UserId, recipientId, msg.Message)
		if err != nil {
			fmt.Println("unmarshal error:", err)
			break
		}

		if msg.Type == "message_private" {
			recipientId, err := strconv.Atoi(msg.Receiver_id)
			if err != nil {
				fmt.Println("error converting recipient ID:", err)
				break
			}
			GlobalHub.sendToUser(payload, recipientId)
		}

	}
}
