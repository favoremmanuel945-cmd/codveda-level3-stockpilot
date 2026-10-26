import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import salesRoutes from './routes/sales.js'
import productRoutes from './routes/products.js'

dotenv.config()

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}

const app = express()
const port = process.env.PORT || 4000
const clientOrigin =
  process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: clientOrigin,
  credentials: true
}))

// Protect cookie-authenticated requests from cross-origin writes.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  if (req.get('origin') !== clientOrigin) {
    return res.status(403).json({
      error: 'Origin not allowed'
    })
  }

  next()
})

app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    application: 'StockPilot API'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/products', productRoutes)

app.listen(port, () => {
  console.log(`StockPilot API running on port ${port}`)
})
