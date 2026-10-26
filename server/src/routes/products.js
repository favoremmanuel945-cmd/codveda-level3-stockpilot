import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const fields = [
  'name', 'sku', 'category_id', 'price',
  'cost_price', 'quantity', 'low_stock_threshold'
]

function validate(data, partial = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid product data')
  }

  const keys = Object.keys(data)

  if (!keys.length || keys.some(key => !fields.includes(key))) {
    throw new Error('Invalid product fields')
  }

  if (!partial && !('name' in data)) {
    throw new Error('Product name is required')
  }

  const output = {}

  for (const key of keys) {
    const value = data[key]

    if (key === 'name') {
      if (typeof value !== 'string' ||
          !value.trim() || value.trim().length > 160) {
        throw new Error('Invalid product name')
      }
      output.name = value.trim()
    }

    if (key === 'sku') {
      if (value !== null &&
          (typeof value !== 'string' || value.length > 80)) {
        throw new Error('Invalid SKU')
      }
      output.sku = value?.trim() || null
    }

    if (key === 'category_id') {
      if (value !== null &&
          (typeof value !== 'string' || !uuidPattern.test(value))) {
        throw new Error('Invalid category ID')
      }
      output.category_id = value
    }

    if (key === 'price' || key === 'cost_price') {
      if (typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 9999999999.99 ||
          Math.round(value * 100) / 100 !== value) {
        throw new Error(`Invalid ${key}`)
      }
      output[key] = value
    }

    if (key === 'quantity' || key === 'low_stock_threshold') {
      if (!Number.isSafeInteger(value) ||
          value < 0 || value > 2147483647) {
        throw new Error(`Invalid ${key}`)
      }
      output[key] = value
    }
  }

  return output
}

function handleError(error, res) {
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'A product with this SKU already exists'
    })
  }

  if (error.code === '23503') {
    return res.status(409).json({
      error: 'Invalid category or product has related records'
    })
  }

  console.error('Inventory error:', error.code || error.message)

  return res.status(500).json({
    error: 'Inventory operation failed'
  })
}

// CREATE
router.post('/', async (req, res) => {
  let data

  try {
    data = validate(req.body)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }

  try {
    const result = await pool.query(
      `INSERT INTO products
       (user_id, name, sku, category_id, price,
        cost_price, quantity, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.userId,
        data.name,
        data.sku ?? null,
        data.category_id ?? null,
        data.price ?? 0,
        data.cost_price ?? 0,
        data.quantity ?? 0,
        data.low_stock_threshold ?? 5
      ]
    )

    return res.status(201).json({
      product: result.rows[0]
    })
  } catch (error) {
    return handleError(error, res)
  }
})

// READ ALL
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM products
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.userId]
    )

    return res.json({ products: result.rows })
  } catch (error) {
    return handleError(error, res)
  }
})

// READ ONE
router.get('/:id', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  try {
    const result = await pool.query(
      `SELECT * FROM products
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Product not found'
      })
    }

    return res.json({ product: result.rows[0] })
  } catch (error) {
    return handleError(error, res)
  }
})

// UPDATE
router.patch('/:id', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  let data

  try {
    data = validate(req.body, true)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }

  const keys = Object.keys(data)
  const assignments = keys.map(
    (key, index) => `${key} = $${index + 3}`
  )

  try {
    const result = await pool.query(
      `UPDATE products
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, ...keys.map(key => data[key])]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Product not found'
      })
    }

    return res.json({ product: result.rows[0] })
  } catch (error) {
    return handleError(error, res)
  }
})

// DELETE
router.delete('/:id', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  try {
    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.userId]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Product not found'
      })
    }

    return res.json({
      message: 'Product deleted successfully'
    })
  } catch (error) {
    return handleError(error, res)
  }
})

export default router
