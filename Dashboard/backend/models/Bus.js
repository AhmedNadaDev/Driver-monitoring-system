const mongoose = require('mongoose')

const busSchema = new mongoose.Schema(
  {
    busId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      enum: {
        values: [27, 50],
        message: 'Capacity must be 27 or 50',
      },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Bus', busSchema)
