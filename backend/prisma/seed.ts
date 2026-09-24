import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { expand } from 'dotenv-expand'

const loadedEnv = dotenv.config()
expand(loadedEnv)

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please add it to your .env file.')
}

const sql = await readFile(new URL('./seed.sql', import.meta.url), 'utf8')
const client = new Client({ connectionString })

try {
  await client.connect()
  await client.query(sql)
  console.log('Database seeded successfully.')
} finally {
  await client.end()
}
