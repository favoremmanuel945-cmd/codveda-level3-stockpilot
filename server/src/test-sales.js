import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { pool } from './db/pool.js'

const port = 4200
const base = `http://127.0.0.1:${port}`
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const email = `sales-test-${randomUUID()}@example.com`
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
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let serverOutput = ''
  server.stdout.on('data', chunk => {
    serverOutput += chunk.toString()
  })
  server.stderr.on('data', chunk => {
    serverOutput += chunk.toString()
  })

  let ready = false

  for (let i = 0; i < 40; i++) {
    await delay(250)
    if (server.exitCode !== null) break

    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) {
        ready = true
        break
      }
    } catch {}
  }

  if (!ready) {
    throw new Error(`API failed to start: ${serverOutput.slice(-500)}`)
  }

  check(true, 'API server started')

  let result = await request('/api/sales')
  check(result.status === 401, 'Sales require authentication')

  result = await request('/api/auth/register', 'POST', {
    name: 'Sales Test User',
    email,
    password
  })

  check(result.status === 201, 'Test account registered')
  userId = result.data.user.id
  cookie = result.headers.get('set-cookie').split(';')[0]

  result = await request('/api/products', 'POST', {
    name: 'StockPilot Test Keyboard',
    sku: `SALE-${randomUUID().slice(0, 8)}`,
    price: 15000,
    cost_price: 9500,
    quantity: 20,
    low_stock_threshold: 5
  })

  check(result.status === 201, 'Test product created')
  productId = result.data.product.id

  result = await request('/api/sales', 'POST', {
    product_id: productId,
    quantity: 3
  })

  check(
    result.status === 201,
    `Sale recorded (HTTP ${result.status})`
  )

  check(
    result.data.product.quantity === 17,
    'Stock reduced from 20 to 17'
  )

  result = await request(`/api/products/${productId}`)

  check(
    result.status === 200 &&
    result.data.product.quantity === 17,
    'Database inventory reflects sale'
  )

  result = await request('/api/sales')

  check(
    result.status === 200 &&
    result.data.sales.length === 1,
    'Sales history recorded'
  )

  result = await request('/api/sales', 'POST', {
    product_id: productId,
    quantity: 100
  })

  check(
    result.status === 409,
    'Insufficient stock rejected'
  )

  result = await request(`/api/products/${productId}`)

  check(
    result.status === 200 &&
    result.data.product.quantity === 17,
    'Failed sale leaves stock unchanged'
  )

  console.log('')
  console.log('ALL SALES TRANSACTION TESTS PASSED')
} catch (error) {
  console.error('TEST FAILED:', error.message)
  process.exitCode = 1
} finally {
  if (server) {
    server.kill('SIGTERM')
    await delay(200)
  }

  if (userId) {
    const client = await pool.connect().catch(() => null)

    if (client) {
      try {
        await client.query('BEGIN')
        await client.query(
          'DELETE FROM sales WHERE user_id = $1',
          [userId]
        )
        await client.query(
          'DELETE FROM products WHERE user_id = $1',
          [userId]
        )
        await client.query(
          'DELETE FROM users WHERE id = $1',
          [userId]
        )
        await client.query('COMMIT')
        console.log('Temporary test data removed')
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        console.error('Cleanup failed:', error.message)
        process.exitCode = 1
      } finally {
        client.release()
      }
    } else {
      console.error('Cleanup failed: database unavailable')
      process.exitCode = 1
    }
  }

  await pool.end()
}
