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
	SaveGroupMessage(senderID, groupID int, message string) error
	GetGroupMessages(userID, groupID int) ([]models.GroupChatMessage, error)
	GetGroupMemberIDs(groupID int) ([]int, error)
	MarkMessagesAsRead(receiver_id int, sender_id int) error
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
	allowed, err := s.ChatRepo.CanMessage(senderId, receiverId)
	if err != nil {
		return err
	}
	if !allowed {
		return errors.New("you can only message users connected to you or public profiles")
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
	allowed, err := s.ChatRepo.CanMessage(senderID, receiverID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, errors.New("you can only view conversations connected to you")
	}
	messages, err := s.ChatRepo.GetMessages(senderID, receiverID)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (s *chatServices) SaveGroupMessage(senderID, groupID int, message string) error {
	if senderID <= 0 || groupID <= 0 || message == "" {
		return errors.New("invalid group message")
	}
	member, err := s.ChatRepo.IsGroupMember(groupID, senderID)
	if err != nil {
		return err
	}
	if !member {
		return errors.New("only group members can send messages")
	}
	return s.ChatRepo.SaveGroupMessage(senderID, groupID, message)
}

func (s *chatServices) GetGroupMessages(userID, groupID int) ([]models.GroupChatMessage, error) {
	member, err := s.ChatRepo.IsGroupMember(groupID, userID)
	if err != nil {
		return nil, err
	}
	if !member {
		return nil, errors.New("only group members can view messages")
	}
	return s.ChatRepo.GetGroupMessages(groupID)
}

func (s *chatServices) GetGroupMemberIDs(groupID int) ([]int, error) {
	return s.ChatRepo.GetGroupMemberIDs(groupID)
}

func (s *chatServices) MarkMessagesAsRead(receiver_id int, sender_id int) error {
	_, err := s.ChatRepo.GetUserById(receiver_id)
	if err != nil || receiver_id <= 0 {
		return errors.New("invalid receiver userId")
	}

	_, err = s.ChatRepo.GetUserById(sender_id)

	if err != nil || receiver_id <= 0 {
		return errors.New("invalid sender userId")
	}

	return s.ChatRepo.MarkMessagesAsRead(receiver_id, sender_id)
}
