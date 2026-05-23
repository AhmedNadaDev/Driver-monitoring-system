/**
 * Server Diagnostic Script
 * Run this to check if the server can start without errors
 */

const mongoose = require('mongoose')
const config = require('./src/config')

console.log('🔍 Running Server Diagnostics...\n')

// Check 1: Configuration
console.log('1️⃣ Checking Configuration:')
console.log('   Port:', config.port)
console.log('   MongoDB URI:', config.mongoUri)
console.log('   Node ENV:', config.nodeEnv)
console.log('   Client URL:', config.clientUrl)
console.log('   JWT Access Secret:', config.jwt.accessSecret ? '✅ Set' : '❌ Missing')
console.log('   JWT Refresh Secret:', config.jwt.refreshSecret ? '✅ Set' : '❌ Missing')
console.log('   Cookie Secret:', config.cookie.secret ? '✅ Set' : '❌ Missing')
console.log('')

// Check 2: MongoDB Connection
console.log('2️⃣ Testing MongoDB Connection:')
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('   ✅ MongoDB connected successfully')
    console.log('   Database:', mongoose.connection.name)
    console.log('')
    
    // Check 3: Models
    console.log('3️⃣ Checking Models:')
    try {
      const Admin = require('./src/models/Admin')
      console.log('   ✅ Admin model loaded')
      
      // Check if SUPER_ADMIN exists
      return Admin.findOne({ role: 'SUPER_ADMIN' })
    } catch (err) {
      console.log('   ❌ Error loading Admin model:', err.message)
      throw err
    }
  })
  .then((superAdmin) => {
    if (superAdmin) {
      console.log('   ✅ SUPER_ADMIN exists:', superAdmin.username)
    } else {
      console.log('   ⚠️  No SUPER_ADMIN found - run seed script')
    }
    console.log('')
    
    // Check 4: Validators
    console.log('4️⃣ Checking Validators:')
    try {
      const validators = require('./src/modules/admins/admins.validators')
      console.log('   ✅ Admin validators loaded')
      console.log('   ✅ createAdminValidator exists:', !!validators.createAdminValidator)
      console.log('')
    } catch (err) {
      console.log('   ❌ Error loading validators:', err.message)
      throw err
    }
    
    // Check 5: Service
    console.log('5️⃣ Checking Service:')
    try {
      const service = require('./src/modules/admins/admins.service')
      console.log('   ✅ Admin service loaded')
      console.log('   ✅ createAdmin function exists:', typeof service.createAdmin === 'function')
      console.log('')
    } catch (err) {
      console.log('   ❌ Error loading service:', err.message)
      console.log('   Stack:', err.stack)
      throw err
    }
    
    // Check 6: Routes
    console.log('6️⃣ Checking Routes:')
    try {
      const routes = require('./src/modules/admins/admins.routes')
      console.log('   ✅ Admin routes loaded')
      console.log('')
    } catch (err) {
      console.log('   ❌ Error loading routes:', err.message)
      throw err
    }
    
    // Check 7: App
    console.log('7️⃣ Checking App:')
    try {
      const app = require('./src/app')
      console.log('   ✅ App loaded successfully')
      console.log('')
    } catch (err) {
      console.log('   ❌ Error loading app:', err.message)
      console.log('   Stack:', err.stack)
      throw err
    }
    
    console.log('✅ All checks passed! Server should start without errors.')
    console.log('\nTo start the server, run: npm run dev')
    
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Diagnostic failed:', err.message)
    console.error('\nFull error:', err)
    process.exit(1)
  })
