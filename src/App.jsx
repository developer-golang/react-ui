import { Routes, Route } from 'react-router-dom'
import Checkout from './pages/Checkout.jsx'
import Success from './pages/Success.jsx'
import Cancel from './pages/Cancel.jsx'
import RazorpayCheckout from './pages/RazorpayCheckout.jsx'
import ProductPage from './pages/ProductPage.jsx'
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProductPage />} />
      <Route path="/razorpay" element={<RazorpayCheckout />} />
      <Route path="/stripe" element={<Checkout />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
    </Routes>
  )
}
