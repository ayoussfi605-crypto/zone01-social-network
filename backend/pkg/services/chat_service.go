package services

import (
	"context"
	"errors"
	"fmt"

	"social-network-network/pkg/repository"
)

type ChatServices interface {
	GetChatUsers(ctx context.Context, userId int) ([]repository.ChatUsers, error)
	SaveMessage(senderId int, receiverId int, message string) error
}

type chatServices struct {
	ChatRepo repository.ChatRepository
}

func NewChatServices(chatrepo repository.ChatRepository) ChatServices {
	return &chatServices{ChatRepo: chatrepo}
}

func (s *chatServices) GetChatUsers(ctx context.Context, userId int) ([]repository.ChatUsers, error) {
	users, err := s.ChatRepo.GetChatUsers(userId)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (s *chatServices) SaveMessage(senderId int, receiverId int, message string) error {
	userOne, err := s.ChatRepo.GetUserById(senderId)
	if err != nil {
		return err
	}
	UserTwo, err := s.ChatRepo.GetUserById(receiverId)
	if err != nil {
		return err
	}
	if userOne.Id == "" || UserTwo.Id == "" {
		return errors.New("you can't send message to this user")
	}
	fmt.Println("Saving message from user", senderId, "to user", receiverId, "with content:", message)
	err = s.ChatRepo.SaveMessage(senderId, receiverId, message)
	if err != nil {
		return err
	}
	return nil
}
