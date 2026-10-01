CREATE TABLE IF NOT EXISTS post_viewer_permissions (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,                    
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);