import { useState, useEffect } from 'react'

export default function RazorpayCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  
  // Interactive fields
  const [amount, setAmount] = useState(499) // default to ₹499
  const [plan, setPlan] = useState('standard') // standard, pro, custom
  const [customAmount, setCustomAmount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')
  
  // Post-payment state
  const [paymentSuccess, setPaymentSuccess] = useState(null) // holds response if successful
  const [paymentHistory, setPaymentHistory] = useState([])

  // FAQ accordion state
  const [faqOpen, setFaqOpen] = useState({ 0: false, 1: false, 2: false })

  // Dynamically load Razorpay SDK script
  useEffect(() => {
    const scriptId = 'razorpay-checkout-sdk'
    if (document.getElementById(scriptId)) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      setError('Failed to load Razorpay payment gateway SDK. Please check your internet connection.')
      setScriptLoaded(false)
    }
    document.body.appendChild(script)

    return () => {
      // Keep script loaded to avoid re-fetching, but clean up is optional
    }
  }, [])

  // Handle Plan Change
  const handlePlanChange = (selectedPlan) => {
    setPlan(selectedPlan)
    setPromoCode('')
    setDiscount(0)
    setPromoError('')
    setPromoSuccess('')
    if (selectedPlan === 'standard') {
      setAmount(499)
    } else if (selectedPlan === 'pro') {
      setAmount(999)
    } else {
      setAmount(customAmount ? parseFloat(customAmount) || 0 : 100)
    }
  }

  // Handle custom amount input
  const handleCustomAmountChange = (e) => {
    const val = e.target.value
    setCustomAmount(val)
    if (plan === 'custom') {
      setAmount(val ? parseFloat(val) || 0 : 0)
    }
  }

  // Apply Coupon / Promo Code
  const applyPromo = () => {
    setPromoError('')
    setPromoSuccess('')
    if (!promoCode.trim()) {
      setPromoError('Please enter a coupon code.')
      return
    }
    const code = promoCode.toUpperCase().trim()
    if (code === 'WELCOME10') {
      const disc = Math.round(amount * 0.1)
      setDiscount(disc)
      setPromoSuccess(`WELCOME10 applied! You saved ₹${disc} (10% Off).`)
    } else if (code === 'SUPER30') {
      const disc = Math.round(amount * 0.3)
      setDiscount(disc)
      setPromoSuccess(`SUPER30 applied! You saved ₹${disc} (30% Off).`)
    } else {
      setPromoError('Invalid coupon code. Try WELCOME10 or SUPER30.')
    }
  }

  const finalAmount = Math.max(1, amount - discount)

  const handleRazorpayPayment = async () => {
    if (!scriptLoaded) {
      setError('Razorpay SDK is not loaded yet. Please try again in a moment.')
      return
    }

    if (finalAmount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    setLoading(true)
    setError('')
    setPaymentSuccess(null)

    try {
      // 1. Create order on Go Backend
      const res = await fetch('/createorderinrazorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(finalAmount)
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to create order on server')
      }

      const orderData = await res.json()
      
      // 2. Configure Razorpay checkout options
      const options = {
        key: 'rzp_test_TNKFGGow4fnEXR', // Matches Go Backend Client Key
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'Golang Premium Course',
        description: plan === 'standard' 
          ? 'Standard Tier - Razorpay Checkout Integration'
          : plan === 'pro'
            ? 'Pro Tier - Full Access Course Bundle'
            : 'Custom Contribution Package',
        image: 'https://img.icons8.com/color/120/golang.png',
        order_id: orderData.id,
        handler: function (response) {
          // Success callback
          const successDetails = {
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            amountPaid: finalAmount,
            planName: plan === 'standard' ? 'Standard Tier' : plan === 'pro' ? 'Pro Tier' : 'Custom Plan',
            timestamp: new Date().toLocaleTimeString(),
          }
          setPaymentSuccess(successDetails)
          setPaymentHistory(prev => [successDetails, ...prev])
          setLoading(false)
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes: {
          address: 'Razorpay Integration Demo Office',
          merchant_defined_field: 'Go + React standard implementation'
        },
        theme: {
          color: '#528ffc', // Premium Blue color
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
          }
        }
      }

      // 3. Open Razorpay payment modal
      const rzp1 = new window.Razorpay(options)
      rzp1.open()

    } catch (err) {
      setError(err.message || 'An error occurred during checkout setup')
      setLoading(false)
    }
  }

  const toggleFaq = (idx) => {
    setFaqOpen(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Modern styles object
  const styles = {
    wrapper: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#f8fafc',
      padding: '3rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2.5rem',
    },
    logo: {
      width: '70px',
      height: '70px',
      marginBottom: '1rem',
      animation: 'pulse 2s infinite',
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '800',
      background: 'linear-gradient(to right, #38bdf8, #818cf8)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '0.5rem',
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '1rem',
      maxWidth: '500px',
    },
    mainContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '2.5rem',
      width: '100%',
      maxWidth: '1000px',
    },
    card: {
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      padding: '2.25rem',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    },
    formGroup: {
      marginBottom: '1.25rem',
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#cbd5e1',
      marginBottom: '0.5rem',
    },
    input: {
      width: '100%',
      padding: '0.85rem 1rem',
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      color: '#ffffff',
      fontSize: '1rem',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      outline: 'none',
    },
    radioGroup: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '0.75rem',
      marginBottom: '1.5rem',
    },
    radioBtn: (active) => ({
      padding: '0.85rem 0.5rem',
      textAlign: 'center',
      background: active ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'rgba(15, 23, 42, 0.4)',
      border: active ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: '600',
      color: active ? '#ffffff' : '#94a3b8',
      transition: 'all 0.2s ease',
      boxShadow: active ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
    }),
    badge: {
      display: 'inline-block',
      padding: '0.25rem 0.6rem',
      fontSize: '0.75rem',
      fontWeight: '700',
      background: '#10b981',
      color: '#ffffff',
      borderRadius: '20px',
      marginBottom: '0.5rem',
    },
    summaryItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.6rem 0',
      fontSize: '0.95rem',
      color: '#94a3b8',
    },
    totalItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.25rem 0 0',
      marginTop: '1rem',
      borderTop: '2px dashed rgba(255, 255, 255, 0.1)',
      fontSize: '1.35rem',
      fontWeight: '800',
      color: '#ffffff',
    },
    btnPay: {
      width: '100%',
      padding: '1.1rem',
      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1.1rem',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
      transition: 'all 0.2s ease',
      marginTop: '1.5rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0.5rem',
    },
    btnPromo: {
      background: 'rgba(99, 102, 241, 0.2)',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      color: '#e0e7ff',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '0.85rem',
      transition: 'all 0.2s ease',
    },
    promoInputWrapper: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '0.5rem',
    },
    trustBadgeContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1.5rem',
      marginTop: '1.5rem',
      fontSize: '0.8rem',
      color: '#64748b',
    },
    faqSection: {
      width: '100%',
      maxWidth: '1000px',
      marginTop: '4rem',
    },
    faqItem: {
      background: 'rgba(30, 41, 59, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '10px',
      marginBottom: '0.75rem',
      overflow: 'hidden',
    },
    faqHeader: {
      padding: '1rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      fontWeight: '600',
      background: 'rgba(30, 41, 59, 0.6)',
    },
    faqContent: {
      padding: '1rem 1.5rem',
      color: '#94a3b8',
      fontSize: '0.9rem',
      lineHeight: '1.5',
      background: 'rgba(15, 23, 42, 0.2)',
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* Brand Header */}
      <header style={styles.header}>
        <img 
          src="https://img.icons8.com/color/120/golang.png" 
          alt="Go Language Logo" 
          style={styles.logo}
        />
        <h1 style={styles.title}>Razorpay Smart Checkout</h1>
        <p style={styles.subtitle}>
          Secure, lighting-fast payment processing powered by Razorpay. Experience customized checkout options in Indian Rupees (INR).
        </p>
      </header>

      {/* Main Payment Interface */}
      <div style={styles.mainContainer}>
        
        {/* Left Side: Setup & Billing Info */}
        <div style={styles.card}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1.5rem', color: '#60a5fa' }}>
            1. Select Plan & Customize
          </h2>

          {/* Plan Selector Grid */}
          <div style={styles.radioGroup}>
            <button 
              style={styles.radioBtn(plan === 'standard')} 
              onClick={() => handlePlanChange('standard')}
            >
              Standard Tier
              <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>₹499</div>
            </button>
            <button 
              style={styles.radioBtn(plan === 'pro')} 
              onClick={() => handlePlanChange('pro')}
            >
              Pro Tier
              <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>₹999</div>
            </button>
            <button 
              style={styles.radioBtn(plan === 'custom')} 
              onClick={() => handlePlanChange('custom')}
            >
              Custom Pay
              <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>Custom</div>
            </button>
          </div>

          {/* Custom Amount input field if Plan is Custom */}
          {plan === 'custom' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Enter Payment Amount (INR)</label>
              <input 
                type="number" 
                min="10" 
                max="100000" 
                style={styles.input} 
                value={customAmount} 
                onChange={handleCustomAmountChange}
                placeholder="Enter custom amount in ₹"
              />
            </div>
          )}

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '2rem', marginBottom: '1.5rem', color: '#60a5fa' }}>
            2. Customer Information
          </h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input 
              type="text" 
              style={styles.input} 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
              placeholder="e.g. Karthikeyan"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              style={styles.input} 
              value={customerEmail} 
              onChange={(e) => setCustomerEmail(e.target.value)} 
              placeholder="e.g. karthikeyan@example.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number</label>
            <input 
              type="tel" 
              style={styles.input} 
              value={customerPhone} 
              onChange={(e) => setCustomerPhone(e.target.value)} 
              placeholder="e.g. 9999999999"
            />
          </div>
        </div>

        {/* Right Side: Order Summary & Checkout Trigger */}
        <div style={styles.card}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1.5rem', color: '#818cf8' }}>
            Order Summary
          </h2>

          <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <img src="https://img.icons8.com/color/48/golang.png" alt="Mini Go logo" />
              <div>
                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                  {plan === 'standard' ? 'Go Standard Course' : plan === 'pro' ? 'Go Pro Course Pack' : 'Custom Contribution'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Lifetime Access • Digital Delivery</div>
              </div>
            </div>

            {/* Price breakdown */}
            <div style={styles.summaryItem}>
              <span>Subtotal</span>
              <span>₹{amount}.00</span>
            </div>

            {discount > 0 && (
              <div style={{ ...styles.summaryItem, color: '#10b981' }}>
                <span>Discount Code</span>
                <span>-₹{discount}.00</span>
              </div>
            )}

            <div style={styles.summaryItem}>
              <span>Platform Service Fee (0%)</span>
              <span>₹0.00</span>
            </div>

            <div style={styles.totalItem}>
              <span>Total amount</span>
              <span style={{ color: '#38bdf8' }}>₹{finalAmount}.00</span>
            </div>
          </div>

          {/* Promo Code Fields */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ ...styles.label, marginBottom: '0.25rem' }}>Apply Promo Coupon</label>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Try <strong style={{ color: '#818cf8' }}>WELCOME10</strong> (10% off) or <strong style={{ color: '#818cf8' }}>SUPER30</strong> (30% off)</span>
            <div style={styles.promoInputWrapper}>
              <input 
                type="text" 
                placeholder="ENTER COUPON" 
                style={{ ...styles.input, flex: 1, padding: '0.6rem', fontSize: '0.9rem' }} 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button style={styles.btnPromo} onClick={applyPromo}>Apply</button>
            </div>
            {promoError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{promoError}</p>}
            {promoSuccess && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem' }}>{promoSuccess}</p>}
          </div>

          {/* Secure Payment trigger */}
          <button 
            style={{ 
              ...styles.btnPay, 
              opacity: loading ? 0.7 : 1, 
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#4b5563' : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(59, 130, 246, 0.3)'
            }} 
            onClick={handleRazorpayPayment} 
            disabled={loading}
          >
            {loading ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px', fill: 'none', stroke: '#ffffff' }} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="4"></circle>
                  <path stroke="#ffffff" strokeWidth="4" strokeLinecap="round" d="M4 12a8 8 0 018-8"></path>
                </svg>
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                </svg>
                <span>Pay Securely ₹{finalAmount}.00</span>
              </>
            )}
          </button>

          {error && <div style={{ color: '#ef4444', marginTop: '1.25rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

          {/* Trust Guarantees */}
          <div style={styles.trustBadgeContainer}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              🛡️ Secured by Razorpay
            </span>
            <span>•</span>
            <span>⚡ Instant Activation</span>
            <span>•</span>
            <span>↩️ 14-Day Refund</span>
          </div>
        </div>

      </div>

      {/* Dynamic Success Panel */}
      {paymentSuccess && (
        <div style={{
          marginTop: '3rem',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          borderRadius: '16px',
          padding: '2rem',
          width: '100%',
          maxWidth: '1000px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#ffffff'
            }}>✓</div>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', margin: 0 }}>Payment Verification Succeeded!</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '4px 0 0' }}>The transaction has been successfully processed and verified.</p>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            background: 'rgba(15, 23, 42, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginTop: '1rem',
            fontSize: '0.9rem'
          }}>
            <div>
              <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem' }}>RAZORPAY PAYMENT ID</span>
              <strong style={{ color: '#ffffff', wordBreak: 'break-all' }}>{paymentSuccess.paymentId}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem' }}>RAZORPAY ORDER ID</span>
              <strong style={{ color: '#ffffff', wordBreak: 'break-all' }}>{paymentSuccess.orderId}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem' }}>AMOUNT PAID</span>
              <strong style={{ color: '#10b981' }}>₹{paymentSuccess.amountPaid}.00</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem' }}>STATUS</span>
              <strong style={{ color: '#10b981' }}>COMPLETED</strong>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History if items exist */}
      {paymentHistory.length > 0 && (
        <div style={{ width: '100%', maxWidth: '1000px', marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem', color: '#cbd5e1' }}>
            Transaction History (This Session)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {paymentHistory.map((hist, index) => (
              <div 
                key={index} 
                style={{ 
                  background: 'rgba(30, 41, 59, 0.3)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: '10px', 
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem'
                }}
              >
                <div>
                  <span style={{ color: '#f8fafc', fontWeight: '600' }}>{hist.planName}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '10px' }}>{hist.timestamp}</span>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>ID: {hist.paymentId}</div>
                </div>
                <div style={{ color: '#10b981', fontWeight: '700', fontSize: '1.05rem' }}>
                  + ₹{hist.amountPaid}.00
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section style={styles.faqSection}>
        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center', color: '#cbd5e1' }}>
          Frequently Asked Questions
        </h3>
        
        <div style={styles.faqItem}>
          <div style={styles.faqHeader} onClick={() => toggleFaq(0)}>
            <span>How do I complete the Razorpay test payment?</span>
            <span>{faqOpen[0] ? '▲' : '▼'}</span>
          </div>
          {faqOpen[0] && (
            <div style={styles.faqContent}>
              Since this is in Test Mode, you can use test credentials provided by Razorpay. Under card options, use standard Razorpay test card numbers or select NetBanking / UPI simulated flows to complete payment without actual money.
            </div>
          )}
        </div>

        <div style={styles.faqItem}>
          <div style={styles.faqHeader} onClick={() => toggleFaq(1)}>
            <span>Can I customize the payment amount?</span>
            <span>{faqOpen[1] ? '▲' : '▼'}</span>
          </div>
          {faqOpen[1] && (
            <div style={styles.faqContent}>
              Yes! Use the &quot;Custom Pay&quot; plan button, which opens up an input field allowing you to enter any amount in INR from ₹10 to ₹1,00,000.
            </div>
          )}
        </div>

        <div style={styles.faqItem}>
          <div style={styles.faqHeader} onClick={() => toggleFaq(2)}>
            <span>Are payments secure?</span>
            <span>{faqOpen[2] ? '▲' : '▼'}</span>
          </div>
          {faqOpen[2] && (
            <div style={styles.faqContent}>
              Absolutely. We use Razorpay&apos;s TLS-encrypted, PCI-DSS compliant checkout overlay. Your payment details are securely processed directly on Razorpay servers and never touch our servers.
            </div>
          )}
        </div>
      </section>

      {/* Embedded CSS animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.4)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 15px rgba(129, 140, 248, 0.6)); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
