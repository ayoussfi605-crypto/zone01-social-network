package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// ResolveMediaDir returns the configured or resolved media folder path.
func ResolveMediaDir() string {
	if dir := os.Getenv("MEDIA_DIR"); dir != "" {
		return dir
	}
	if info, err := os.Stat("./media"); err == nil && info.IsDir() {
		return "./media"
	}
	if info, err := os.Stat("./backend/media"); err == nil && info.IsDir() {
		return "./backend/media"
	}
	return "./media"
}

// DeleteMediaFile safely removes a media file given its relative URL (e.g. "/media/xyz.jpg").
func DeleteMediaFile(imagePath string) {
	if !strings.HasPrefix(imagePath, "/media/") {
		return
	}
	fileName := filepath.Base(imagePath)
	if fileName == "" || fileName == "." || fileName == ".." {
		return
	}
	mediaDir := ResolveMediaDir()
	filePath := filepath.Join(mediaDir, fileName)
	_ = os.Remove(filePath)
}

// ValidateAndSaveImage checks the file extension and saves the image to the disk
func ValidateAndSaveImage(file multipart.File, header *multipart.FileHeader, destFolder string) (string, error) {
	// 1. Check file size (Max 5MB)
	if header.Size > 5<<20 {
		return "", fmt.Errorf("image size cannot exceed 5MB")
	}

	// 2. Read the file header to detect the actual mime type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("unable to inspect file headers")
	}
	if n == 0 {
		return "", fmt.Errorf("image file is empty")
	}

	mimeType := http.DetectContentType(buffer[:n])

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