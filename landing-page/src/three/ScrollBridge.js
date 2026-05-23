// Single mutable float — the only data crossing GSAP → Three.js boundary.
// GSAP writes via setTarget(); RAF reads via getSmoothed().
class ScrollBridge {
  constructor() {
    this._target   = 0
    this._smoothed = 0
  }

  // Called by GSAP ScrollTrigger onUpdate — no other logic here.
  setTarget(value) {
    this._target = Math.max(0, Math.min(1, value))
  }

  // Called once per RAF tick — applies damping.
  tick() {
    this._smoothed += (this._target - this._smoothed) * 0.055
  }

  getSmoothed() {
    return this._smoothed
  }

  getRaw() {
    return this._target
  }
}

export default ScrollBridge
