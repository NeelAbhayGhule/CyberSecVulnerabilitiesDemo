-- Run using your existing PostgreSQL role after creating the database.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- Plain-text passwords are for this isolated demonstration only.
INSERT INTO users (username, password)
VALUES ('admin', 'admin123'), ('student', 'student123')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

