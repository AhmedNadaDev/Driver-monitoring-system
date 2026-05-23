const mongoose = require('mongoose')

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Route', routeSchema)
