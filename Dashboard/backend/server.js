const mongoose = require('mongoose')
const config = require('./src/config')
const app = require('./src/app')
const seedSuperAdmin = require('./src/seed/superAdmin.seed')

const start = async () => {
  try {
    await mongoose.connect(config.mongoUri)
    console.log('✅ Connected to MongoDB:', config.mongoUri)

    await seedSuperAdmin()

    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`)
    })
  } catch (err) {
    console.error('❌ Startup error:', err.message)
    process.exit(1)
  }
}

start()
