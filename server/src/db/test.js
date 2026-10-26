import { pool } from './pool.js'

try {
  const result = await pool.query(`
    SELECT
      current_database() AS database,
      NOW() AS server_time,
      (
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'users',
            'categories',
            'products',
            'sales'
          )
      ) AS stockpilot_tables
  `)

  console.log('DATABASE CONNECTION SUCCESSFUL')
  console.log('Database:', result.rows[0].database)
  console.log('Tables found:', result.rows[0].stockpilot_tables)
} catch (error) {
  console.error('DATABASE CONNECTION FAILED')
  console.error(error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
