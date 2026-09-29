package utils

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofrs/uuid"
)

// SaveAvatar saves uploaded "avatar" file to ./media/ if jpg/png/gif.
// Returns saved path or "" if no file sent. Simple version for learning.
func SaveAvatar(r *http.Request) (string, error) {
	file, header, err := r.FormFile("avatar")
	if err != nil {
		return "", nil // no file = OK, avatar is optional
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
		return "", fmt.Errorf("avatar must be jpg, png or gif")
	}

	os.MkdirAll("./media", 0755)
	id, _ := uuid.NewV4()
	path := "./media/" + id.String() + ext

	out, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer out.Close()
	if _, err := io.Copy(out, file); err != nil {
		return "", err
	}
	return path, nil
}
