package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"social-network-network/pkg/middleware"
	"social-network-network/pkg/models"
	"social-network-network/pkg/services"
	"social-network-network/pkg/utils"
)

type CommentHandler struct {
	commentService services.CommentService
}

func NewCommentHandler(s services.CommentService) *CommentHandler {
	return &CommentHandler{commentService: s}
}

// GET /api/posts/{postID}/comments
func (h *CommentHandler) HandleGetComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeCommentResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	postID, ok := commentPostPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	comments, err := h.commentService.GetComments(r.Context(), viewer.Id, postID)
	if err != nil {
		writeCommentServiceError(w, err)
		return
	}
	writeCommentResponse(w, http.StatusOK, true, "", "", comments)
}

// POST /api/posts/{postID}/comments
func (h *CommentHandler) HandleCreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeCommentResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	postID, ok := commentPostPathID(w, r)
	if !ok {
		return
	}
	body, imagePath, err := parseCommentBody(r)
	if err != nil {
		writeCommentResponse(w, http.StatusBadRequest, false, "", err.Error(), nil)
		return
	}

	viewer := middleware.GetUser(r)
	comment, err := h.commentService.CreateComment(r.Context(), viewer.Id, postID, body.Content, imagePath)
	if err != nil {
		if imagePath != "" {
			utils.DeleteMediaFile(imagePath)
		}
		writeCommentServiceError(w, err)
		return
	}
	writeCommentResponse(w, http.StatusCreated, true, "comment created", "", comment)
}

func parseCommentBody(r *http.Request) (models.CreateCommentRequest, string, error) {
	var body models.CreateCommentRequest

	if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return body, "", errors.New("invalid form data (max 10MB)")
		}
		body.Content = r.FormValue("content")
		imagePath, err := saveUploadedImage(r, "image")
		if err != nil {
			return body, "", err
		}
		if imagePath == "" {
			rawURL := strings.TrimSpace(r.FormValue("image_url"))
			if rawURL != "" {
				validatedURL, err := validateImageURL(rawURL)
				if err != nil {
					return body, "", err
				}
				imagePath = validatedURL
			}
		}
		return body, imagePath, nil
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return body, "", errors.New("invalid request body")
	}
	var imagePath string
	if rawURL := strings.TrimSpace(body.ImageURL); rawURL != "" {
		validatedURL, err := validateImageURL(rawURL)
		if err != nil {
			return body, "", err
		}
		imagePath = validatedURL
	}
	return body, imagePath, nil
}

func commentPostPathID(w http.ResponseWriter, r *http.Request) (int, bool) {
	postID, err := strconv.Atoi(r.PathValue("postID"))
	if err != nil || postID <= 0 {
		writeCommentResponse(w, http.StatusBadRequest, false, "", "invalid post id", nil)
		return 0, false
	}
	return postID, true
}

func writeCommentServiceError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := "comment request failed"
	switch {
	case errors.Is(err, services.ErrPostNotFound), errors.Is(err, sql.ErrNoRows):
		status, message = http.StatusNotFound, "post not found"
	case errors.Is(err, services.ErrPostNotVisible):
		status, message = http.StatusForbidden, services.ErrPostNotVisible.Error()
	case errors.Is(err, services.ErrInvalidComment):
		status, message = http.StatusBadRequest, err.Error()
	}
	writeCommentResponse(w, status, false, "", message, nil)
}

func writeCommentResponse(w http.ResponseWriter, status int, success bool, message, responseError string, data any) {
	utils.WriteJSON(w, status, utils.ResposAPI{
		Success: success,
		Message: message,
		Eroor:   responseError,
		Data:    data,
	})
}
