package services

import (
	"context"

	"social-network-network/pkg/repository"
)

type ChatServices interface {
	GetChatUsers(ctx context.Context, userId int) ([]repository.ChatUsers, error)
}

type chatServices struct {
	ChatRepo repository.ChatRepository
}

func NewChatServices(chatrepo repository.ChatRepository) ChatServices {
	return &chatServices{ChatRepo: chatrepo}
}

func (s *chatServices) GetChatUsers(ctx context.Context, userId int) ([]repository.ChatUsers, error) {
	users, err := s.ChatRepo.GetChatUsers(ctx, userId)
	if err != nil {
		return nil, err
	}
	return users, nil
}
