import { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CartItem, Product } from '@/lib/types';

export function PosTerminal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{ order_number: string; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true });
    if (error) {
      setError('Could not load products. Please refresh.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = products.filter((p) => {
    const matchCat = category === 'All' || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
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
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, image_url: product.image_url }];
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
    setProcessing(true);
    setError('');

    const items = cart.map((c) => ({
      product_id: c.product_id,
      name: c.name,
      price: c.price,
      quantity: c.quantity,
    }));

    const { data, error: rpcError } = await supabase.rpc('create_order', {
      p_customer_name: customerName.trim() || 'Walk-in customer',
      p_payment_method: paymentMethod,
      p_items: items,
    });

    if (rpcError) {
      setError(rpcError.message || 'Checkout failed. Please try again.');
      setProcessing(false);
      return;
    }

    setReceipt({ order_number: data.order_number, total: data.total });
    setCart([]);
    setCustomerName('');
    setProcessing(false);
    setCheckoutOpen(false);
    loadProducts();
  }

  function startNewOrder() {
    setReceipt(null);
    setCheckoutOpen(false);
  }

  if (loading) {
    return <div className="pos-loading">Loading product catalog...</div>;
  }

  if (receipt) {
    return (
      <div className="pos-receipt">
        <div className="receipt-icon"><Check size={36} /></div>
        <h3>Order Complete</h3>
        <p className="receipt-number">{receipt.order_number}</p>
        <p className="receipt-total">Total: ${receipt.total.toFixed(2)}</p>
        <p className="receipt-note">Payment processed · Stock updated · Order saved to database</p>
        <button className="button button-light" onClick={startNewOrder}>New Order</button>
      </div>
    );
  }

  return (
    <div className="pos-terminal">
      <div className="pos-catalog">
        <div className="pos-toolbar">
          <div className="pos-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or SKU..." />
          </div>
          <div className="pos-categories">
            {categories.map((cat) => (
              <button key={cat} className={category === cat ? 'active' : ''} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>
        </div>
        {error && <div className="pos-error">{error}</div>}
        <div className="pos-grid">
          {filtered.map((product) => (
            <button
              key={product.id}
              className="pos-product-card"
              onClick={() => addToCart(product)}
              disabled={product.stock === 0}
            >
              <div className="pos-product-image">
                <img src={product.image_url} alt={product.name} loading="lazy" />
                {product.stock === 0 && <span className="stock-out">Out of stock</span>}
                {product.stock > 0 && product.stock <= 5 && <span className="stock-low">Low: {product.stock} left</span>}
              </div>
              <div className="pos-product-info">
                <span className="pos-product-cat">{product.category}</span>
                <h4>{product.name}</h4>
                <div className="pos-product-bottom">
                  <span className="pos-price">${product.price.toFixed(2)}</span>
                  <span className="pos-sku">{product.sku}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="pos-cart-panel">
        <div className="pos-cart-header">
          <h3><ShoppingCart size={18} /> Current Order</h3>
          <span className="cart-count">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
        </div>
        {cart.length === 0 ? (
          <div className="pos-cart-empty">
            <ShoppingCart size={32} />
            <p>Click products to add them to the order</p>
          </div>
        ) : (
          <>
            <div className="pos-cart-items">
              {cart.map((item) => (
                <div key={item.product_id} className="pos-cart-item">
                  <img src={item.image_url} alt={item.name} loading="lazy" />
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">${item.price.toFixed(2)} each</span>
                    <div className="cart-item-controls">
                      <button onClick={() => updateQty(item.product_id, -1)}><Minus size={13} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.product_id, 1)}><Plus size={13} /></button>
                      <button className="cart-remove" onClick={() => removeFromCart(item.product_id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <span className="cart-item-subtotal">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pos-cart-footer">
              <div className="pos-cart-total">
                <span>Total</span>
                <span className="pos-total-amount">${cartTotal.toFixed(2)}</span>
              </div>
              <button className="button button-light pos-checkout-btn" onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0}>
                <CreditCard size={16} /> Checkout
              </button>
            </div>
          </>
        )}
      </aside>

      {checkoutOpen && (
        <div className="pos-modal-overlay" onClick={() => !processing && setCheckoutOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pos-modal-close" onClick={() => !processing && setCheckoutOpen(false)}><X size={20} /></button>
            <h3>Checkout · ${cartTotal.toFixed(2)}</h3>
            <div className="checkout-form">
              <label>
                <span>Customer name (optional)</span>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
              </label>
              <div className="checkout-payments">
                <span className="checkout-label">Payment method</span>
                <div className="payment-options">
                  <button className={paymentMethod === 'card' ? 'active' : ''} onClick={() => setPaymentMethod('card')}>
                    <CreditCard size={16} /> Card (Stripe)
                  </button>
                  <button className={paymentMethod === 'xendit' ? 'active' : ''} onClick={() => setPaymentMethod('xendit')}>
                    <Zap size={16} /> Xendit
                  </button>
                  <button className={paymentMethod === 'cash' ? 'active' : ''} onClick={() => setPaymentMethod('cash')}>
                    <span className="cash-icon">$</span> Cash
                  </button>
                </div>
              </div>
              <div className="checkout-note">
                <Zap size={14} /> This is a simulated payment. With a Stripe or Xendit API key configured, this flow would redirect to a real hosted checkout page and process a live payment via webhook.
              </div>
              {error && <div className="pos-error">{error}</div>}
              <button className="button button-light" onClick={processCheckout} disabled={processing || cart.length === 0}>
                {processing ? 'Processing...' : `Pay $${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
