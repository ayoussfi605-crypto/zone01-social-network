package handlers

import (
	"net/http"

	"social-network-network/pkg/services"
)

type FollowerHandler struct {
	followerService services.FollowerService
}

func NewFollowerHandler(s services.FollowerService) *FollowerHandler {
	return &FollowerHandler{followerService: s}
}

// POST /api/users/{id}/follow-action
func (h *FollowerHandler) HandleFollowAction(w http.ResponseWriter, r *http.Request) {
	// middlewares.EnableCores(w, r)
	// w.Header().Set("Content-Type", "application/json")

	// if r.Method != http.MethodPost {
	// 	w.WriteHeader(http.StatusMethodNotAllowed)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Method Not Allowed",
	// 	})
	// 	return
	// }

	// // 1. Vérification Session (Middleware)
	// if err := utils.IsValidSeesion(r); err != nil {
	// 	w.WriteHeader(http.StatusUnauthorized)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Invalid Token",
	// 	})
	// 	return
	// }

	// followerID := middlewares.GetUserId(r)
	// if followerID == 0 {
	// 	w.WriteHeader(http.StatusUnauthorized)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Unauthorized",
	// 	})
	// 	return
	// }

	// targetIDStr := r.PathValue("id")
	// targetID, err := strconv.Atoi(targetIDStr)
	// if err != nil {
	// 	w.WriteHeader(http.StatusBadRequest)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Invalid user ID",
	// 	})
	// 	return
	// }

	// var req struct {
	// 	Action string `json:"action"`
	// }
	// if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
	// 	w.WriteHeader(http.StatusBadRequest)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Invalid payload",
	// 	})
	// 	return
	// }

	// if req.Action == "folow" {
	// 	err = h.followerService.FollowUser(r.Context(), followerID, targetID)
	// } else if req.Action == "unfolow" {
	// 	err = h.followerService.UnfollowUser(r.Context(), followerID, targetID)
	// } else {
	// 	w.WriteHeader(http.StatusBadRequest)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Invalid action",
	// 	})
	// 	return
	// }

	// if err != nil {
	// 	w.WriteHeader(http.StatusInternalServerError)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{
	// 		Success: false,
	// 		Error:   "Server error",
	// 	})
	// 	return
	// }

	// json.NewEncoder(w).Encode(utils.ResponseApi{
	// 	Success: true,
	// 	Message: "Action successful",
	// })
}

// GET /api/users/{id}/followers
func (h *FollowerHandler) HandleGetFollowers(w http.ResponseWriter, r *http.Request) {
	// middlewares.EnableCores(w, r)
	// w.Header().Set("Content-Type", "application/json")

	// if r.Method != http.MethodGet {
	// 	w.WriteHeader(http.StatusMethodNotAllowed)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Method Not Allowed"})
	// 	return
	// }

	// if err := utils.IsValidSeesion(r); err != nil {
	// 	w.WriteHeader(http.StatusUnauthorized)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid Token"})
	// 	return
	// }

	// targetIDStr := r.PathValue("id")
	// targetID, err := strconv.Atoi(targetIDStr)
	// if err != nil {
	// 	w.WriteHeader(http.StatusBadRequest)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid user ID"})
	// 	return
	// }

	// followers, err := h.followerService.GetFollowers(r.Context(), targetID)
	// if err != nil {
	// 	w.WriteHeader(http.StatusInternalServerError)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Server error"})
	// 	return
	// }

	// json.NewEncoder(w).Encode(utils.ResponseApi{
	// 	Success: true,
	// 	Message: followers,
	// })
}

// GET /api/users/{id}/following
func (h *FollowerHandler) HandleGetFollowing(w http.ResponseWriter, r *http.Request) {
	// middlewares.EnableCores(w, r)
	// w.Header().Set("Content-Type", "application/json")

	// if r.Method != http.MethodGet {
	// 	w.WriteHeader(http.StatusMethodNotAllowed)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Method Not Allowed"})
	// 	return
	// }

	// if err := utils.IsValidSeesion(r); err != nil {
	// 	w.WriteHeader(http.StatusUnauthorized)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid Token"})
	// 	return
	// }

	// targetIDStr := r.PathValue("id")
	// targetID, err := strconv.Atoi(targetIDStr)
	// if err != nil {
	// 	w.WriteHeader(http.StatusBadRequest)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Invalid user ID"})
	// 	return
	// }

	// following, err := h.followerService.GetFollowing(r.Context(), targetID)
	// if err != nil {
	// 	w.WriteHeader(http.StatusInternalServerError)
	// 	json.NewEncoder(w).Encode(utils.ResponseApi{Success: false, Error: "Server error"})
	// 	return
	// }

	// json.NewEncoder(w).Encode(utils.ResponseApi{
	// 	Success: true,
	// 	Message: following,
	// })
}
