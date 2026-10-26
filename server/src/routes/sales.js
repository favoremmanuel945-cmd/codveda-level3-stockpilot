import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.product_id, p.name AS product_name,
              s.quantity, s.unit_price, s.total, s.sold_at
       FROM sales s
       JOIN products p
         ON p.id = s.product_id
        AND p.user_id = s.user_id
       WHERE s.user_id = $1
       ORDER BY s.sold_at DESC
       LIMIT 200`,
      [req.userId]
    )

    res.json({ sales: result.rows })
  } catch (error) {
    console.error('Sales listing failed:', error.code || error.message)
    res.status(500).json({ error: 'Unable to load sales' })
  }
})

router.post('/', async (req, res) => {
  const { product_id, quantity } = req.body || {}

  if (
    typeof product_id !== 'string' ||
    !uuidPattern.test(product_id) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 2147483647
  ) {
    return res.status(400).json({
      error: 'Valid product ID and positive quantity required'
    })
  }

  const client = await pool.connect().catch(() => null)

  if (!client) {
    return res.status(503).json({
      error: 'Database unavailable'
    })
  }

  try {
    await client.query('BEGIN')

    const productResult = await client.query(
      `SELECT id, name, price, quantity
       FROM products
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [product_id, req.userId]
    )

    const product = productResult.rows[0]

    if (!product) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        error: 'Product not found'
      })
    }

    if (product.quantity < quantity) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: 'Insufficient stock',
        available: product.quantity
      })
    }

    const saleResult = await client.query(
      `INSERT INTO sales
       (user_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, product_id, quantity, product.price]
    )

    const updated = await client.query(
      `UPDATE products
       SET quantity = quantity - $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, quantity`,
      [quantity, product_id, req.userId]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      sale: saleResult.rows[0],
      product: updated.rows[0]
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message)
    }

    console.error('Sale failed:', error.code || error.message)

    return res.status(500).json({
      error: 'Unable to record sale'
    })
  } finally {
    client.release()
  }
})

export default router
