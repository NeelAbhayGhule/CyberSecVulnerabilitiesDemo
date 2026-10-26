import { useState } from 'react'
import './App.css'

const initialReviews = [
  { name: 'Aarav Mehta', rating: 5, comment: 'Fast and reliable for work and study.' },
  { name: 'Priya Shah', rating: 4, comment: 'Good display and battery life. Great value.' },
  { name: 'Rohan Das', rating: 4, comment: 'The laptop feels solid and runs smoothly.' },
]

function App() {
  const [quantity, setQuantity] = useState(1)
  const [cartCount, setCartCount] = useState(0)
  const [reviews, setReviews] = useState(initialReviews)
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')

  function submitReview(event) {
    event.preventDefault()
    setReviews([
      { name: reviewName.trim(), rating: Number(reviewRating), comment: reviewComment.trim() },
      ...reviews,
    ])
    setReviewName('')
    setReviewRating('5')
    setReviewComment('')
  }

  return (
    <div className="page">
      <header className="site-header">
        <a className="brand" href="#top">ShopShield</a>
        <div className="cart" aria-live="polite">Cart ({cartCount})</div>
      </header>

      <main id="top">
        <section className="product">
          <div className="product-image-wrap">
            <img
              className="product-image"
              src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80"
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
          <div className="review-list">
            {reviews.map((review, index) => (
              <article className="review" key={`${review.name}-${index}`}>
                <div className="review-heading">
                  <h3>{review.name}</h3>
                  <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} ({review.rating}/5)</span>
                </div>
                <p>{review.comment}</p>
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

export default App
