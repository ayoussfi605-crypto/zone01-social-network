package handlers

import (
	"fmt"
	"net/http"
)

func HandlerUserList(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Heloo", r, w)
}
