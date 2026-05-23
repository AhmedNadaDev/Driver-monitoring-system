const { loginAs } = require('./helpers')

describe('RBAC', () => {
  let superSession
  let adminSession

  beforeAll(async () => {
    superSession = await loginAs('superadmin', 'SuperAdmin@123!')
    const username = `testadmin_${Date.now()}`

    const created = await superSession.ag
      .post('/api/admins')
      .set('X-CSRF-Token', superSession.csrf)
      .send({
        username,
        email: `${username}@example.com`,
        password: 'TestAdmin@123!',
      })
    expect(created.status).toBe(201)

    adminSession = await loginAs(username, 'TestAdmin@123!')
  })

  it('SUPER_ADMIN can access history', async () => {
    const res = await superSession.ag
      .get('/api/history')
      .set('X-CSRF-Token', superSession.csrf)
    expect(res.status).toBe(200)
    expect(res.body.data.items).toBeDefined()
  })

  it('ADMIN cannot access history', async () => {
    const res = await adminSession.ag
      .get('/api/history')
      .set('X-CSRF-Token', adminSession.csrf)
    expect(res.status).toBe(403)
  })

  it('ADMIN cannot list admins', async () => {
    const res = await adminSession.ag
      .get('/api/admins')
      .set('X-CSRF-Token', adminSession.csrf)
    expect(res.status).toBe(403)
  })

  it('ADMIN can access drivers API', async () => {
    const res = await adminSession.ag
      .get('/api/drivers')
      .set('X-CSRF-Token', adminSession.csrf)
    expect(res.status).toBe(200)
  })

  it('ADMIN can update own profile', async () => {
    const res = await adminSession.ag
      .get('/api/admins/profile')
      .set('X-CSRF-Token', adminSession.csrf)
    expect(res.status).toBe(200)
    expect(res.body.data.admin.role).toBe('ADMIN')
  })

  it('rejects weak password on admin create', async () => {
    const res = await superSession.ag
      .post('/api/admins')
      .set('X-CSRF-Token', superSession.csrf)
      .send({
        username: 'weakuser',
        email: 'weak@example.com',
        password: 'short',
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})
