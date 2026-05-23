const request = require('supertest')

const agent = () => request.agent(global.app)

const getCsrf = async (ag) => {
  const res = await ag.get('/api/auth/csrf-token')
  return res.body.data?.csrfToken || res.body.csrfToken
}

const loginAs = async (identifier, password) => {
  const ag = agent()
  const csrf = await getCsrf(ag)
  const res = await ag
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ identifier, password })
  const token = res.body.data?.csrfToken || res.body.csrfToken
  return { ag, csrf: token, admin: res.body.data?.admin || res.body.admin }
}

module.exports = { agent, getCsrf, loginAs }
