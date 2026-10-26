import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' }
})

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
}

function setSession(res, userId) {
  const token = jwt.sign(
    {},
    process.env.JWT_SECRET,
    {
      subject: userId,
      expiresIn: '7d',
      algorithm: 'HS256'
    }
  )

  res.cookie('stockpilot_session', token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

router.post('/register', limiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Name, email and password are required'
      })
    }

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (
      cleanName.length < 2 ||
      cleanName.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanEmail.length > 255 ||
      password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Enter a valid name, email and password (12–72 bytes)'
      })
    }

    const hash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [cleanName, cleanEmail, hash]
    )

    const user = result.rows[0]
    setSession(res, user.id)

    return res.status(201).json({ user })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'An account with this email already exists'
      })
    }

    console.error('Registration failed:', error.code || error.message)
    return res.status(500).json({
      error: 'Unable to create account'
    })
  }
})

router.post('/login', limiter, async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 255 ||
      Buffer.byteLength(password, 'utf8') > 1024
    ) {
      return res.status(400).json({
        error: 'Valid credentials required'
      })
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    )

    const user = result.rows[0]

    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : false

    if (!valid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      })
    }

    setSession(res, user.id)

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Login failed:', error.code || error.message)
    return res.status(500).json({
      error: 'Unable to log in'
    })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE id = $1`,
      [req.userId]
    )

    if (!result.rows[0]) {
      return res.status(401).json({
        error: 'Account no longer exists'
      })
    }

    return res.json({ user: result.rows[0] })
  } catch {
    return res.status(500).json({
      error: 'Unable to load account'
    })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('stockpilot_session', cookieOptions)
  res.json({ message: 'Logged out successfully' })
})

export default router
