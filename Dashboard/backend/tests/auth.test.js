const { agent, loginAs } = require('./helpers')
const Admin = require('../src/models/Admin')

describe('Auth API', () => {
  it('GET /health returns ok', async () => {
    const res = await agent().get('/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('login succeeds for super admin', async () => {
    const { admin } = await loginAs('superadmin', 'SuperAdmin@123!')
    expect(admin.role).toBe('SUPER_ADMIN')
    expect(admin.username).toBe('superadmin')
  })

  it('login fails with wrong password', async () => {
    const ag = agent()
    const csrfRes = await ag.get('/api/auth/csrf-token')
    const csrf = csrfRes.body.data.csrfToken
    const res = await ag
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ identifier: 'superadmin', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('locks account after repeated failures', async () => {
    await Admin.updateOne(
      { username: 'superadmin' },
      { $set: { failedLoginAttempts: 0, lockUntil: null } }
    )

    const maxAttempts = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10)
    const ag = agent()
    const csrfRes = await ag.get('/api/auth/csrf-token')
    const csrf = csrfRes.body.data.csrfToken

    for (let i = 0; i < maxAttempts; i++) {
      const fail = await ag
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({ identifier: 'superadmin', password: 'wrong' })
      expect(fail.status).toBe(401)
    }

    const locked = await ag
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ identifier: 'superadmin', password: 'SuperAdmin@123!' })

    expect(locked.status).toBe(423)

    await Admin.updateOne(
      { username: 'superadmin' },
      { $set: { failedLoginAttempts: 0, lockUntil: null } }
    )
  })

  it('GET /auth/me returns current user when authenticated', async () => {
    const { ag, csrf } = await loginAs('superadmin', 'SuperAdmin@123!')
    const res = await ag.get('/api/auth/me').set('X-CSRF-Token', csrf)
    expect(res.status).toBe(200)
    expect(res.body.data.admin.username).toBe('superadmin')
  })

  it('lists active sessions', async () => {
    const { ag, csrf } = await loginAs('superadmin', 'SuperAdmin@123!')
    const res = await ag.get('/api/auth/sessions').set('X-CSRF-Token', csrf)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.sessions)).toBe(true)
    expect(res.body.data.sessions.length).toBeGreaterThan(0)
  })
})
