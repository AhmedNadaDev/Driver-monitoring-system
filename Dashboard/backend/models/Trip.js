const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver',    required: true },
    route:      { type: mongoose.Schema.Types.ObjectId, ref: 'Route',     default: null },
    bus:        { type: mongoose.Schema.Types.ObjectId, ref: 'Bus',       default: null },
    startTime:  { type: Date,    default: Date.now },
    endTime:    { type: Date,    default: null },
    active:     { type: Boolean, default: true },
    score:      { type: Number,  default: 100 },
    violations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Violation' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);
