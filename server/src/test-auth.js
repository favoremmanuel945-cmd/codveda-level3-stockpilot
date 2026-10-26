import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { pool } from './db/pool.js'

const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const base = 'http://127.0.0.1:4000'
const email = `stockpilot-test-${randomUUID()}@example.com`
const password = `Test-${randomUUID()}-Secure`
let cookie = ''
let userId = null
let server

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

  const data = await response.json()
  return { response, data }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
  console.log(`PASS: ${message}`)
}

try {
  server = spawn(process.execPath, ['src/index.js'], {
    env: { ...process.env, PORT: '4000' },
    stdio: 'ignore'
  })

  let ready = false

  for (let i = 0; i < 30; i++) {
    await delay(300)

    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) {
        ready = true
        break
      }
    } catch {}
  }

  if (!ready) throw new Error('API server did not start')

  let result = await request('/api/auth/me')
  assert(result.response.status === 401, 'Unauthenticated access denied')

  result = await request('/api/auth/register', 'POST', {
    name: 'StockPilot Test',
    email,
    password
  })

  assert(result.response.status === 201, 'Registration successful')
  userId = result.data.user.id

  const setCookie = result.response.headers.get('set-cookie') || ''
  assert(setCookie.includes('HttpOnly'), 'HTTP-only cookie issued')
  cookie = setCookie.split(';')[0]

  result = await request('/api/auth/me')
  assert(result.response.status === 200, 'Protected account accessible')

  result = await request('/api/auth/logout', 'POST')
  assert(result.response.status === 200, 'Logout successful')
  cookie = ''

  result = await request('/api/auth/login', 'POST', {
    email,
    password
  })
  assert(result.response.status === 200, 'Login successful')

  result = await request('/api/auth/login', 'POST', {
    email,
    password: 'incorrect-password'
  })
  assert(result.response.status === 401, 'Incorrect password rejected')

  console.log('')
  console.log('ALL AUTHENTICATION TESTS PASSED')
} catch (error) {
  console.error('TEST FAILED:', error.message)
  process.exitCode = 1
} finally {
  if (server) server.kill('SIGTERM')

  if (userId) {
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [userId])
      console.log('Temporary test account removed')
    } catch (error) {
      console.error('Test cleanup failed:', error.message)
      process.exitCode = 1
    }
  }

  await pool.end()
}
