import path from 'node:path'

// Las pruebas usan una BD aparte (craisa_test) que se recrea en cada corrida; nunca tocan la de desarrollo.
export function testEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // En CI las variables vienen del entorno.
  }
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!base) throw new Error('Defina DATABASE_URL o TEST_DATABASE_URL para las pruebas')
  const url = new URL(base)
  if (!process.env.TEST_DATABASE_URL) url.pathname = '/craisa_test'
  return {
    DATABASE_URL: url.toString(),
    JWT_SECRET: process.env.JWT_SECRET ?? 'secreto-solo-para-pruebas',
    NODE_ENV: 'test',
  }
}
