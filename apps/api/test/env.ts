import { testEnv } from './test-db.ts'

Object.assign(process.env, testEnv())
