const express = require('express')
const historyController = require('./history.controller')
const { authenticate, authorize } = require('../../middlewares/auth')
const { ROLES } = require('../../utils/constants')

const router = express.Router()

router.use(authenticate, authorize(ROLES.SUPER_ADMIN))
router.get('/export', historyController.exportCsv)
router.get('/', historyController.list)

module.exports = router
