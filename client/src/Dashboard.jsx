import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles, Activity, ArrowRight, BarChart3, Boxes, Check, ChevronDown, CircleAlert, DollarSign, LayoutDashboard, LogOut, Menu, Package, PackagePlus, Pencil, Plus, Search, Settings, ShoppingBag, Trash2, TrendingUp, X } from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import { api } from './lib/api'
import './Dashboard.css'

const money = value =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(Number(value) || 0)

const integer = value =>
  new Intl.NumberFormat('en-NG').format(Number(value) || 0)

const emptyProduct = {
  name: '',
  sku: '',
  price: '',
  cost_price: '',
  quantity: '',
  low_stock_threshold: '5'
}

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'sales', label: 'Sales', icon: ShoppingBag },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
]

function Dashboard({ user, onLogout, loggingOut }) {
  const [today] = useState(() => new Date().toISOString())
  const [page, setPage] = useState(() => sessionStorage.getItem('stockpilot-active-page') || 'overview')
  useEffect(() => {
    sessionStorage.setItem('stockpilot-active-page', page)
  }, [page])
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [saleProduct, setSaleProduct] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')

  const loadData = useCallback(async () => {
    try {
      const [inventory, transactions] = await Promise.all([
        api('/products'),
        api('/sales')
      ])
      setProducts(inventory.products || [])
      setSales(transactions.sales || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(loadData) }, [loadData])

  const metrics = useMemo(() => {
    const inventoryValue = products.reduce(
      (sum, product) =>
        sum + Number(product.cost_price) * Number(product.quantity), 0
    )
    const revenue = sales.reduce(
      (sum, sale) => sum + Number(sale.total), 0
    )
    const unitsSold = sales.reduce(
      (sum, sale) => sum + Number(sale.quantity), 0
    )
    const lowStock = products.filter(
      product => Number(product.quantity) <=
        Number(product.low_stock_threshold)
    )
    return { inventoryValue, revenue, unitsSold, lowStock }
  }, [products, sales])

  const filteredProducts = useMemo(() => products.filter(product => {
    const match = `${product.name} ${product.sku || ''}`
      .toLowerCase().includes(search.toLowerCase())
    const low = Number(product.quantity) <=
      Number(product.low_stock_threshold)
    return match && (
      filter === 'all' ||
      (filter === 'low' && low) ||
      (filter === 'available' && !low)
    )
  }), [products, search, filter])

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      return {
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        revenue: 0
      }
    })
    sales.forEach(sale => {
      const date = new Date(sale.sold_at)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const day = days.find(item => item.key === key)
      if (day) day.revenue += Number(sale.total)
    })
    return days
  }, [sales, today])

  const topProducts = useMemo(() => {
    const totals = new Map()
    sales.forEach(sale => {
      const current = totals.get(sale.product_id) || {
        name: sale.product_name,
        quantity: 0,
        revenue: 0
      }
      current.quantity += Number(sale.quantity)
      current.revenue += Number(sale.total)
      totals.set(sale.product_id, current)
    })
    return [...totals.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [sales])

  function openProduct(product = null) {
    setEditing(product)
    setForm(product ? {
      name: product.name,
      sku: product.sku || '',
      price: String(product.price),
      cost_price: String(product.cost_price),
      quantity: String(product.quantity),
      low_stock_threshold: String(product.low_stock_threshold)
    } : emptyProduct)
    setError('')
    setModal('product')
  }

  async function saveProduct(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        price: Number(form.price || 0),
        cost_price: Number(form.cost_price || 0),
        quantity: Number(form.quantity || 0),
        low_stock_threshold: Number(form.low_stock_threshold || 0)
      }
      await api(editing ? `/products/${editing.id}` : '/products', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      })
      setModal(null)
      setNotice(editing ? 'Product updated successfully.' : 'Product added successfully.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' })
      setNotice('Product deleted.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function recordSale(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/sales', {
        method: 'POST',
        body: JSON.stringify({
          product_id: saleProduct,
          quantity: Number(saleQuantity)
        })
      })
      setModal(null)
      setSaleProduct('')
      setSaleQuantity('1')
      setNotice('Sale recorded and inventory updated.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function navigate(id) {
    setPage(id)
    setMobileOpen(false)
    setError('')
    setNotice('')
  }

  const pageTitle = navigation.find(item => item.id === page)?.label || 'Overview'

  return (
    <div className="sp-app">
      {mobileOpen && <div className="sp-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sp-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sp-logo">
          <span className="sp-logo-icon"><Boxes size={22} /></span>
          <span>stockpilot<span className="sp-lime">.</span></span>
        </div>
        <div className="sp-workspace">
          <div className="sp-workspace-icon"><ShoppingBag size={18} /></div>
          <div><strong>My Business</strong><small>Business workspace</small></div>
          <ChevronDown size={15} />
        </div>
        <div className="sp-nav-caption">WORKSPACE</div>
        <nav className="sp-nav">
          {navigation.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => navigate(item.id)}>
                <Icon size={19} /> {item.label}
                {item.id === 'inventory' && metrics.lowStock.length > 0 &&
                  <span className="sp-nav-count">{metrics.lowStock.length}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sp-sidebar-bottom">
          <div className="sp-sidebar-tip">
            <Activity size={19} />
            <strong>Know your numbers.</strong>
            <span>Smarter decisions start with clearer data.</span>
          </div>
          <div className="sp-user">
            <div className="sp-user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div><strong>{user.name}</strong><small>{user.email}</small></div>
          </div>
        </div>
      </aside>

      <main className="sp-main">
        <header className="sp-topbar">
          <div className="sp-top-left">
            <button className="sp-menu" onClick={() => setMobileOpen(true)}
              aria-label="Open menu"><Menu size={23} /></button>
            <span>Workspace</span><span className="sp-breadcrumb">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="sp-top-right">
            <span className="sp-live"><span /> Workspace active</span>
            <div className="sp-top-avatar">{user.name?.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="sp-content">
          {error && !modal && <div className="sp-alert error"><CircleAlert size={17} /> {error}<button onClick={() => setError('')}><X size={16} /></button></div>}
          {notice && <div className="sp-alert success"><Check size={17} /> {notice}<button onClick={() => setNotice('')}><X size={16} /></button></div>}

          {page === 'overview' && <>
            <div className="sp-page-heading">
              <div>
                <span className="sp-eyebrow">YOUR BUSINESS AT A GLANCE</span>
                <h1>Good to see you, {user.name?.split(' ')[0]}<span className="sp-lime">.</span></h1>
                <p>Here's what's happening across your business.</p>
              </div>
              <button className="sp-primary" onClick={() => openProduct()}>
                <Plus size={18} /> Add product
              </button>
            </div>
            <section className="sp-feature-banner">
              <div className="sp-feature-copy">
                <span className="sp-feature-eyebrow"><Sparkles size={14} /> YOUR BUSINESS COMMAND CENTER</span>
                <h2>Everything in stock.<br /><em>Everything in sight.</em></h2>
                <p>Make confident decisions with your inventory, sales, and insights in one place.</p>
                <div className="sp-feature-actions"><button onClick={() => navigate('inventory')}><Package size={16} /> Manage inventory</button><button onClick={() => navigate('analytics')}><BarChart3 size={16} /> View insights <ArrowRight size={15}/></button></div>
              </div>
              <div className="sp-feature-visual" aria-hidden="true"><div className="sp-feature-orbit orbit-one"/><div className="sp-feature-orbit orbit-two"/><div className="sp-feature-center"><Boxes size={48}/></div><span className="sp-feature-float one"><TrendingUp size={18}/></span><span className="sp-feature-float two"><ShoppingBag size={18}/></span><span className="sp-feature-float three"><Package size={18}/></span></div>
            </section>
            {!loading && products.length === 0 && sales.length === 0 && <section className="sp-get-started"><div className="sp-get-started-icon"><PackagePlus size={22}/></div><div><strong>Let's stock your first shelf.</strong><p>Add a product to unlock meaningful inventory tracking and sales insights.</p></div><button onClick={() => openProduct()}>Add first product <ArrowRight size={16}/></button></section>}
            <div className="sp-stats">
              <Stat label="Total products" value={integer(products.length)}
                icon={Package} detail="Products in inventory" />
              <Stat label="Inventory value" value={money(metrics.inventoryValue)}
                icon={Boxes} detail="Based on cost price" />
              <Stat label="Total revenue" value={money(metrics.revenue)}
                icon={TrendingUp} detail="Recorded sales" />
              <Stat label="Low stock alerts" value={integer(metrics.lowStock.length)}
                icon={CircleAlert} detail="Products needing attention"
                warning={metrics.lowStock.length > 0} />
            </div>
            <div className="sp-two-column">
              <section className="sp-panel">
                <div className="sp-panel-heading">
                  <div><h3>Revenue overview</h3><p>Sales over the last 7 days</p></div>
                  <span className="sp-panel-tag">Last 7 days</span>
                </div>
                <div className="sp-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="spGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8cc969" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#8cc969" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#edf0e9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false}
                        tick={{ fill: '#8b978c', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} width={52}
                        tick={{ fill: '#8b978c', fontSize: 11 }}
                        tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                      <Tooltip formatter={value => money(value)} />
                      <Area type="monotone" dataKey="revenue" stroke="#3c8157"
                        strokeWidth={3} fill="url(#spGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="sp-panel">
                <div className="sp-panel-heading">
                  <div><h3>Stock health</h3><p>Keep your shelves ready</p></div>
                  <Package size={20} color="#6b986a" />
                </div>
                <div className="sp-stock-health">
                  <div className="sp-health-number">{products.length - metrics.lowStock.length}<span> / {products.length}</span></div>
                  <p>Products above low-stock threshold</p>
                  <div className="sp-progress"><span style={{
                    width: `${products.length ? (products.length - metrics.lowStock.length) / products.length * 100 : 0}%`
                  }} /></div>
                </div>
                <button className="sp-text-action" onClick={() => navigate('inventory')}>
                  View inventory <ArrowRight size={16} />
                </button>
              </section>
            </div>
            <section className="sp-panel">
              <div className="sp-panel-heading">
                <div><h3>Recent transactions</h3><p>Your latest recorded sales</p></div>
                <button className="sp-text-action" onClick={() => navigate('sales')}>View all <ArrowRight size={16} /></button>
              </div>
              <SalesTable sales={sales.slice(0, 5)} />
            </section>
          </>}

          {page === 'inventory' && <>
            <div className="sp-page-heading">
              <div><span className="sp-eyebrow">STAY IN CONTROL</span><h1>Inventory<span className="sp-lime">.</span></h1><p>Everything you stock, all in one place.</p></div>
              <button className="sp-primary" onClick={() => openProduct()}><Plus size={18} /> Add product</button>
            </div>
            <div className="sp-panel">
              <div className="sp-toolbar">
                <div className="sp-search"><Search size={18} /><input placeholder="Search products or SKUs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                <select value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="all">All products</option>
                  <option value="available">Healthy stock</option>
                  <option value="low">Low stock</option>
                </select>
              </div>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead><tr><th>PRODUCT</th><th>SKU</th><th>SELLING PRICE</th><th>QUANTITY</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                  <tbody>
                    {filteredProducts.map(product => {
                      const low = Number(product.quantity) <= Number(product.low_stock_threshold)
                      return <tr key={product.id}>
                        <td><div className="sp-product-cell"><span className="sp-product-icon"><Package size={18} /></span><strong>{product.name}</strong></div></td>
                        <td>{product.sku || '—'}</td>
                        <td className="sp-strong">{money(product.price)}</td>
                        <td>{integer(product.quantity)}</td>
                        <td><span className={`sp-status ${low ? 'low' : 'healthy'}`}>{low ? 'Low stock' : 'In stock'}</span></td>
                        <td><div className="sp-actions">
                          <button aria-label={`Edit ${product.name}`} onClick={() => openProduct(product)}><Pencil size={16} /></button>
                          <button aria-label={`Delete ${product.name}`} disabled={busy} onClick={() => deleteProduct(product)}><Trash2 size={16} /></button>
                        </div></td>
                      </tr>
                    })}
                  </tbody>
                </table>
                {!filteredProducts.length && <EmptyState title="No products found" description="Add your first product or adjust your search." />}
              </div>
              <div className="sp-table-footer">Showing {filteredProducts.length} of {products.length} products</div>
            </div>
          </>}

          {page === 'sales' && <>
            <div className="sp-page-heading">
              <div><span className="sp-eyebrow">EVERY SALE COUNTS</span><h1>Sales<span className="sp-lime">.</span></h1><p>Track transactions and keep stock accurate.</p></div>
              <button className="sp-primary" onClick={() => { setError(''); setModal('sale') }}><Plus size={18} /> Record sale</button>
            </div>
            <div className="sp-stats sp-stats-two">
              <Stat label="Total revenue" value={money(metrics.revenue)} icon={DollarSign} detail="Across recorded transactions" />
              <Stat label="Units sold" value={integer(metrics.unitsSold)} icon={ShoppingBag} detail={`${sales.length} recorded transactions`} />
            </div>
            <section className="sp-panel">
              <div className="sp-panel-heading"><div><h3>Transaction history</h3><p>Most recent sales first</p></div></div>
              <SalesTable sales={sales} />
            </section>
          </>}

          {page === 'analytics' && <>
            <div className="sp-page-heading">
              <div><span className="sp-eyebrow">TURN DATA INTO DIRECTION</span><h1>Analytics<span className="sp-lime">.</span></h1><p>Understand what moves your business forward.</p></div>
            </div>
            <div className="sp-stats sp-stats-two">
              <Stat label="Revenue" value={money(metrics.revenue)} icon={TrendingUp} detail="Recorded transactions" />
              <Stat label="Average sale" value={money(sales.length ? metrics.revenue / sales.length : 0)} icon={BarChart3} detail="Revenue per transaction" />
            </div>
            <div className="sp-two-column">
              <section className="sp-panel">
                <div className="sp-panel-heading"><div><h3>Revenue trend</h3><p>Last 7 days</p></div></div>
                <div className="sp-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="#edf0e9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} width={52}
                        tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                      <Tooltip formatter={value => money(value)} />
                      <Area type="monotone" dataKey="revenue" stroke="#438d5b" fill="#e2f1d8" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="sp-panel">
                <div className="sp-panel-heading"><div><h3>Top-selling products</h3><p>Ranked by revenue</p></div></div>
                {topProducts.length ? topProducts.map((product, index) =>
                  <div className="sp-ranking" key={index}>
                    <span className="sp-rank">{String(index + 1).padStart(2, '0')}</span>
                    <div><strong>{product.name}</strong><small>{integer(product.quantity)} units sold</small></div>
                    <strong>{money(product.revenue)}</strong>
                  </div>
                ) : <EmptyState title="No sales yet" description="Your best-selling products will appear here." />}
              </section>
            </div>
          </>}

          {page === 'settings' && <>
            <div className="sp-page-heading">
              <div><span className="sp-eyebrow">YOUR WORKSPACE</span><h1>Settings<span className="sp-lime">.</span></h1><p>Manage your account and workspace access.</p></div>
            </div>
            <section className="sp-panel sp-settings-panel">
              <div className="sp-panel-heading"><div><h3>Account information</h3><p>Your authenticated StockPilot profile</p></div></div>
              <div className="sp-settings-profile">
                <div className="sp-settings-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                <div><strong>{user.name}</strong><span>{user.email}</span></div>
              </div>
              <div className="sp-settings-row"><span>Workspace</span><strong>My Business</strong></div>
              <div className="sp-settings-row"><span>Account status</span><span className="sp-status healthy">Active</span></div>
              <button className="sp-signout" onClick={onLogout} disabled={loggingOut}><LogOut size={18} /> Sign out of StockPilot</button>
            </section>
          </>}

          {loading && <div className="sp-loading">Loading your business data...</div>}
          <footer className="sp-footer"><span>© {2026} STOCKPILOT</span><span>INVENTORY. SALES. CLARITY.</span></footer>
        </div>
      </main>

      {modal && <div className="sp-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setModal(null) }}>
        <div className="sp-modal" role="dialog" aria-modal="true" aria-label={modal === 'product' ? 'Product details' : 'Record sale'}>
          <div className="sp-modal-heading">
            <div><span className="sp-eyebrow">STOCKPILOT WORKSPACE</span><h2>{modal === 'product' ? (editing ? 'Edit product' : 'Add new product') : 'Record a sale'}</h2></div>
            <button onClick={() => setModal(null)} disabled={busy} aria-label="Close"><X size={21} /></button>
          </div>
          {error && <div className="sp-alert error"><CircleAlert size={16} /> {error}</div>}
          {modal === 'product' ?
            <form onSubmit={saveProduct} className="sp-form">
              <label>Product name<input required maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Headphones" /></label>
              <label>SKU (optional)<input maxLength={80} value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. WH-001" /></label>
              <div className="sp-form-grid">
                <label>Selling price (₦)<input type="number" min="0" max="9999999999.99" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
                <label>Cost price (₦)<input type="number" min="0" max="9999999999.99" step="0.01" required value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} /></label>
                <label>Quantity<input type="number" min="0" max="2147483647" step="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
                <label>Low stock threshold<input type="number" min="0" max="2147483647" step="1" required value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></label>
              </div>
              <button className="sp-primary sp-submit" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create product'} <ArrowRight size={18} /></button>
            </form> :
            <form onSubmit={recordSale} className="sp-form">
              <label>Product<select required value={saleProduct} onChange={e => setSaleProduct(e.target.value)}>
                <option value="">Select a product</option>
                {products.filter(p => Number(p.quantity) > 0).map(p =>
                  <option key={p.id} value={p.id}>{p.name} — {integer(p.quantity)} available</option>
                )}
              </select></label>
              <label>Quantity sold<input type="number" required min="1" step="1" max={products.find(p => p.id === saleProduct)?.quantity || 1} value={saleQuantity} onChange={e => setSaleQuantity(e.target.value)} /></label>
              <div className="sp-sale-preview">Estimated total <strong>{money(Number(products.find(p => p.id === saleProduct)?.price || 0) * Number(saleQuantity || 0))}</strong></div>
              <button className="sp-primary sp-submit" disabled={busy || !saleProduct}>{busy ? 'Recording...' : 'Confirm sale'} <ArrowRight size={18} /></button>
            </form>}
        </div>
      </div>}
    </div>
  )
}

function Stat({ label, value, icon: Icon, detail, warning }) {
  return <div className="sp-stat">
    <div className="sp-stat-top"><span>{label}</span><span className={`sp-stat-icon ${warning ? 'warning' : ''}`}><Icon size={19} /></span></div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
}

function EmptyState({ title, description }) {
  return <div className="sp-empty"><span><PackagePlus size={25} /></span><strong>{title}</strong><p>{description}</p></div>
}

function SalesTable({ sales }) {
  return <div className="sp-table-wrap">
    <table className="sp-table">
      <thead><tr><th>PRODUCT</th><th>DATE</th><th>QUANTITY</th><th>UNIT PRICE</th><th>TOTAL</th></tr></thead>
      <tbody>{sales.map(sale =>
        <tr key={sale.id}>
          <td><div className="sp-product-cell"><span className="sp-product-icon"><ShoppingBag size={17} /></span><strong>{sale.product_name}</strong></div></td>
          <td>{new Date(sale.sold_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td>{integer(sale.quantity)}</td>
          <td>{money(sale.unit_price)}</td>
          <td className="sp-strong">{money(sale.total)}</td>
        </tr>
      )}</tbody>
    </table>
    {!sales.length && <EmptyState title="No transactions yet" description="Record your first sale to see it here." />}
  </div>
}

export default Dashboard
