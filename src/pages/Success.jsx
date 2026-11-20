import { Link, useSearchParams } from "react-router-dom";

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="card success-card">
        <div className="status-icon success">&#10003;</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for your purchase. You're all set.</p>

        <Link to="/" className="button">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
