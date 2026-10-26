import pg from 'pg'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing')
}

const directory = path.dirname(fileURLToPath(import.meta.url))
const certificatePath = path.resolve(
  directory,
  '../../supabase-ca.crt'
)

const url = new URL(process.env.DATABASE_URL)

for (const key of [
  'sslmode',
  'sslrootcert',
  'sslcert',
  'sslkey'
]) {
  url.searchParams.delete(key)
}

export const pool = new Pool({
  connectionString: url.toString(),
  ssl: {
    ca: process.env.DATABASE_CA_CERT
      ? process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n')
      : fs.readFileSync(certificatePath, 'utf8'),
    rejectUnauthorized: true
  },
  max: 5,
  connectionTimeoutMillis: 10000
})
