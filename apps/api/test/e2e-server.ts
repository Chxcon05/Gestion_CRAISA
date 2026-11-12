// Servidor para las pruebas e2e: BD de prueba con el seed ficticio, en un puerto aparte del de desarrollo.
import { execSync } from 'node:child_process'
import path from 'node:path'
import { testEnv } from './test-db.ts'

const env = { ...process.env, ...testEnv(), NODE_ENV: 'test', PORT: '8191' }
Object.assign(process.env, env)
const cwd = path.resolve(import.meta.dirname, '..')
execSync('npx prisma migrate deploy', { cwd, env, stdio: 'inherit' })
execSync('npx tsx prisma/seed.ts', { cwd, env, stdio: 'inherit' })
await import('../src/server.ts')
