package sqlite

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	_ "github.com/mattn/go-sqlite3"
)

// Init opens the DB, enables foreign keys, runs .up.sql migrations.
func Init(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	// SQLite works best with a single writer connection
	// for this application.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	_, err = db.Exec(`
		PRAGMA foreign_keys = ON;
		PRAGMA busy_timeout = 5000;
		PRAGMA journal_mode = WAL;
	`)
	if err != nil {
		db.Close()
		return nil, err
	}

	migrationDir, err := findMigrationDir()
	if err != nil {
		db.Close()
		return nil, err
	}

	if err := runMigrations(db, migrationDir); err != nil {
		db.Close()
		return nil, err
	}

	fmt.Println("migrations applied OK")

	return db, nil
}

func findMigrationDir() (string, error) {
	root, err := FindProjectRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "pkg", "db", "migrations", "sqlite"), nil
}

func FindProjectRoot() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for dir := cwd; ; dir = filepath.Dir(dir) {
		candidate := filepath.Join(dir, "pkg", "db", "migrations", "sqlite")
		files, err := filepath.Glob(filepath.Join(candidate, "*.up.sql"))
		if err != nil {
			return "", err
		}
		if len(files) > 0 {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
	}

	return "", fmt.Errorf("could not find SQLite migrations from %q", cwd)
}

// runMigrations reads every *.up.sql file in order and executes it.
func runMigrations(db *sql.DB, dir string) error {
	files, err := filepath.Glob(filepath.Join(dir, "*.up.sql"))
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no SQLite migrations found in %q", dir)
	}
	sort.Strings(files) // 000001 runs before 000002

	for _, f := range files {
		sqlBytes, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		fmt.Println("applying:", f)
		if _, err := db.Exec(string(sqlBytes)); err != nil {
			return fmt.Errorf("migration %s failed: %w", f, err)
		}
	}
	return nil
}
