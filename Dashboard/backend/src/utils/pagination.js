const parsePagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 1,
  hasNext: page * limit < total,
  hasPrev: page > 1,
})

module.exports = { parsePagination, buildPaginationMeta }
