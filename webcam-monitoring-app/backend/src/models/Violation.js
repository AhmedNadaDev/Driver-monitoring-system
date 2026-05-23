const mongoose = require('mongoose');

const VIOLATION_TYPES = ['cigarettes', 'vape', 'drowsy', 'cellphone', 'no_belt'];

const violationSchema = new mongoose.Schema(
  {
    type:       { type: String, required: true, enum: VIOLATION_TYPES },
    confidence: { type: Number, required: true },
    timestamp:  { type: Date, default: Date.now },
    imagePath:  { type: String },
    source:     { type: String, default: 'webcam' },
    model:      { type: String, default: null },

    // Trip context refs
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    route:  { type: mongoose.Schema.Types.ObjectId, ref: 'Route',  default: null },
    bus:    { type: mongoose.Schema.Types.ObjectId, ref: 'Bus',    default: null },
    trip:   { type: mongoose.Schema.Types.ObjectId, ref: 'Trip',   default: null },
  },
  { timestamps: true }
);

// Fast lookups by trip or type
violationSchema.index({ trip: 1, timestamp: -1 });
violationSchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model('Violation', violationSchema);
