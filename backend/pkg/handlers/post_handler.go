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

type PostHandler struct {
	postService services.PostService
}

func NewPostHandler(s services.PostService) *PostHandler {
	return &PostHandler{postService: s}
}

// POST /api/posts
func (h *PostHandler) HandleCreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}

	body, imagePath, err := parsePostBody(r)
	if err != nil {
		writePostResponse(w, http.StatusBadRequest, false, "", err.Error(), nil)
		return
	}

	viewer := middleware.GetUser(r)
	post, err := h.postService.CreatePost(r.Context(), viewer.Id, body.Content, imagePath, body.Privacy, body.AllowedUserIDs)
	if err != nil {
		writePostServiceError(w, err)
		return
	}
	writePostResponse(w, http.StatusCreated, true, "post created", "", post)
}

// GET /api/posts
func (h *PostHandler) HandleGetFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	viewer := middleware.GetUser(r)
	var limit int
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil {
		limit = n
	}
	posts, err := h.postService.GetFeed(r.Context(), viewer.Id, limit)
	if err != nil {
		writePostResponse(w, http.StatusInternalServerError, false, "", "could not load feed", nil)
		return
	}
	writePostResponse(w, http.StatusOK, true, "", "", posts)
}

// GET /api/posts/{postID}
func (h *PostHandler) HandleGetPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	postID, ok := postPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	post, err := h.postService.GetPost(r.Context(), viewer.Id, postID)
	if err != nil {
		writePostServiceError(w, err)
		return
	}
	writePostResponse(w, http.StatusOK, true, "", "", post)
}

// DELETE /api/posts/{postID}
func (h *PostHandler) HandleDeletePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	postID, ok := postPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	if err := h.postService.DeletePost(r.Context(), viewer.Id, postID); err != nil {
		writePostServiceError(w, err)
		return
	}
	writePostResponse(w, http.StatusOK, true, "post deleted", "", map[string]string{"status": "deleted"})
}

// GET /api/posts/{postID}/comments
func (h *PostHandler) HandleGetComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	postID, ok := postPathID(w, r)
	if !ok {
		return
	}
	viewer := middleware.GetUser(r)
	comments, err := h.postService.GetComments(r.Context(), viewer.Id, postID)
	if err != nil {
		writePostServiceError(w, err)
		return
	}
	writePostResponse(w, http.StatusOK, true, "", "", comments)
}

// POST /api/posts/{postID}/comments
func (h *PostHandler) HandleCreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	postID, ok := postPathID(w, r)
	if !ok {
		return
	}
	body, imagePath, err := parseCommentBody(r)
	if err != nil {
		writePostResponse(w, http.StatusBadRequest, false, "", err.Error(), nil)
		return
	}

	viewer := middleware.GetUser(r)
	comment, err := h.postService.CreateComment(r.Context(), viewer.Id, postID, body.Content, imagePath)
	if err != nil {
		writePostServiceError(w, err)
		return
	}
	writePostResponse(w, http.StatusCreated, true, "comment created", "", comment)
}

// GET /api/users/{id}/posts
func (h *PostHandler) HandleGetUserPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writePostResponse(w, http.StatusMethodNotAllowed, false, "", "method not allowed", nil)
		return
	}
	authorID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || authorID <= 0 {
		writePostResponse(w, http.StatusBadRequest, false, "", "invalid user id", nil)
		return
	}
	viewer := middleware.GetUser(r)
	var limit int
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil {
		limit = n
	}
	posts, err := h.postService.GetPostsByAuthor(r.Context(), viewer.Id, authorID, limit)
	if err != nil {
		writePostResponse(w, http.StatusInternalServerError, false, "", "could not load posts", nil)
		return
	}
	writePostResponse(w, http.StatusOK, true, "", "", posts)
}

// parsePostBody accepts either JSON or multipart/form-data (with an "image" file).
func parsePostBody(r *http.Request) (models.CreatePostRequest, string, error) {
	var body models.CreatePostRequest

	if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return body, "", errors.New("invalid form data (max 10MB)")
		}
		body.Content = r.FormValue("content")
		body.Privacy = r.FormValue("privacy")
		body.AllowedUserIDs = parseIDList(r.MultipartForm.Value["allowed_user_ids"])
		imagePath, err := saveUploadedImage(r, "image")
		if err != nil {
			return body, "", err
		}
		// Composer quick-picks send a remote image URL instead of a file.
		if imagePath == "" {
			imagePath = strings.TrimSpace(r.FormValue("image_url"))
		}
		return body, imagePath, nil
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return body, "", errors.New("invalid request body")
	}
	return body, "", nil
}

func parseCommentBody(r *http.Request) (models.CreatePostRequest, string, error) {
	var body models.CreatePostRequest

	if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return body, "", errors.New("invalid form data (max 10MB)")
		}
		body.Content = r.FormValue("content")
		imagePath, err := saveUploadedImage(r, "image")
		if err != nil {
			return body, "", err
		}
		return body, imagePath, nil
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return body, "", errors.New("invalid request body")
	}
	return body, "", nil
}

func saveUploadedImage(r *http.Request, field string) (string, error) {
	file, header, err := r.FormFile(field)
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return "", nil
		}
		return "", errors.New("invalid image upload")
	}
	defer file.Close()

	filename, err := utils.ValidateAndSaveImage(file, header, "./media")
	if err != nil {
		return "", err
	}
	return "/media/" + filename, nil
}

// parseIDList reads ids from comma separated values or repeated form fields.
func parseIDList(values []string) []int {
	ids := make([]int, 0)
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := strconv.Atoi(part)
			if err != nil || id <= 0 {
				continue
			}
			ids = append(ids, id)
		}
	}
	return ids
}

func postPathID(w http.ResponseWriter, r *http.Request) (int, bool) {
	postID, err := strconv.Atoi(r.PathValue("postID"))
	if err != nil || postID <= 0 {
		writePostResponse(w, http.StatusBadRequest, false, "", "invalid post id", nil)
		return 0, false
	}
	return postID, true
}

func writePostServiceError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := "post request failed"
	switch {
	case errors.Is(err, services.ErrPostNotVisible):
		status, message = http.StatusForbidden, services.ErrPostNotVisible.Error()
	case errors.Is(err, services.ErrNotPostAuthor):
		status, message = http.StatusForbidden, services.ErrNotPostAuthor.Error()
	case errors.Is(err, services.ErrInvalidPost),
		errors.Is(err, services.ErrInvalidComment),
		errors.Is(err, services.ErrInvalidPostPrivacy),
		errors.Is(err, services.ErrPrivateNeedsPeople):
		status, message = http.StatusBadRequest, err.Error()
	case errors.Is(err, sql.ErrNoRows):
		status, message = http.StatusNotFound, "post not found"
	}
	writePostResponse(w, status, false, "", message, nil)
}

func writePostResponse(w http.ResponseWriter, status int, success bool, message, responseError string, data any) {
	utils.WriteJSON(w, status, utils.ResposAPI{
		Success: success,
		Message: message,
		Eroor:   responseError,
		Data:    data,
	})
}
