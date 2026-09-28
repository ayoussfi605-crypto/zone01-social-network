package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"social/middlewares"
	"social/pkg/services"
	"social/utils"
)

type FollowerHandler struct {
	followerService services.FollowerService
}

func NewFollowerHandler(s services.FollowerService) *FollowerHandler {
	return &FollowerHandler{followerService: s}
}

// POST /api/users/{id}/follow-action (Kijme3 Follow w Unfollow b7al l-leader)
func (h *FollowerHandler) HandleFollowAction(w http.ResponseWriter, r *http.Request) {
	middlewares.EnableCores(w, r)
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Method Not Allowed",
		})
		return
	}

	// 1. Vérification dyal l-Session (Middleware)
	if err := utils.IsValidSeesion(r); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Invalid Token",
		})
		return
	}

	// 2. Njebdo l-ID dyal user li m-connecté
	followerID := middlewares.GetUserId(r)
	if followerID == 0 {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Unauthorized",
		})
		return
	}

	// 3. Njebdo l-ID d chakhs li ghan-followiw mn l-URL
	targetIDStr := r.PathValue("id")
	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Invalid user ID",
		})
		return
	}

	// 4. N9raw chno kayn f l-Body (action: "folow" wla "unfolow")
	var req struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Invalid payload",
		})
		return
	}

	// 5. N-executiw l-Service 3la 7sab l-Action
	if req.Action == "folow" {
		err = h.followerService.FollowUser(r.Context(), followerID, targetID)
	} else if req.Action == "unfolow" {
		err = h.followerService.UnfollowUser(r.Context(), followerID, targetID)
	} else {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Invalid action",
		})
		return
	}

	// 6. Gérer les erreurs w nsifto retour l-Frontend
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(utils.ResponseApi{
			Success: false,
			Error:   "Server error",
		})
		return
	}

	json.NewEncoder(w).Encode(utils.ResponseApi{
		Success: true,
		Message: "Action successful",
	})
}

// GET /api/users/{id}/followers
func (h *FollowerHandler) HandleGetFollowers(w http.ResponseWriter, r *http.Request) {
	middlewares.EnableCores(w, r)
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Method Not Allowed"})
		return
	}

	if err := utils.IsValidSeesion(r); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid Token"})
		return
	}

	targetIDStr := r.PathValue("id")
	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid user ID"})
		return
	}

	followers, err := h.followerService.GetFollowers(r.Context(), targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Server error"})
		return
	}

	json.NewEncoder(w).Encode(utils.ResponseApi{
		Success: true,
		Message: followers,
	})
}

// GET /api/users/{id}/following
func (h *FollowerHandler) HandleGetFollowing(w http.ResponseWriter, r *http.Request) {
	middlewares.EnableCores(w, r)
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Method Not Allowed"})
		return
	}

	if err := utils.IsValidSeesion(r); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid Token"})
		return
	}

	targetIDStr := r.PathValue("id")
	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid user ID"})
		return
	}

	following, err := h.followerService.GetFollowing(r.Context(), targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Server error"})
		return
	}

	json.NewEncoder(w).Encode(utils.ResponseApi{
		Success: true,
		Message: following,
	})
}