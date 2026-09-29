package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// ValidateAndSaveImage checks the file extension and saves the image to the disk
func ValidateAndSaveImage(file multipart.File, header *multipart.FileHeader, destFolder string) (string, error) {
	// 1. Check file size (Max 5MB)
	if header.Size > 5<<20 {
		return "", fmt.Errorf("image size cannot exceed 5MB")
	}

	// 2. Read the file header to detect the actual mime type
	buffer := make([]byte, 512)
	if _, err := file.Read(buffer); err != nil {
		return "", fmt.Errorf("unable to inspect file headers")
	}

	mimeType := http.DetectContentType(buffer)

	// Task 0.2: Validate image types (JPEG, PNG, GIF)
	allowedMimeTypes := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/gif":  ".gif",
	}

	extension, ok := allowedMimeTypes[mimeType]
	if !ok {
		return "", fmt.Errorf("only JPG, PNG, and GIF images are permitted")
	}

	// Reset the file pointer to the beginning before copying
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("failed to reset file pointer")
	}

	// 3. Create the destination directory if it does not exist
	if err := os.MkdirAll(destFolder, 0o755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// 4. Generate a new UUID for the file name and save it
	fileName := uuid.NewString() + extension
	filePath := filepath.Join(destFolder, fileName)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath) // Remove the file if an error occurs during copy
		return "", fmt.Errorf("failed to save image: %w", err)
	}

	return fileName, nil
}