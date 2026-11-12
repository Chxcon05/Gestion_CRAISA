import { execSync } from 'node:child_process'
import path from 'node:path'
import { testEnv } from './test-db.ts'

export default function setup() {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, ...testEnv() },
    stdio: 'pipe',
  })
}
