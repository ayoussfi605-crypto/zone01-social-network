package utils

import (
	"encoding/json"
	"net/http"
)

type ResposAPI struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Eroor   string      `json:"error"`
	Data    interface{} `json:"data"`
}

func WriteJSON(w http.ResponseWriter, status int, respose ResposAPI) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(respose)
}
