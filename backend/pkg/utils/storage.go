package utils

import (
	"errors"
	"net/http"
)

// SaveAvatar saves an optional avatar after validating its content and size.
func SaveAvatar(r *http.Request) (string, error) {
	file, header, err := r.FormFile("avatar")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return "", nil
		}
		return "", err
	}
	defer file.Close()

	filename, err := ValidateAndSaveImage(file, header, "./media")
	if err != nil {
		return "", err
	}
	return "/media/" + filename, nil
}
