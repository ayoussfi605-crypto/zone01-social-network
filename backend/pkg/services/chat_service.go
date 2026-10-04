package services

import (
	"context"
	"errors"
	"fmt"

	"social-network-network/pkg/models"
	"social-network-network/pkg/repository"
)

type ChatServices interface {
	GetChatUsers(ctx context.Context, userId int) ([]repository.ChatUsers, error)
	SaveMessage(senderId int, receiverId int, message string) error
	GetMessages(senderID int, receiverID int) ([]models.ChatMessage, error)
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

func (s *chatServices) GetMessages(senderID int, receiverID int) ([]models.ChatMessage, error) {
	sender, err := s.ChatRepo.GetUserById(senderID)
	if err != nil {
		return nil, err
	}
	receiver, err := s.ChatRepo.GetUserById(receiverID)
	if err != nil {
		return nil, err
	}

	if sender == nil || receiver == nil {
		return nil, errors.New("you can't get messages for this user")
	}
	messages, err := s.ChatRepo.GetMessages(senderID, receiverID)
	if err != nil {
		return nil, err
	}
	return messages, nil
}
