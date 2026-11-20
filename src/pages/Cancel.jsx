import { Link } from 'react-router-dom'

export default function Cancel() {
  return (
    <div className="container">
      <div className="card cancel-card">
        <div className="status-icon cancel">&#10007;</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. You can try again anytime.</p>
        <Link to="/" className="button">Try Again</Link>
      </div>
    </div>
  )
}
