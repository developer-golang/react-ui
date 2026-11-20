import { useEffect, useState } from "react";
import {
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  Minus,
  Plus,
  ShoppingBag,
  Check,
  X,
  Zap,
  Loader2,
  CreditCard,
  Landmark,
} from "lucide-react";
// http://localhost:8087
const API_BASE = "http://localhost:8087";
const API_URL = `${API_BASE}/getproducts`;
const CURRENCY = "₹";

// Razorpay order service
const RAZORPAY_API_BASE = "http://localhost:8087";
const RAZORPAY_KEY_ID = "rzp_test_TsAPP1IM2P3Md1"; // fallback if the API response has no key

const colors = [
  { name: "Olive", value: "olive", swatch: "oklch(0.55 0.06 100)" },
  { name: "Sand", value: "sand", swatch: "oklch(0.82 0.05 85)" },
  { name: "Charcoal", value: "charcoal", swatch: "oklch(0.35 0.02 70)" },
];

const perks = [
  { icon: Truck, label: "Free shipping", sub: "On orders over ₹75" },
  { icon: RotateCcw, label: "30-day returns", sub: "No questions asked" },
  { icon: ShieldCheck, label: "2-year warranty", sub: "Covered repairs" },
];

const money = (n) => `${CURRENCY}${Number(n).toFixed(2)}`;

/* ---------------- Payment helpers ---------------- */

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function startRazorpayPayment(product, quantity, { onSuccess, onError, onDismiss }) {
  try {
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error("Could not load Razorpay. Check your internet connection.");

    const total = product.price * quantity;

    // 1. Create the Razorpay order: POST localhost:4242/createorderinrazorpay
    const orderRes = await fetch(`${RAZORPAY_API_BASE}/createorderinrazorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: product.title,
        amount: total.toFixed(2), // string, e.g. "2000.02"
      }),
    });
    if (!orderRes.ok) throw new Error("Could not create Razorpay order");
    const order = await orderRes.json();

    // Accept common response shapes (raw Razorpay order or a custom one)
    const orderId = order.order_id ?? order.id;
    const keyId = order.key_id ?? order.key ?? RAZORPAY_KEY_ID;
    const amountPaise = order.amount ?? Math.round(total * 100);
    if (!orderId) throw new Error("Order id missing in response");

    const rzp = new window.Razorpay({
      key: keyId,
      amount: amountPaise,
      currency: order.currency ?? "INR",
      name: "Arden & Field",
      description: product.title,
      image: product.image,
      order_id: orderId,
      handler: async (response) => {
        try {
          const verifyRes = await fetch(`${RAZORPAY_API_BASE}/verifypayment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (!verifyRes.ok) throw new Error("Payment verification failed");
          onSuccess(response.razorpay_payment_id);
        } catch (err) {
          onError(err.message);
        }
      },
      modal: { ondismiss: onDismiss },
      theme: { color: "#3b4a22" },
    });

    rzp.on("payment.failed", (resp) => onError(resp.error?.description || "Payment failed"));
    rzp.open();
  } catch (err) {
    onError(err.message);
  }
}

async function startStripePayment(product, quantity, orderId, { onError }) {
  try {
    const res = await fetch("/api/createstripesession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        line_items: [
          {
            name: product.title,
            amount: Math.round(product.price * 100),
            currency: "inr",
            quantity,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start Stripe checkout");
    if (!data.url) throw new Error("Stripe checkout URL missing");
    window.location.href = data.url; // redirect to Stripe Checkout
  } catch (err) {
    onError(err.message);
  }
}

/* ---------------- Small components ---------------- */

function Stars({ rate }) {
  const fullStars = Math.floor(rate);
  const fraction = rate - fullStars;

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rate} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="relative block h-4 w-4">
          <Star className="absolute inset-0 h-4 w-4 text-rating/30" />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{
              width: i < fullStars ? "100%" : i === fullStars ? `${fraction * 100}%` : "0%",
            }}
          >
            <Star className="h-4 w-4 fill-rating text-rating" />
          </span>
        </span>
      ))}
    </div>
  );
}

