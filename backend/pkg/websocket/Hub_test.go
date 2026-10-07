package ws

import (
	"encoding/json"
	"testing"
)

func TestPresenceRemainsOnlineUntilLastConnectionCloses(t *testing.T) {
	hub := InitHUb()
	firstConnection := &Client{UserId: 1, Send: make(chan []byte, 16)}
	secondConnection := &Client{UserId: 1, Send: make(chan []byte, 16)}
	observer := &Client{UserId: 2, Send: make(chan []byte, 16)}

	hub.register(firstConnection)
	hub.register(secondConnection)
	hub.register(observer)
	drainMessages(firstConnection.Send)
	drainMessages(secondConnection.Send)
	drainMessages(observer.Send)

	hub.unregister(firstConnection)
	if !hub.IsUserOnline(1) {
		t.Fatal("user should remain online while another connection is active")
	}
	if len(observer.Send) != 0 {
		t.Fatal("disconnecting one connection should not broadcast offline presence")
	}

	hub.unregister(secondConnection)
	if hub.IsUserOnline(1) {
		t.Fatal("user should be offline after the last connection closes")
	}

	select {
	case payload := <-observer.Send:
		var event struct {
			Type   string `json:"type"`
			UserID int    `json:"user_id"`
			Online bool   `json:"online"`
			SentAt int64  `json:"sent_at"`
		}
		if err := json.Unmarshal(payload, &event); err != nil {
			t.Fatalf("decode presence event: %v", err)
		}
		if event.Type != "presence" || event.UserID != 1 || event.Online || event.SentAt <= 0 {
			t.Fatalf("unexpected offline presence event: %+v", event)
		}
	default:
		t.Fatal("last disconnect should broadcast offline presence")
	}
}

func drainMessages(messages <-chan []byte) {
	for {
		select {
		case <-messages:
		default:
			return
		}
	}
}
