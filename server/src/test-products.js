import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { pool } from './db/pool.js'

const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const port = 4100
const base = `http://127.0.0.1:${port}`
const email = `inventory-test-${randomUUID()}@example.com`
const password = `Secure-${randomUUID()}-Test`

let server
let cookie = ''
let userId = null
let productId = null

function check(condition, message) {
  if (!condition) throw new Error(message)
  console.log(`PASS: ${message}`)
}

async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers
  }
}

try {
  server = spawn(process.execPath, ['src/index.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  })

  let ready = false

  for (let i = 0; i < 40; i++) {
    await delay(250)

    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) {
        ready = true
        break
      }
    } catch {}
  }

  check(ready, 'API server started')

  let result = await request('/api/products')
  check(result.status === 401, 'Inventory requires login')

  result = await request('/api/auth/register', 'POST', {
    name: 'Inventory Test User',
    email,
    password
  })

  check(result.status === 201, 'Test account registered')
  userId = result.data.user.id
  cookie = result.headers.get('set-cookie').split(';')[0]

  result = await request('/api/products', 'POST', {
    name: 'Wireless Keyboard',
    sku: `KB-${randomUUID().slice(0, 8)}`,
    price: 15000,
    cost_price: 9500,
    quantity: 20,
    low_stock_threshold: 5
  })

  check(result.status === 201, 'Product created')
  productId = result.data.product.id

  result = await request('/api/products')
  check(
    result.status === 200 &&
    result.data.products.some(p => p.id === productId),
    'Product appears in inventory'
  )

  result = await request(`/api/products/${productId}`)
  check(
    result.status === 200 &&
    result.data.product.name === 'Wireless Keyboard',
    'Single product retrieved'
  )

  result = await request(`/api/products/${productId}`, 'PATCH', {
    quantity: 12,
    price: 16500
  })

  check(
    result.status === 200 &&
    result.data.product.quantity === 12,
    'Product updated'
  )

  result = await request(`/api/products/${productId}`, 'DELETE')
  check(result.status === 200, 'Product deleted')
  productId = null

  result = await request('/api/products')
  check(
    result.status === 200 &&
    result.data.products.length === 0,
    'Inventory empty after deletion'
  )

  console.log('')
  console.log('ALL INVENTORY CRUD TESTS PASSED')
} catch (error) {
  console.error('TEST FAILED:', error.message)
  process.exitCode = 1
} finally {
  if (server) server.kill('SIGTERM')

  if (userId) {
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [userId])
      console.log('Temporary test data removed')
    } catch (error) {
      console.error('Cleanup failed:', error.message)
      process.exitCode = 1
    }
  }

  await pool.end()
}
