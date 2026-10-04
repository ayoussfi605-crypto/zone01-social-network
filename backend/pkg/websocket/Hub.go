package ws

import (
	"encoding/json"
	"fmt"
	"strconv"
	"sync"
	"time"

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

	wasOnline := len(h.Clients[client.UserId]) > 0
	if h.Clients[client.UserId] == nil {
		h.Clients[client.UserId] = make(map[*Client]bool)
	}
	h.Clients[client.UserId][client] = true
	if !wasOnline {
		h.broadcastPresence(client.UserId, true)
	}
}

func (h *HUB) unregister(client *Client) {
	h.MX.Lock()
	defer h.MX.Unlock()
	clients, exists := h.Clients[client.UserId]

	if !exists {
		return
	}
	_, exists = clients[client]

	if !exists {
		return
	}
	delete(clients, client)
	close(client.Send)

	if len(clients) == 0 {
		delete(h.Clients, client.UserId)
		h.broadcastPresence(client.UserId, false)
	}
}

func (h *HUB) IsUserOnline(userID int) bool {
	h.MX.Lock()
	defer h.MX.Unlock()
	_, ok := h.Clients[userID]
	return ok
}

func (h *HUB) broadcastPresence(userID int, online bool) {
	payload, err := json.Marshal(map[string]any{
		"type":    "presence",
		"user_id": userID,
		"online":  online,
		"sent_at": time.Now().UnixMilli(),
	})
	if err != nil {
		return
	}
	for _, clients := range h.Clients {
		for client := range clients {
			select {
			case client.Send <- payload:
			default:
			}
		}
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

func (h *HUB) sendToUsers(message []byte, userIDs []int) {
	h.MX.Lock()
	defer h.MX.Unlock()
	for _, userID := range userIDs {
		for client := range h.Clients[userID] {
			select {
			case client.Send <- message:
			default:
			}
		}
	}
}

// SendToUser pushes an already-encoded frame to every live connection of a
// user. It is used for real-time notifications, which are deliberately kept
// separate from chat messages (notifications are not stored here).
func (h *HUB) SendToUser(message []byte, userID int) {
	h.MX.Lock()
	defer h.MX.Unlock()
	for client := range h.Clients[userID] {
		select {
		case client.Send <- message:
		default:
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

func (c *Client) ReadPump() {
	defer func() {
		fmt.Println("UNREGISTER CLIENT:", c.UserId)
		c.HUB.UnRegister <- c
		c.Conn.Close()
	}()
	type message struct {
		Type       string `json:"type"`
		Message    string `json:"message"`
		GroupID    int    `json:"group_id"`
		ReceiverID string `json:"receiver_id"`
		SenderName string `json:"sender_name"`
	}
	for {

		_, payload, err := c.Conn.ReadMessage()
		fmt.Println("payloas", string(payload))
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
		if msg.Type == "message_group" {
			if err := c.ChatServices.SaveGroupMessage(c.UserId, msg.GroupID, msg.Message); err != nil {
				fmt.Println("group message rejected:", err)
				continue
			}
			memberIDs, err := c.ChatServices.GetGroupMemberIDs(msg.GroupID)
			if err != nil {
				fmt.Println("load group members:", err)
				continue
			}
			outgoing, err := json.Marshal(map[string]any{
				"type": "message_group", "group_id": msg.GroupID,
				"sender_id": c.UserId, "sender_name": msg.SenderName,
				"message": msg.Message, "timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			if err == nil {
				c.HUB.sendToUsers(outgoing, memberIDs)
			}
			continue
		}

		if msg.Type != "message_private" {
			continue
		}
		recipientID, err := strconv.Atoi(msg.ReceiverID)
		if err != nil {
			fmt.Println("invalid private recipient:", err)
			continue
		}
		if err := c.ChatServices.SaveMessage(c.UserId, recipientID, msg.Message); err != nil {
			fmt.Println("private message rejected:", err)
			continue
		}
		outgoing, err := json.Marshal(map[string]any{
			"type": "message_private", "receiver_id": strconv.Itoa(recipientID),
			"sender_id": c.UserId, "sender_name": msg.SenderName, "message": msg.Message,
		})
		if err == nil {
			c.HUB.sendToUser(outgoing, recipientID)
		}

	}
}
