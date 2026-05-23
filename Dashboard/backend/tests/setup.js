process.env.NODE_ENV = 'test'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters-long'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long'
process.env.COOKIE_SECRET = 'test-cookie-secret-min-32-characters-long'
process.env.SUPER_ADMIN_PASSWORD = 'SuperAdmin@123!'
process.env.LOCKOUT_MAX_ATTEMPTS = '3'
process.env.LOCKOUT_DURATION_MS = '60000'

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGO_URI = mongoServer.getUri()

  const appModule = require('../src/app')
  global.app = appModule
  await mongoose.connect(process.env.MONGO_URI)
  const seedSuperAdmin = require('../src/seed/superAdmin.seed')
  await seedSuperAdmin()
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongoServer) await mongoServer.stop()
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    if (key === 'admins') continue
    await collections[key].deleteMany({})
  }
})
