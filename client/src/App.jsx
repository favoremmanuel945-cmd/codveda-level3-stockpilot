import Dashboard from './Dashboard'
import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, BarChart3, Boxes, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Package, ShieldCheck, Sparkles, TrendingUp, UserRound } from 'lucide-react'
import { api } from './lib/api'
import './App.css'

function App() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [welcomeChoice, setWelcomeChoice] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const welcomeKey = user?.id ? `stockpilot-welcome-v2:${user.id}` : user?.email ? `stockpilot-welcome-v2:${user.email}` : null
  const welcomeComplete = welcomeKey ? localStorage.getItem(welcomeKey) === 'complete' : false
  function finishWelcome() {
    if (welcomeKey) localStorage.setItem(welcomeKey, 'complete')
    setWelcomeChoice('complete')
    setShowPreview(false)
  }


  useEffect(() => {
    let active = true

    api('/auth/me')
      .then(data => {
        if (active) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => { active = false }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (mode === 'register' && name.trim().length < 2) {
      setError('Enter your full name.')
      return
    }

    if (password.length < (mode === 'register' ? 12 : 1)) {
      setError(mode === 'register'
        ? 'Your password must contain at least 12 characters.'
        : 'Enter your password.')
      return
    }

    setLoading(true)

    try {
      const data = await api(
        mode === 'register' ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            ...(mode === 'register' ? { name: name.trim() } : {}),
            email: email.trim(),
            password
          })
        }
      )

      setUser(data.user)
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    setLoading(true)
    setError('')

    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null)
      setPassword('')
      setMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="brand-mark"><Boxes size={25} /></div>
        <LoaderCircle className="spin" size={25} />
        <span>Preparing your workspace</span>
      </div>
    )
  }

  if (user) {
    if (!welcomeComplete && welcomeChoice !== 'complete') {
      return <main className="sp-welcome">
        <div className="sp-welcome-glow" />
        <div className="sp-welcome-shell">
          <div className="sp-welcome-brand"><span className="sp-welcome-mark"><Boxes size={24} /></span> stockpilot<span className="sp-welcome-dot">.</span></div>
          <span className="sp-welcome-kicker"><Sparkles size={15} /> YOUR BUSINESS, BEAUTIFULLY ORGANIZED</span>
          <h1>Make room for<br /><em>better business.</em></h1>
          <p className="sp-welcome-lead">Welcome, {user.name?.split(' ')[0] || 'there'}. Your workspace is ready. Track what you stock, understand what sells, and grow with confidence.</p>
          <div className="sp-welcome-choices">
            <button onClick={finishWelcome} className="sp-welcome-choice primary"><span className="sp-welcome-choice-icon"><ArrowRight size={22} /></span><strong>Enter my workspace</strong><small>Start with your own real inventory and sales.</small><ArrowRight className="sp-welcome-choice-arrow" size={18} /></button>
            <button onClick={() => setShowPreview(true)} className="sp-welcome-choice"><span className="sp-welcome-choice-icon"><BarChart3 size={22} /></span><strong>Explore a preview</strong><small>See illustrative figures without changing your data.</small><ArrowRight className="sp-welcome-choice-arrow" size={18} /></button>
          </div>
          {showPreview && <section className="sp-welcome-preview" aria-label="Illustrative dashboard preview"><div className="sp-welcome-preview-head"><strong>Sample business snapshot</strong><span>DEMO DATA — NOT SAVED</span></div><div className="sp-welcome-preview-grid"><div><small>Monthly revenue</small><strong>₦248,500</strong></div><div><small>Products in stock</small><strong>32</strong></div><div><small>Units sold</small><strong>184</strong></div></div><p>These are example figures only. Your actual dashboard displays information from your account.</p><button onClick={finishWelcome}>Continue to my workspace <ArrowRight size={16}/></button></section>}
          <div className="sp-welcome-foot"><ShieldCheck size={15} /> Your existing account data is safe and unchanged.</div>
        </div>
      </main>
    }
    return <Dashboard user={user} onLogout={logout} loggingOut={loading} />
  }

  return (
    <main className="auth-layout">
      <section className="showcase">
        <div className="showcase-top">
          <div className="brand brand-light">
            <span className="brand-mark"><Boxes size={22} /></span>
            <span>stockpilot<span className="brand-dot">.</span></span>
          </div>
          <span className="showcase-label">THE MODERN BUSINESS OS</span>
        </div>

        <div className="showcase-main">
          <span className="showcase-kicker"><span className="live-dot" /> BUILT FOR BUSINESSES IN MOTION</span>
          <h1>Clarity for<br />every <em>move.</em></h1>
          <p>Know what you have. See what sells. Make smarter decisions with one beautifully simple workspace.</p>

          <div className="preview-card">
            <div className="preview-top">
              <div className="preview-title"><span className="mini-logo"><BarChart3 size={16} /></span> Business overview</div>
              <span className="preview-period">This month <ArrowUpRight size={13} /></span>
            </div>
            <div className="preview-metrics">
              <div><small>TOTAL REVENUE</small><strong>₦2,480,500</strong><span className="growth"><TrendingUp size={13} /> +18.4% this month</span></div>
              <div><small>PRODUCTS SOLD</small><strong>1,284</strong><span className="growth"><TrendingUp size={13} /> +12.6% this month</span></div>
            </div>
            <div className="chart">
              {[34,49,39,57,45,64,52,74,61,81,68,96].map((height, i) => (
                <div key={i} className={`chart-bar ${i === 11 ? 'active' : ''}`} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="chart-labels"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div>
            <div className="preview-note">Illustrative dashboard preview — sample data</div>
          </div>

          <div className="showcase-features">
            <span><Package size={16} /> Smart inventory</span>
            <span><BarChart3 size={16} /> Sales insights</span>
            <span><ShieldCheck size={16} /> Secure by design</span>
          </div>
        </div>

        <div className="showcase-bottom">
          <span>© {2026} STOCKPILOT</span>
          <span>MADE FOR THE WAY YOU WORK <ArrowUpRight size={13} /></span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="mobile-brand brand">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>stockpilot<span className="brand-dot">.</span></span>
        </div>
        <div className="auth-container">
          <div className="form-topline"><span className="form-topline-icon"><Sparkles size={15} /></span> YOUR WORKSPACE STARTS HERE</div>
          <h2>{mode === 'login' ? 'Welcome back.' : 'Start something great.'}</h2>
          <p className="auth-subtitle">{mode === 'login'
            ? 'Sign in to stay on top of your business.'
            : 'Create your workspace and take control of your business.'}</p>

          <div className="mode-switch">
            <button className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
            <button className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setError('') }}>Create account</button>
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <label className="field">
                <span>Full name</span>
                <div className="input-wrap"><UserRound size={18} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" required minLength={2} maxLength={120} /></div>
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <div className="input-wrap"><Mail size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required /></div>
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input-wrap"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} /><button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </label>

            {mode === 'register' && <div className="password-hint"><ShieldCheck size={15} /> Use a unique password with at least 12 characters.</div>}
            {error && <div className="form-error" role="alert">{error}</div>}

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={19} /> : <>{mode === 'login' ? 'Sign in to workspace' : 'Create my account'} <ArrowRight size={19} /></>}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'login' ? "New to StockPilot?" : 'Already have an account?'}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create an account' : 'Sign in instead'} <ArrowUpRight size={14} /></button>
          </div>
          <div className="trust-note"><ShieldCheck size={16} /> Your business data stays private and protected.</div>
        </div>
        <div className="auth-panel-bottom"><span>INVENTORY. SALES. CLARITY.</span><span>STOCKPILOT / 2026</span></div>
      </section>
    </main>
  )
}

export default App
