package services

import "social-network-network/pkg/repository"

type ChatServices interface{}

type chatServices struct {
	ChatRepo repository.ChatRepository
}

func NewChatServices(chatrepo repository.ChatRepository) ChatServices {
	return &chatServices{ChatRepo: chatrepo}
}
