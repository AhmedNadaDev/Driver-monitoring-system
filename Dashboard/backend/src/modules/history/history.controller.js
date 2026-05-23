const historyService = require('./history.service')
const { sendSuccess } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.list = asyncHandler(async (req, res) => {
  const result = await historyService.listHistory(req.query)
  sendSuccess(res, result)
})

exports.exportCsv = asyncHandler(async (req, res) => {
  const csv = await historyService.exportHistoryCsv(req.query)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="audit-history.csv"')
  res.send(csv)
})
