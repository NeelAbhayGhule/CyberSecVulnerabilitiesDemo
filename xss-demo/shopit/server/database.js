import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)))
const dataDirectory = join(projectDirectory, 'data')
mkdirSync(dataDirectory, { recursive: true })

const database = new Database(join(dataDirectory, 'shopit.db'))

database.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

export default database