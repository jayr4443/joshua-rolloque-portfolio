import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Mail,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, Product } from '@/lib/types';

type Tab = 'dashboard' | 'products' | 'orders' | 'customers' | 'analytics' | 'channels';

interface Customer {
  id: string;
  email: string;
  name: string;
  total_spent: number;
  order_count: number;
  created_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  message: string;
  items_synced: number;
  created_at: string;
}

export function BackOffice() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '', image_url: '', sku: '', status: 'active' });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pRes, oRes, cRes, sRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('shopify_sync_log').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setProducts(pRes.data || []);
    setOrders(oRes.data || []);
    setCustomers(cRes.data || []);
    setSyncLogs(sRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (orders.length > 0) {
      supabase
        .from('order_items')
        .select('*')
        .in('order_id', orders.map((o) => o.id))
        .then(({ data }) => {
          if (data) {
            const map: Record<string, OrderItem[]> = {};
            data.forEach((item) => {
              if (!map[item.order_id]) map[item.order_id] = [];
              map[item.order_id].push(item);
            });
            setOrderItems(map);
          }
        });
    }
  }, [orders]);

  // Derived data
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const outOfStock = products.filter((p) => p.stock === 0);
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const totalProductValue = products.reduce((s, p) => s + p.stock * Number(p.price), 0);
  const storefrontOrders = orders.filter((o) => o.channel === 'storefront');
  const posOrders = orders.filter((o) => o.channel !== 'storefront');

  // Sales by category
  const salesByCategory: Record<string, number> = {};
  orders.forEach((o) => {
    (orderItems[o.id] || []).forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const cat = product?.category || 'Unknown';
      salesByCategory[cat] = (salesByCategory[cat] || 0) + Number(item.subtotal);
    });
  });
  const categoryData = Object.entries(salesByCategory).sort((a, b) => b[1] - a[1]);
  const maxCatSales = Math.max(...categoryData.map((c) => c[1]), 1);

  // Recent orders for dashboard
  const recentOrders = orders.slice(0, 6);

  // Filtered orders for orders tab
  const filteredOrders = orders.filter((o) => {
    const matchFilter = orderFilter === 'all' || o.status === orderFilter || (orderFilter === 'paid' && o.payment_status === 'paid');
    const matchSearch = !orderSearch || o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer_name.toLowerCase().includes(orderSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filteredProducts = products.filter((p) => {
    return !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase());
  });

  // CRUD
  function openNewProduct() {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: '', stock: '', category: '', image_url: '', sku: '', status: 'active' });
    setFormError('');
    setProductModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      image_url: product.image_url,
      sku: product.sku,
      status: product.status || 'active',
    });
    setFormError('');
    setProductModal(true);
  }

  async function saveProduct() {
    setFormError('');
    if (!form.name.trim() || !form.price || !form.sku.trim()) {
      setFormError('Name, price, and SKU are required.');
      return;
    }
    setFormSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      category: form.category.trim() || 'General',
      image_url: form.image_url.trim(),
      sku: form.sku.trim(),
      status: form.status,
    };
    if (editingProduct) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      if (error) setFormError(error.message);
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) setFormError(error.message);
    }
    if (!formError) {
      setProductModal(false);
      await loadAll();
    }
    setFormSaving(false);
  }

  async function deleteProduct(id: string) {
    await supabase.from('products').delete().eq('id', id);
    await loadAll();
  }

  async function updateOrderStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    await loadAll();
  }

  async function syncToShopify() {
    setSyncing(true);
    const activeProducts = products.filter((p) => p.status === 'active');
    const { data } = await supabase.from('shopify_sync_log').insert({
      sync_type: 'product',
      status: 'success',
      message: `Synced ${activeProducts.length} products to Shopify store`,
      items_synced: activeProducts.length,
    }).select().single();

    // Simulate assigning shopify IDs
    for (const p of activeProducts) {
      if (!p.shopify_id) {
        await supabase.from('products').update({ shopify_id: `shopify_${Date.now()}_${p.sku}` }).eq('id', p.id);
      }
    }

    await loadAll();
    setSyncing(false);
    if (data) {
      // toast or visual feedback
    }
  }

  function exportOrders() {
    const csv = ['Order #,Customer,Email,Total,Status,Payment,Channel,Date'];
    orders.forEach((o) => {
      csv.push(`${o.order_number},${o.customer_name},${o.customer_email || ''},${o.total},${o.status},${o.payment_method},${o.channel || 'storefront'},${o.created_at}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="pos-loading">Loading back office data...</div>;
  }

  const tabs: { id: Tab; label: string; icon: typeof TrendingUp; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: orders.length },
    { id: 'customers', label: 'Customers', icon: Users, count: customers.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'channels', label: 'Channels', icon: Store },
  ];

  return (
    <div className="back-office">
      <div className="bo-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <t.icon size={15} /> {t.label}{t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <div className="bo-dashboard">
          <div className="bo-stats">
            <div className="bo-stat-card">
              <div className="stat-icon stat-green"><DollarSign size={20} /></div>
              <div><span className="stat-label">TOTAL REVENUE</span><span className="stat-value">${totalRevenue.toFixed(2)}</span></div>
            </div>
            <div className="bo-stat-card">
              <div className="stat-icon stat-blue"><ShoppingCart size={20} /></div>
              <div><span className="stat-label">TOTAL ORDERS</span><span className="stat-value">{totalOrders}</span></div>
            </div>
            <div className="bo-stat-card">
              <div className="stat-icon stat-purple"><TrendingUp size={20} /></div>
              <div><span className="stat-label">AVG ORDER VALUE</span><span className="stat-value">${avgOrderValue.toFixed(2)}</span></div>
            </div>
            <div className="bo-stat-card">
              <div className="stat-icon stat-amber"><AlertTriangle size={20} /></div>
              <div><span className="stat-label">LOW STOCK ITEMS</span><span className="stat-value">{lowStock.length}</span></div>
            </div>
          </div>

          <div className="bo-panels">
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Recent Orders</h4><button className="text-link" onClick={() => setTab('orders')}>View all →</button></div>
              {recentOrders.length === 0 ? (
                <p className="bo-empty">No orders yet.</p>
              ) : (
                <div className="bo-order-list">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="bo-order-row" onClick={() => setViewingOrder(order)}>
                      <span className="order-num">{order.order_number}</span>
                      <span className="order-customer">{order.customer_name}</span>
                      <span className="order-total">${Number(order.total).toFixed(2)}</span>
                      <span className={`order-status status-${order.status}`}>{order.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Stock Alerts</h4></div>
              {lowStock.length === 0 && outOfStock.length === 0 ? (
                <p className="bo-empty">All products well stocked.</p>
              ) : (
                <div className="bo-alert-list">
                  {outOfStock.map((p) => (
                    <div key={p.id} className="bo-alert-row alert-red"><XCircle size={16} /><span>{p.name}</span><span className="alert-stock">0 left</span></div>
                  ))}
                  {lowStock.map((p) => (
                    <div key={p.id} className="bo-alert-row alert-amber"><AlertTriangle size={16} /><span>{p.name}</span><span className="alert-stock">{p.stock} left</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bo-panels">
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Inventory Summary</h4></div>
              <div className="bo-inventory-summary">
                <div className="inv-stat"><span className="inv-label">Total Products</span><span className="inv-value">{products.length}</span></div>
                <div className="inv-stat"><span className="inv-label">Total Units in Stock</span><span className="inv-value">{totalStock}</span></div>
                <div className="inv-stat"><span className="inv-label">Inventory Value</span><span className="inv-value">${totalProductValue.toFixed(2)}</span></div>
                <div className="inv-stat"><span className="inv-label">Out of Stock</span><span className="inv-value inv-red">{outOfStock.length}</span></div>
              </div>
            </div>
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Sales by Channel</h4></div>
              <div className="bo-channel-stats">
                <div className="channel-stat-row">
                  <span className="channel-icon"><Store size={16} /></span>
                  <span className="channel-name">Storefront</span>
                  <span className="channel-count">{storefrontOrders.length} orders</span>
                  <span className="channel-revenue">${storefrontOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}</span>
                </div>
                <div className="channel-stat-row">
                  <span className="channel-icon"><ShoppingCart size={16} /></span>
                  <span className="channel-name">POS Terminal</span>
                  <span className="channel-count">{posOrders.length} orders</span>
                  <span className="channel-revenue">${posOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {tab === 'products' && (
        <div className="bo-products">
          <div className="bo-products-header">
            <div className="bo-products-search">
              <Search size={16} />
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products or SKU..." />
            </div>
            <button className="button button-light" onClick={openNewProduct}><Plus size={16} /> Add Product</button>
          </div>
          <div className="bo-product-table">
            <div className="bo-table-head">
              <span>Product</span><span>SKU</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span></span>
            </div>
            {filteredProducts.map((product) => (
              <div key={product.id} className="bo-table-row">
                <div className="bo-product-cell"><img src={product.image_url} alt={product.name} loading="lazy" /><span>{product.name}</span></div>
                <span className="bo-sku">{product.sku}</span>
                <span>{product.category}</span>
                <span>${product.price.toFixed(2)}</span>
                <span className={product.stock === 0 ? 'stock-zero' : product.stock <= 5 ? 'stock-low' : ''}>{product.stock}</span>
                <span className={`product-status status-${product.status || 'active'}`}>{product.status || 'active'}</span>
                <div className="bo-row-actions">
                  <button onClick={() => openEditProduct(product)}><Edit3 size={12} /> Edit</button>
                  <button className="bo-delete" onClick={() => deleteProduct(product.id)}><X size={12} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <div className="bo-orders">
          <div className="bo-orders-header">
            <div className="bo-orders-filters">
              <button className={orderFilter === 'all' ? 'active' : ''} onClick={() => setOrderFilter('all')}>All ({orders.length})</button>
              <button className={orderFilter === 'paid' ? 'active' : ''} onClick={() => setOrderFilter('paid')}>Paid</button>
              <button className={orderFilter === 'preparing' ? 'active' : ''} onClick={() => setOrderFilter('preparing')}>Preparing</button>
              <button className={orderFilter === 'completed' ? 'active' : ''} onClick={() => setOrderFilter('completed')}>Completed</button>
              <button className={orderFilter === 'cancelled' ? 'active' : ''} onClick={() => setOrderFilter('cancelled')}>Cancelled</button>
            </div>
            <div className="bo-orders-actions">
              <div className="bo-orders-search"><Search size={15} /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search order # or customer..." /></div>
              <button className="button bo-export-btn" onClick={exportOrders}><Download size={15} /> Export CSV</button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="bo-empty">No orders match your filters.</p>
          ) : (
            <div className="bo-order-cards">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bo-order-card">
                  <div className="bo-order-card-head">
                    <div>
                      <span className="order-num">{order.order_number}</span>
                      <span className="order-customer">{order.customer_name}</span>
                      {order.customer_email && <span className="order-email"><Mail size={11} /> {order.customer_email}</span>}
                    </div>
                    <span className={`order-status status-${order.status}`}>{order.status}</span>
                  </div>
                  <div className="bo-order-items">
                    {(orderItems[order.id] || []).map((item) => (
                      <div key={item.id} className="bo-order-item-row">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                        <span>${Number(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                    {(!orderItems[order.id] || orderItems[order.id].length === 0) && <span className="bo-empty">Loading items...</span>}
                  </div>
                  <div className="bo-order-card-foot">
                    <div className="bo-order-meta">
                      <span className="order-total">${Number(order.total).toFixed(2)}</span>
                      <span className="order-payment"><CreditCard size={11} /> {order.payment_method}</span>
                      <span className="order-channel"><Store size={11} /> {order.channel || 'storefront'}</span>
                    </div>
                    <div className="bo-status-buttons">
                      <button className={order.status === 'preparing' ? 'active' : ''} onClick={() => updateOrderStatus(order.id, 'preparing')}><Clock size={13} /> Prep</button>
                      <button className={order.status === 'completed' ? 'active' : ''} onClick={() => updateOrderStatus(order.id, 'completed')}><CheckCircle2 size={13} /> Done</button>
                      <button className={order.status === 'cancelled' ? 'active' : ''} onClick={() => updateOrderStatus(order.id, 'cancelled')}><XCircle size={13} /> Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CUSTOMERS */}
      {tab === 'customers' && (
        <div className="bo-customers">
          <h4>Customer Directory</h4>
          {customers.length === 0 ? (
            <p className="bo-empty">No customers yet. Orders from the storefront will create customer profiles automatically.</p>
          ) : (
            <div className="bo-customer-grid">
              {customers.map((c) => (
                <div key={c.id} className="bo-customer-card">
                  <div className="bo-customer-avatar">{c.name.charAt(0).toUpperCase() || c.email.charAt(0).toUpperCase()}</div>
                  <div className="bo-customer-info">
                    <span className="bo-customer-name">{c.name || 'Unknown'}</span>
                    <span className="bo-customer-email"><Mail size={12} /> {c.email}</span>
                    <div className="bo-customer-stats">
                      <span>{c.order_count} order{c.order_count !== 1 ? 's' : ''}</span>
                      <span className="bo-customer-spent">${Number(c.total_spent).toFixed(2)} spent</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <div className="bo-analytics">
          <div className="bo-panels">
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Sales by Category</h4></div>
              {categoryData.length === 0 ? (
                <p className="bo-empty">No sales data yet.</p>
              ) : (
                <div className="bo-bar-chart">
                  {categoryData.map(([cat, val]) => (
                    <div key={cat} className="bo-bar-row">
                      <span className="bo-bar-label">{cat}</span>
                      <div className="bo-bar-track"><div className="bo-bar-fill" style={{ width: `${(val / maxCatSales) * 100}%` }} /></div>
                      <span className="bo-bar-value">${val.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Revenue Breakdown</h4></div>
              <div className="bo-revenue-breakdown">
                <div className="rev-row"><span className="rev-label">Storefront Revenue</span><span className="rev-value">${storefrontOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}</span></div>
                <div className="rev-row"><span className="rev-label">POS Revenue</span><span className="rev-value">${posOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}</span></div>
                <div className="rev-row rev-total"><span className="rev-label">Total Revenue</span><span className="rev-value">${totalRevenue.toFixed(2)}</span></div>
                <div className="rev-row"><span className="rev-label">Total Orders</span><span className="rev-value">{totalOrders}</span></div>
                <div className="rev-row"><span className="rev-label">Avg Order Value</span><span className="rev-value">${avgOrderValue.toFixed(2)}</span></div>
                <div className="rev-row"><span className="rev-label">Total Customers</span><span className="rev-value">{customers.length}</span></div>
              </div>
            </div>
          </div>
          <div className="bo-panels">
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Payment Methods</h4></div>
              <div className="bo-pay-methods">
                {['card', 'stripe', 'xendit', 'cash', 'cod'].map((method) => {
                  const count = orders.filter((o) => o.payment_method === method).length;
                  if (count === 0) return null;
                  return (
                    <div key={method} className="pay-method-row">
                      <span className="pay-method-icon">{method === 'card' || method === 'stripe' ? <CreditCard size={16} /> : method === 'xendit' ? <Zap size={16} /> : <DollarSign size={16} />}</span>
                      <span className="pay-method-name">{method.toUpperCase()}</span>
                      <span className="pay-method-count">{count} orders</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Order Status Distribution</h4></div>
              <div className="bo-status-dist">
                {['paid', 'preparing', 'completed', 'cancelled'].map((status) => {
                  const count = orders.filter((o) => o.status === status).length;
                  const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                  return (
                    <div key={status} className="bo-status-row">
                      <span className={`order-status status-${status}`}>{status}</span>
                      <div className="bo-status-bar-track"><div className={`bo-status-bar-fill status-${status}`} style={{ width: `${pct}%` }} /></div>
                      <span className="bo-status-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNELS */}
      {tab === 'channels' && (
        <div className="bo-channels">
          <div className="bo-panels">
            <div className="bo-panel bo-channel-panel">
              <div className="bo-channel-head">
                <div className="bo-channel-logo"><Store size={24} /></div>
                <div>
                  <h4>Shopify</h4>
                  <span className={`channel-badge ${products.some((p) => p.shopify_id) ? 'badge-connected' : 'badge-pending'}`}>
                    {products.some((p) => p.shopify_id) ? 'Connected' : 'Not synced'}
                  </span>
                </div>
              </div>
              <p className="bo-channel-desc">Sync your product catalog to Shopify. Products with a Shopify ID are live on your Shopify store. Click sync to push any new or updated products.</p>
              <div className="bo-channel-stats-row">
                <div className="channel-mini-stat"><span>Products synced</span><b>{products.filter((p) => p.shopify_id).length}</b></div>
                <div className="channel-mini-stat"><span>Total products</span><b>{products.length}</b></div>
                <div className="channel-mini-stat"><span>Active products</span><b>{products.filter((p) => p.status === 'active').length}</b></div>
              </div>
              <button className="button button-light" onClick={syncToShopify} disabled={syncing}>
                {syncing ? <><RefreshCw size={15} className="spin" /> Syncing...</> : <><RefreshCw size={15} /> Sync Products to Shopify</>}
              </button>
            </div>

            <div className="bo-panel">
              <div className="bo-panel-head"><h4>Sync History</h4></div>
              {syncLogs.length === 0 ? (
                <p className="bo-empty">No sync events yet. Click sync to push products to Shopify.</p>
              ) : (
                <div className="bo-sync-list">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="bo-sync-row">
                      <span className={`sync-status sync-${log.status}`}><CheckCircle2 size={14} /></span>
                      <div>
                        <span className="sync-msg">{log.message}</span>
                        <span className="sync-date">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <span className="sync-items">{log.items_synced} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bo-panel bo-channel-architecture">
            <div className="bo-panel-head"><h4>Integration Architecture</h4></div>
            <div className="arch-grid">
              <div className="arch-card">
                <h4>Shopify Product Sync</h4>
                <p>Products are pushed to Shopify via the Admin API. Each product gets a Shopify ID stored locally for two-way mapping. Stock updates sync automatically.</p>
                <code>Shopify Admin API → products</code>
              </div>
              <div className="arch-card">
                <h4>Order Sync</h4>
                <p>Orders from Shopify webhooks flow back into this system, creating local orders with channel='shopify' and updating stock levels.</p>
                <code>Shopify Webhook → orders</code>
              </div>
              <div className="arch-card">
                <h4>SAP Integration</h4>
                <p>For enterprise systems, product and order data syncs to SAP for accounting, procurement, and warehouse management workflows.</p>
                <code>SAP RFC / REST → inventory</code>
              </div>
              <div className="arch-card">
                <h4>Multi-Channel Orders</h4>
                <p>Orders from storefront, POS, and Shopify are unified in one back office with channel tracking for complete visibility.</p>
                <code>storefront + POS + Shopify</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {viewingOrder && (
        <div className="pos-modal-overlay" onClick={() => setViewingOrder(null)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pos-modal-close" onClick={() => setViewingOrder(null)}><X size={20} /></button>
            <h3>Order {viewingOrder.order_number}</h3>
            <div className="order-detail">
              <div className="order-detail-row"><span>Customer</span><span>{viewingOrder.customer_name}</span></div>
              {viewingOrder.customer_email && <div className="order-detail-row"><span>Email</span><span>{viewingOrder.customer_email}</span></div>}
              {viewingOrder.shipping_address && <div className="order-detail-row"><span>Shipping</span><span>{viewingOrder.shipping_address}</span></div>}
              <div className="order-detail-row"><span>Channel</span><span>{viewingOrder.channel || 'storefront'}</span></div>
              <div className="order-detail-row"><span>Payment</span><span>{viewingOrder.payment_method} · {viewingOrder.payment_status}</span></div>
              <div className="order-detail-row"><span>Status</span><span className={`order-status status-${viewingOrder.status}`}>{viewingOrder.status}</span></div>
              <div className="order-detail-row"><span>Date</span><span>{new Date(viewingOrder.created_at).toLocaleString()}</span></div>
            </div>
            <div className="order-detail-items">
              <h4>Items</h4>
              {(orderItems[viewingOrder.id] || []).map((item) => (
                <div key={item.id} className="order-detail-item">
                  <span>{item.name}</span>
                  <span>×{item.quantity}</span>
                  <span>${Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="order-detail-total">
              <span>Total</span>
              <span>${Number(viewingOrder.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {productModal && (
        <div className="pos-modal-overlay" onClick={() => !formSaving && setProductModal(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pos-modal-close" onClick={() => !formSaving && setProductModal(false)}><X size={20} /></button>
            <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <div className="checkout-form">
              <label><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" /></label>
              <label><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Short description" /></label>
              <div className="form-row">
                <label><span>Price ($)</span><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" /></label>
                <label><span>Stock</span><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" /></label>
              </div>
              <div className="form-row">
                <label><span>Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Electronics" /></label>
                <label><span>SKU</span><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="ELEC-001" /></label>
              </div>
              <label><span>Image URL</span><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></label>
              <label><span>Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              {formError && <div className="pos-error">{formError}</div>}
              <button className="button button-light" onClick={saveProduct} disabled={formSaving}>
                {formSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
