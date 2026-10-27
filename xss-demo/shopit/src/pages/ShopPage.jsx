import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

function ShopPage({ educationalDemo, renderReviewComment }) {
  const [quantity, setQuantity] = useState(1)
  const [cartCount, setCartCount] = useState(0)
  const [reviews, setReviews] = useState([])
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch('/api/reviews')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Could not load reviews.')
        }
        setReviews(data)
      } catch {
        setReviewError('Could not load reviews. Please try again later.')
      }
    }

    loadReviews()
  }, [])

  async function submitReview(event) {
    event.preventDefault()
    setReviewError('')

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reviewName.trim(),
          rating: Number(reviewRating),
          comment: reviewComment.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Could not submit review.')
      }

      setReviews((currentReviews) => [data, ...currentReviews])
      setReviewName('')
      setReviewRating('5')
      setReviewComment('')
    } catch (error) {
      setReviewError(error.message || 'Could not submit review. Please try again.')
    }
  }

  return (
    <div className="page">
      <header className="site-header">
        <a className="brand" href="#top">ShopIt</a>
        <nav className="page-mode-nav" aria-label="Stored XSS pages">
          <NavLink to="/secure">Secure</NavLink>
          <NavLink to="/unsecure">Unsecure demo</NavLink>
        </nav>
        <div className="cart" aria-live="polite">Cart ({cartCount})</div>
      </header>

      <main id="top">
        {educationalDemo?.(reviews, {
          refreshReviews: async () => {
            const response = await fetch('/api/reviews')
            const data = await response.json()

            if (!response.ok) {
            throw new Error(data.error || 'Could not load reviews.')
            }

            setReviews(data)
            return data
          },
        })}
        <section className="product">
          <div className="product-image-wrap">
            <img
              className="product-image"
              src="/laptop.png"
              alt="Open silver laptop on a desk"
            />
          </div>
          <div className="product-info">
            <p className="eyebrow">Laptop</p>
            <h1>ProBook X15</h1>
            <p className="rating"><span aria-label="4.5 out of 5 stars">★★★★☆</span> 4.5/5</p>
            <p className="description">
              A dependable everyday laptop for classes, creative projects, and work.
            </p>
            <div className="price-line">
              <strong>₹74,999</strong>
              <del>₹84,999</del>
            </div>
            <div className="specifications">
              <h2>Specifications</h2>
              <dl>
                <div><dt>Processor</dt><dd>Intel Core i5</dd></div>
                <div><dt>RAM</dt><dd>16 GB</dd></div>
                <div><dt>Storage</dt><dd>512 GB SSD</dd></div>
                <div><dt>Display</dt><dd>15.6-inch Full HD</dd></div>
              </dl>
            </div>
            <div className="purchase-row">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
              />
              <button type="button" onClick={() => setCartCount(cartCount + quantity)}>
                Add to Cart
              </button>
            </div>
          </div>
        </section>

        <section className="reviews" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading">Customer reviews</h2>
          {reviewError && <p className="review-error" role="alert">{reviewError}</p>}
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review" key={review.id}>
                <div className="review-heading">
                  <h3>{review.name}</h3>
                  <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} ({review.rating}/5)</span>
                </div>
                {renderReviewComment
                  ? renderReviewComment(review.comment, review)
                  : <p>{review.comment}</p>}
              </article>
            ))}
          </div>

          <form className="review-form" onSubmit={submitReview}>
            <h3>Write a review</h3>
            <div className="form-row">
              <label>
                Name
                <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} required />
              </label>
              <label>
                Rating
                <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)}>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>
            </div>
            <label>
              Comment
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows="3"
                required
              />
            </label>
            <button type="submit">Submit review</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default ShopPage