import dotenv from 'dotenv'
import { expand } from 'dotenv-expand'
import { defineConfig, env } from "prisma/config"

const dEnv = dotenv.config()
expand(dEnv)

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})