function QtyStepper({ qty, setQty }) {
  return (
    <div className="flex items-center rounded-full border border-border bg-card">
      <button
        onClick={() => setQty((q) => Math.max(1, q - 1))}
        aria-label="Decrease quantity"
        className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-accent"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
      <button
        onClick={() => setQty((q) => Math.min(9, q + 1))}
        aria-label="Increase quantity"
        className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-accent"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function BuyNowButton({ onClick, total }) {
  return (
    <button
      onClick={onClick}
      className="flex h-12 min-w-44 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold tracking-wide text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
    >
      <Zap className="h-4 w-4" /> Buy now — {money(total)}
    </button>
  );
}

/* ---------------- Payment method chooser ---------------- */

function PaymentChooser({ product, qty, orderId, onClose, onToast, onDone }) {
  const [paying, setPaying] = useState(null); // "razorpay" | "stripe" | null

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !paying && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, paying]);

  function payWithRazorpay() {
    setPaying("razorpay");
    startRazorpayPayment(product, qty, {
      onSuccess: (paymentId) => {
        setPaying(null);
        onToast({ type: "success", text: `Payment successful! ID: ${paymentId}` });
        onDone();
      },
      onError: (msg) => {
        setPaying(null);
        onToast({ type: "error", text: msg });
      },
      onDismiss: () => setPaying(null),
    });
  }

  function payWithStripe() {
    setPaying("stripe");
    startStripePayment(product, qty, orderId, {
      onError: (msg) => {
        setPaying(null);
        onToast({ type: "error", text: msg });
      },
    });
  }

  const methods = [
    {
      key: "razorpay",
      title: "Razorpay",
      sub: "UPI, cards, net banking, wallets",
      icon: Landmark,
      onClick: payWithRazorpay,
    },
    {
      key: "stripe",
      title: "Stripe",
      sub: "Credit / debit card",
      icon: CreditCard,
      onClick: payWithStripe,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      onClick={() => !paying && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Choose payment method"
    >
      <div
        className="relative w-full max-w-md rounded-4xl bg-background p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={!!paying}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-card transition-colors hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="font-display text-2xl tracking-tight">Choose payment method</h3>

        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-panel p-3">
          <img src={product.image} alt={product.title} className="h-16 w-16 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
            <p className="text-xs text-muted-foreground">Qty {qty}</p>
          </div>
          <p className="font-display text-lg">{money(product.price * qty)}</p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {methods.map(({ key, title, sub, icon: Icon, onClick }) => (
            <button
              key={key}
              onClick={onClick}
              disabled={!!paying}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary">
                {paying === key ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Pay with {title}</span>
                <span className="block text-xs text-muted-foreground">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Product popup (Amazon style) ---------------- */

function ProductModal({ product, locked, onClose, onBuyNow }) {
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("olive");
  const [added, setAdded] = useState(false);

  const { rate = 0, count = 0 } = product.rating ?? {};

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !locked && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, locked]);

  function handleAddToCart() {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      onClick={() => !locked && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div
        className="relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-4xl bg-background shadow-2xl md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card shadow transition-colors hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-center bg-panel p-8 md:min-h-[480px]">
          <img
            src={product.image}
            alt={product.title}
            className="h-64 w-auto max-w-full object-contain drop-shadow-xl md:h-80"
          />
        </div>

        <div className="flex flex-col p-6 md:p-8">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {product.category}
          </p>
          <h2 className="mt-2 pr-10 font-display text-2xl leading-tight tracking-tight">
            {product.title}
          </h2>

          <div className="mt-3 flex items-center gap-3">
            <Stars rate={rate} />
            <span className="text-sm font-medium">{rate}</span>
            <span className="text-sm text-muted-foreground">({count} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3 border-y border-border py-4">
            <span className="font-display text-3xl">{money(product.price)}</span>
            <span className="text-sm text-muted-foreground">incl. taxes</span>
          </div>

          <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">
              Color{" "}
              <span className="font-normal text-muted-foreground">
                — {colors.find((c) => c.value === color)?.name}
              </span>
            </p>
            <div className="flex gap-3">
              {colors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  aria-label={c.name}
                  aria-pressed={color === c.value}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === c.value
                      ? "scale-110 border-primary"
                      : "border-transparent hover:border-border"
                  }`}
                  style={{ backgroundColor: c.swatch }}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QtyStepper qty={qty} setQty={setQty} />
            <button
              onClick={handleAddToCart}
              className="flex h-12 min-w-36 flex-1 items-center justify-center gap-2 rounded-full border border-primary px-6 text-sm font-semibold transition-colors hover:bg-accent"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Add to cart
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex">
            <BuyNowButton onClick={() => onBuyNow(product, qty)} total={product.price * qty} />
          </div>

          <ul className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [modalProduct, setModalProduct] = useState(null);
  const [checkout, setCheckout] = useState(null); // { product, qty }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [color, setColor] = useState("olive");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(API_URL, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request Cou(${res.status})`);

        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data ?? [];

        setProducts(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        console.log(err.name,"err.name");
        
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function handleAddToCart() {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  async function createOrder(product, quantity) {
    const res = await fetch("/createorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: 1,
        product_id: product.id,
        order_status: "PENDING",
        order_created_date: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Could not create order");
    }
    const data = await res.json();
    if (!data.order_id) throw new Error("Order id missing in response");
    return String(data.order_id);
  }

  async function openCheckout(p, quantity) {
    try {
      const orderId = await createOrder(p, quantity);
      setCheckout({ product: p, qty: quantity, orderId });
    } catch (err) {
      setToast({ type: "error", text: err.message || "Could not create order" });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-red-600">
        Failed to load products: {error}
      </div>
    );
  }

  const product = products.find((p) => p.id === selectedId);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        No products found.
      </div>
    );
  }

  const { rate = 0, count = 0 } = product.rating ?? {};

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-2xl tracking-tight">Arden &amp; Field</span>
          <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Gear for life outdoors
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 pb-24 lg:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-4xl bg-panel p-8 lg:sticky lg:top-8 lg:min-h-[560px]">
            <img
              key={product.id}
              src={product.image}
              alt={product.title}
              className="relative h-[360px] w-auto max-w-full object-contain drop-shadow-xl lg:h-[480px]"
            />
            <span className="absolute top-6 left-6 rounded-full bg-primary px-4 py-1.5 text-xs font-medium tracking-wide text-primary-foreground uppercase">
              In stock
            </span>
          </div>

          <div className="flex flex-col">
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {product.category}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-[1.15] tracking-tight text-balance lg:text-4xl">
              {product.title}
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <Stars rate={rate} />
              <span className="text-sm font-medium">{rate}</span>
              <span className="text-sm text-muted-foreground">({count} reviews)</span>
            </div>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-4xl">{money(product.price)}</span>
              <span className="text-sm text-muted-foreground">incl. taxes</span>
            </div>

            <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <div className="mt-8">
              <p className="mb-3 text-sm font-medium">
                Color{" "}
                <span className="font-normal text-muted-foreground">
                  — {colors.find((c) => c.value === color)?.name}
                </span>
              </p>
              <div className="flex gap-3">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    aria-label={c.name}
                    aria-pressed={color === c.value}
                    className={`h-9 w-9 rounded-full border-2 transition-all ${
                      color === c.value
                        ? "scale-110 border-primary"
                        : "border-transparent hover:border-border"
                    }`}
                    style={{ backgroundColor: c.swatch }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <QtyStepper qty={qty} setQty={setQty} />
              <button
                onClick={handleAddToCart}
                className="flex h-12 min-w-44 flex-1 items-center justify-center gap-2 rounded-full border border-primary px-8 text-sm font-semibold tracking-wide transition-colors hover:bg-accent"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Add to cart
                  </>
                )}
              </button>
              <BuyNowButton onClick={() => openCheckout(product, qty)} total={product.price * qty} />
            </div>

            <ul className="mt-10 grid gap-5 border-t border-border pt-8 sm:grid-cols-3">
              {perks.map(({ icon: Icon, label, sub }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section className="mt-24">
          <h2 className="font-display text-3xl tracking-tight">More products</h2>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setModalProduct(p)}
                className="group flex flex-col rounded-3xl border border-border bg-card p-4 text-left transition-all hover:shadow-md"
              >
                <div className="flex h-44 items-center justify-center rounded-2xl bg-panel p-4">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-full w-auto object-contain transition-transform group-hover:scale-105"
                  />
                </div>
                <p className="mt-4 text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
                  {p.category}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{p.title}</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="font-display text-lg">{money(p.price)}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-rating text-rating" />
                    {p.rating?.rate ?? 0}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Arden &amp; Field — Gear for life outdoors.
      </footer>

      {modalProduct && (
        <ProductModal
          key={modalProduct.id}
          product={modalProduct}
          locked={!!checkout}
          onClose={() => setModalProduct(null)}
          onBuyNow={openCheckout}
        />
      )}

      {checkout && (
        <PaymentChooser
          product={checkout.product}
          qty={checkout.qty}
          orderId={checkout.orderId}
          onClose={() => setCheckout(null)}
          onToast={setToast}
          onDone={() => {
            setCheckout(null);
            setModalProduct(null);
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-primary text-primary-foreground" : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}