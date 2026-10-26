import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    application: 'StockPilot API'
  })
})

app.listen(port, () => {
  console.log(`StockPilot API running on http://localhost:${port}`)
})
