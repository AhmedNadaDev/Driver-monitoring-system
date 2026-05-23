const Admin = require('../models/Admin')
const config = require('../config')
const { ROLES } = require('../utils/constants')

const seedSuperAdmin = async () => {
  const existing = await Admin.findOne({ role: ROLES.SUPER_ADMIN })
  if (existing) {
    console.log('✅ SUPER_ADMIN already exists:', existing.username)
    return existing
  }

  const admin = await Admin.create({
    username: config.superAdmin.username.toLowerCase(),
    email: config.superAdmin.email.toLowerCase(),
    password: config.superAdmin.password,
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  })

  console.log('✅ Initial SUPER_ADMIN created:', admin.username)
  console.log('   ⚠️  Change SUPER_ADMIN_PASSWORD in production immediately')
  return admin
}

module.exports = seedSuperAdmin
