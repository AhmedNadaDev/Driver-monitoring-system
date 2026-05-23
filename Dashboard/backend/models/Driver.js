const mongoose = require('mongoose')

const driverSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Driver ID is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    avgScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Driver', driverSchema)
