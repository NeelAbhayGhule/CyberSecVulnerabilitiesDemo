
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

INSERT INTO products (id, name, description)
VALUES
    (1, 'Notebook', 'A simple ruled notebook.'),
    (2, 'Pen', 'A blue ballpoint pen.'),
    (3, 'Backpack', 'A lightweight everyday backpack.')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);


INSERT INTO users (username, password)
VALUES ('admin', 'admin123'), ('student', 'student123')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;
