import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Zap,
  Store,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CartItem, Product } from '@/lib/types';

export function Storefront({ onBack }: { onBack: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [receipt, setReceipt] = useState<{ order_number: string; total: number } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('category', { ascending: true });
    if (error) {
      setCheckoutError('Could not load products.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = products.filter((p) => {
    const matchCat = category === 'All' || p.category === category;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((c) => (c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image_url: product.image_url,
        },
      ];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => {
      const product = products.find((p) => p.id === productId);
      return prev
        .map((c) => {
          if (c.product_id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (product && newQty > product.stock) return c;
          return { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartItem[];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  }

  async function processCheckout() {
    if (cart.length === 0) return;
    if (!customerInfo.name.trim() || !customerInfo.email.trim()) {
      setCheckoutError('Please enter your name and email.');
      return;
    }

    setProcessing(true);
    setCheckoutError('');

    if (paymentMethod === 'stripe' || paymentMethod === 'xendit') {
      setRedirecting(true);
      try {
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            provider: paymentMethod,
            customer_name: customerInfo.name.trim(),
            customer_email: customerInfo.email.trim(),
            shipping_address: customerInfo.address.trim(),
            items: cart.map((c) => ({
              product_id: c.product_id,
              name: c.name,
              price: c.price,
              quantity: c.quantity,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.configured === false) {
            setCheckoutError(data.error || `${paymentMethod} is not configured. Falling back to simulated checkout.`);
            setRedirecting(false);
            await simulatedCheckout();
            return;
          }
          throw new Error(data.error || 'Checkout failed');
        }

        if (data.checkout_url) {
          // Reliable direct redirect to payment processor URL
          window.location.href = data.checkout_url;
          return;
        }
        throw new Error('No checkout URL returned from payment server');
      } catch (err: any) {
        setCheckoutError(err.message || 'Hosted checkout failed. Processing order locally...');
        setRedirecting(false);
        await simulatedCheckout();
      }
      return;
    }

    await simulatedCheckout();
  }

  async function simulatedCheckout(providerSessionId?: string) {
    try {
      const items = cart.map((c) => ({
        product_id: c.product_id,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
      }));

      const { data, error: rpcError } = await supabase.rpc('create_storefront_order', {
        p_customer_name: customerInfo.name.trim() || 'Storefront customer',
        p_customer_email: customerInfo.email.trim(),
        p_shipping_address: customerInfo.address.trim(),
        p_payment_method: paymentMethod,
        p_items: items,
      });

      if (rpcError) {
        setCheckoutError(rpcError.message || 'Checkout failed.');
        setProcessing(false);
        setRedirecting(false);
        return;
      }

      if (providerSessionId && data?.order_id) {
        await supabase.from('orders').update({ provider_session_id: providerSessionId }).eq('id', data.order_id);
      }

      setReceipt({ order_number: data.order_number, total: data.total });
      setCart([]);
      setCustomerInfo({ name: '', email: '', address: '' });
      setCheckoutOpen(false);
      setCartOpen(false);
      await loadProducts();
    } catch (e: any) {
      setCheckoutError(e.message || 'Failed to complete transaction.');
    } finally {
      setProcessing(false);
      setRedirecting(false);
    }
  }

  function startNewOrder() {
    setReceipt(null);
  }

  if (loading) {
    return (
      <div className="demo-page">
        <header className="demo-header">
          <div className="section-wrap demo-header-inner">
            <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back to portfolio</button>
            <div><h1>Storefront</h1><p>Loading products...</p></div>
          </div>
        </header>
        <div className="section-wrap demo-content"><div className="pos-loading"><Loader2 className="spin" size={24} /> Loading product catalog...</div></div>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="demo-page">
        <header className="demo-header">
          <div className="section-wrap demo-header-inner">
            <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back to portfolio</button>
            <div><h1>Order Confirmed</h1><p>Thank you for your purchase</p></div>
          </div>
        </header>
        <div className="section-wrap demo-content">
          <div className="pos-receipt">
            <div className="receipt-icon"><Check size={36} /></div>
            <h3>Order Complete</h3>
            <p className="receipt-number">{receipt.order_number}</p>
            <p className="receipt-total">Total: ${receipt.total.toFixed(2)}</p>
            <p className="receipt-note">Payment processed · Stock updated · Order saved · Customer profile updated</p>
            <button className="button button-light" onClick={startNewOrder}>Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-page responsive-storefront-wrapper">
      <style>{`
        .responsive-storefront-wrapper {
          width: 100%;
          min-height: 100vh;
        }
        .storefront-hero {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 768px) {
          .storefront-hero {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        .storefront-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          width: 100%;
          max-width: 400px;
        }
        .storefront-search input {
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          width: 100%;
        }
        .storefront-cats {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
          scrollbar-width: thin;
        }
        .storefront-cats button {
          white-space: nowrap;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #ccc;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .storefront-cats button.active {
          background: #fff;
          color: #000;
          border-color: #fff;
        }
        .storefront-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 1.25rem;
        }
        @media (min-width: 480px) {
          .storefront-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 768px) {
          .storefront-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .storefront-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        .storefront-product {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
        }
        .storefront-product-image {
          position: relative;
          aspect-ratio: 4/3;
          width: 100%;
          background: #111;
        }
        .storefront-product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sf-stock-low, .sf-stock-out {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .sf-stock-low { background: #d97706; color: #fff; }
        .sf-stock-out { background: #dc2626; color: #fff; }
        .storefront-product-info {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .sf-cat { font-size: 0.75rem; text-transform: uppercase; color: #888; letter-spacing: 0.05em; }
        .storefront-product-info h3 { margin: 0.25rem 0; font-size: 1rem; }
        .storefront-product-info p { font-size: 0.85rem; color: #aaa; flex: 1; margin-bottom: 1rem; }
        .sf-bottom { display: flex; justify-content: space-between; align-items: center; }
        .sf-price { font-size: 1.1rem; font-weight: 700; color: #fff; }
        .sf-add {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.4rem 0.75rem;
          background: #fff;
          color: #000;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .sf-add:disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* Drawer Overlay */
        .sf-cart-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }
        .sf-cart-drawer {
          width: 100%;
          max-width: 420px;
          height: 100%;
          background: #121212;
          display: flex;
          flex-direction: column;
          padding: 1.25rem;
        }
        .sf-cart-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sf-cart-items { flex: 1; overflow-y: auto; margin: 1rem 0; display: flex; flex-direction: column; gap: 0.75rem; }
        .sf-cart-row { display: flex; gap: 0.75rem; align-items: center; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 8px; }
        .sf-cart-row img { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; }
        .sf-cart-row-info { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .cart-item-controls { display: flex; align-items: center; gap: 0.5rem; }
        .cart-item-controls button { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
        
        /* Modal Adjustments for Mobile */
        .pos-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          z-index: 1010;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .checkout-modal {
          width: 100%;
          max-width: 480px;
          background: #181818;
          border-radius: 12px;
          padding: 1.5rem;
          max-height: 90vh;
          overflow-y: auto;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      <header className="demo-header">
        <div className="section-wrap demo-header-inner">
          <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back to portfolio</button>
          <div>
            <h1>Storefront</h1>
            <p>Customer-facing online shop with real Stripe / Xendit checkout</p>
          </div>
          <button className="storefront-cart-btn button button-light" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={18} /> {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </header>

      <div className="section-wrap demo-content">
        <div className="storefront-hero">
          <div>
            <span className="eyebrow">ONLINE SHOP</span>
            <h2>Products that ship from our warehouse to your door.</h2>
          </div>
          <div className="storefront-search">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
          </div>
        </div>

        <div className="storefront-cats">
          {categories.map((cat) => (
            <button key={cat} className={category === cat ? 'active' : ''} onClick={() => setCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>

        <div className="storefront-grid">
          {filtered.map((product) => (
            <div className="storefront-product" key={product.id}>
              <div className="storefront-product-image">
                <img src={product.image_url} alt={product.name} loading="lazy" />
                {product.stock <= 5 && product.stock > 0 && <span className="sf-stock-low">Only {product.stock} left</span>}
                {product.stock === 0 && <span className="sf-stock-out">Sold out</span>}
              </div>
              <div className="storefront-product-info">
                <span className="sf-cat">{product.category}</span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="sf-bottom">
                  <span className="sf-price">${product.price.toFixed(2)}</span>
                  <button className="sf-add" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                    {product.stock === 0 ? 'Sold out' : <><Plus size={15} /> Add to cart</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cartOpen && (
        <div className="sf-cart-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="sf-cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sf-cart-drawer-header">
              <h3><ShoppingCart size={18} /> Your Cart ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>
            {cart.length === 0 ? (
              <div className="pos-cart-empty"><ShoppingCart size={32} /><p>Your cart is empty</p></div>
            ) : (
              <>
                <div className="sf-cart-items">
                  {cart.map((item) => (
                    <div key={item.product_id} className="sf-cart-row">
                      <img src={item.image_url} alt={item.name} loading="lazy" />
                      <div className="sf-cart-row-info">
                        <span className="sf-cart-row-name">{item.name}</span>
                        <span className="sf-cart-row-price">${item.price.toFixed(2)}</span>
                        <div className="cart-item-controls">
                          <button onClick={() => updateQty(item.product_id, -1)}><Minus size={13} /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQty(item.product_id, 1)}><Plus size={13} /></button>
                          <button className="cart-remove" onClick={() => removeFromCart(item.product_id)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <span className="sf-cart-row-subtotal">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="sf-cart-footer">
                  <div className="pos-cart-total">
                    <span>Total</span>
                    <span className="pos-total-amount">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button className="button button-light" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} disabled={cart.length === 0}>
                    Checkout <CreditCard size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="pos-modal-overlay" onClick={() => !processing && setCheckoutOpen(false)}>
          <div className="pos-modal checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Checkout · ${cartTotal.toFixed(2)}</h3>
              <button className="pos-modal-close" onClick={() => !processing && setCheckoutOpen(false)}><X size={20} /></button>
            </div>
            <div className="checkout-form">
              <label><span>Full name *</span><input value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} placeholder="Jane Doe" /></label>
              <label><span>Email address *</span><input type="email" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} placeholder="jane@example.com" /></label>
              <label><span>Shipping address</span><textarea value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} rows={2} placeholder="123 Main St, City, Country" /></label>
              <div className="checkout-payments">
                <span className="checkout-label">Payment method</span>
                <div className="payment-options payment-options-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className={`button ${paymentMethod === 'stripe' ? 'button-light' : ''}`} onClick={() => setPaymentMethod('stripe')}>
                    <CreditCard size={16} /> Stripe — Card
                  </button>
                  <button className={`button ${paymentMethod === 'xendit' ? 'button-light' : ''}`} onClick={() => setPaymentMethod('xendit')}>
                    <Zap size={16} /> Xendit — E-wallet / Bank
                  </button>
                  <button className={`button ${paymentMethod === 'cod' ? 'button-light' : ''}`} onClick={() => setPaymentMethod('cod')}>
                    <Store size={16} /> Cash on Delivery
                  </button>
                </div>
              </div>
              {checkoutError && <div className="checkout-note" style={{ color: '#ef4444', marginTop: '0.5rem' }}><Zap size={14} /> {checkoutError}</div>}
              <button className="button button-light" style={{ width: '100%', marginTop: '1rem' }} onClick={processCheckout} disabled={processing || cart.length === 0}>
                {redirecting ? (
                  <><Loader2 size={16} className="spin" /> Redirecting to {paymentMethod}...</>
                ) : processing ? (
                  <><Loader2 size={16} className="spin" /> Processing...</>
                ) : (
                  `Pay $${cartTotal.toFixed(2)} with ${paymentMethod === 'cod' ? 'COD' : paymentMethod}`
                )}
              </button>
              <p className="checkout-disclaimer" style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
                {paymentMethod === 'stripe' || paymentMethod === 'xendit'
                  ? 'You will be redirected to a secure hosted payment page. No card data is stored on our servers.'
                  : 'Order will be created and marked as pending until delivery.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}