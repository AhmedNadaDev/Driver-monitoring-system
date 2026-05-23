import * as THREE from 'three'

const WORLD_Z_AXIS = new THREE.Vector3(0, 0, 1)

class BusController {
  constructor(bus) {
    this.bus = bus
    this.wheels = bus.userData.wheels || []
    this.sensorLight = bus.userData.sensorLight

    this._floatTime = 0
    this._currentY   = 0
    this._targetY    = 0
    this._prevBusX   = 0
    this._sensorPulse = 0
  }

  update(scrollProgress, delta) {
    this._floatTime += delta

    // ── Vertical float (hero phase only) ──────────────────────────────────────
    if (scrollProgress < 0.18) {
      this._targetY = Math.sin(this._floatTime * 1.2) * 0.10
    } else {
      this._targetY = 0
    }
    this._currentY += (this._targetY - this._currentY) * 0.06
    this.bus.position.y = this._currentY

    // ── Forward motion along X (starts at 0.2, finishes at 0.85) ─────────────
    const moveT = Math.max(0, Math.min(1, (scrollProgress - 0.2) / 0.65))
    // ease in-out sine
    const eased = -(Math.cos(Math.PI * moveT) - 1) / 2
    const targetX = eased * 16
    this.bus.position.x += (targetX - this.bus.position.x) * 0.08

    // ── Wheel spin (based on actual displacement) ─────────────────────────────
    const speed = Math.abs(this.bus.position.x - this._prevBusX)
    this._prevBusX = this.bus.position.x
    if (speed > 0.0005) {
      this.wheels.forEach((w) => w.rotateOnWorldAxis(WORLD_Z_AXIS, speed * 2.2))
    }

    // ── Subtle body tilt when accelerating ───────────────────────────────────
    const tiltTarget = scrollProgress > 0.22 && scrollProgress < 0.78 ? -0.018 : 0
    this.bus.rotation.z += (tiltTarget - this.bus.rotation.z) * 0.04

    // ── Sensor light pulse ────────────────────────────────────────────────────
    if (this.sensorLight) {
      this._sensorPulse += delta * 2.4
      this.sensorLight.intensity = 2.0 + Math.sin(this._sensorPulse) * 0.8
    }
  }

  dispose() {
    if (this.bus.userData.dispose) this.bus.userData.dispose()
  }
}

export default BusController
