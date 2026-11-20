import { useState } from 'react'

export default function Checkout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/createstripesession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_items: [
            { name: 'Golang Course', amount: 1500, currency: 'usd', quantity: 2 },
          ],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Stripe Checkout Demo</h1>
        <div className="product">
          <h2>Golang Course</h2>
          <p className="price">$15.00</p>
          <p className="note">Quantity: 2</p>
        </div>
        <button className="button primary" onClick={handleCheckout} disabled={loading}>
          {loading ? 'Redirecting to Stripe...' : 'Pay Now'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
