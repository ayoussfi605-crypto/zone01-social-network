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

	// Required by the subject: enforce foreign keys.
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return nil, err
	}

	// Run migrations from this folder.
	if err := runMigrations(db, "pkg/db/migrations/sqlite"); err != nil {
		return nil, err
	}

	fmt.Println("migrations applied OK")
	return db, nil
}

// runMigrations reads every *.up.sql file in order and executes it.
func runMigrations(db *sql.DB, dir string) error {
	files, err := filepath.Glob(filepath.Join(dir, "*.up.sql"))
	if err != nil {
		return err
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