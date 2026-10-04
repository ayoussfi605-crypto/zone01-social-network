package services

import (
	"context"
	"errors"

	"social-network-network/pkg/repository"
)

type ChatServices interface {
	GetChatUsers(ctx context.Context, userId int) ([]repository.ChatUsers, error)
	SaveMessage(ctx context.Context, senderId int, receiverId int, message string) error
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

func (s *chatServices) SaveMessage(ctx context.Context, senderId int, receiverId int, message string) error {
	userOne, err := s.ChatRepo.GetUserById(ctx, senderId)
	if err != nil {
		return err
	}
	UserTwo, err := s.ChatRepo.GetUserById(ctx, receiverId)
	if err != nil {
		return err
	}
	if userOne.Id == "" || UserTwo.Id == "" {
		return errors.New("you can't send message to this user")
	}
	err = s.ChatRepo.SaveMessage(senderId, receiverId, message)
	if err != nil {
		return err
	}
	return nil
}
