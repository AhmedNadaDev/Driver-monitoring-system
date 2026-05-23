import { describe, it, expect } from 'vitest'

const unwrap = (payload) => {
  if (payload && typeof payload === 'object' && payload.success === true && 'data' in payload) {
    return payload.data
  }
  return payload
}

describe('apiClient unwrap', () => {
  it('unwraps success envelope', () => {
    expect(unwrap({ success: true, data: { admin: { id: '1' } } })).toEqual({
      admin: { id: '1' },
    })
  })

  it('passes through legacy responses', () => {
    expect(unwrap([{ id: 1 }])).toEqual([{ id: 1 }])
  })
})
