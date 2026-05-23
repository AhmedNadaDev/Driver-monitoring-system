/**
 * Read-only Mongoose models that mirror the Dashboard backend's collections.
 * Both backends share the same MongoDB database (driver-monitoring), so we
 * just register models that point at the same collections.
 *
 * mongoose.model() will reuse an already-registered model, which is safe
 * even if the dashboard backend also has these model definitions.
 */
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  { id: String, name: String, avgScore: Number, totalTrips: Number },
  { collection: 'drivers' }
);

const routeSchema = new mongoose.Schema(
  { name: String },
  { collection: 'routes' }
);

const busSchema = new mongoose.Schema(
  { busId: String, capacity: Number },
  { collection: 'buses' }
);

// Guard against re-registration when using hot-reload
const Driver = mongoose.models.Driver || mongoose.model('Driver', driverSchema);
const Route  = mongoose.models.Route  || mongoose.model('Route',  routeSchema);
const Bus    = mongoose.models.Bus    || mongoose.model('Bus',    busSchema);

module.exports = { Driver, Route, Bus };
