package websocket

import (
	"sync"

	"github.com/gorilla/websocket"
)

var GlobalHub *HUB

type Client struct {
	UserId int
	Conn   *websocket.Conn
	Send   chan []byte
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
	h.MX.Lock()
	defer h.MX.Unlock()
	for _, conns := range h.Clients {
		for user := range conns {
			select {
			case user.Send <- message:
			default:
				// nothing to do Now
			}
		}
	}
}
