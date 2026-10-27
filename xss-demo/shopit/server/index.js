import express from 'express'
import { env } from 'node:process'
import database from './database.js'

const app = express()
const port = Number(env.PORT) || 3001

app.use(express.json({ limit: '10kb' }))

app.get('/api/reviews', (request, response, next) => {
  try {
    const reviews = database
      .prepare('SELECT id, name, rating, comment, created_at FROM reviews ORDER BY created_at DESC, id DESC')
      .all()
    response.json(reviews)
  } catch (error) {
    next(error)
  }
})

app.post('/api/reviews', (request, response, next) => {
  const { name, rating, comment } = request.body ?? {}
  const cleanName = typeof name === 'string' ? name.trim() : ''
  const cleanComment = typeof comment === 'string' ? comment.trim() : ''

  if (!cleanName || !cleanComment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return response.status(400).json({ error: 'Name, a rating from 1 to 5, and comment are required.' })
  }

  if (cleanName.length > 100 || cleanComment.length > 2000) {
    return response.status(400).json({ error: 'Name must be 100 characters or fewer and comment 2000 or fewer.' })
  }

  try {
    const result = database
      .prepare('INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)')
      .run(cleanName, rating, cleanComment)
    const review = database
      .prepare('SELECT id, name, rating, comment, created_at FROM reviews WHERE id = ?')
      .get(result.lastInsertRowid)

    response.status(201).json(review)
  } catch (error) {
    next(error)
  }
})

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'Request body is too large.' })
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'Request body must be valid JSON.' })
  }

  console.error('API request failed:', error)
  response.status(500).json({ error: 'Internal server error.' })
})

app.listen(port, () => {
  console.log(`ShopIt API listening on http://localhost:${port}`)
})