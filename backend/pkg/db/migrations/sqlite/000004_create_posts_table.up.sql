CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    image_path TEXT,
    privacy TEXT NOT NULL DEFAULT 'public' CHECK (
        privacy IN ('public', 'almost_private', 'private')
    ),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_author_created
    ON posts (author_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created
    ON posts (created_at DESC, id DESC);
