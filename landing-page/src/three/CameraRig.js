import * as THREE from 'three'

// Scroll milestones → camera orbital angles (radians from front-right)
const KEYFRAMES = [
  { progress: 0.00, angle: 0.55, radius: 11, height: 3.8, lookY: 0.8 },
  { progress: 0.20, angle: 0.80, radius: 10, height: 3.2, lookY: 0.8 },
  { progress: 0.40, angle: 1.10, radius:  8, height: 2.4, lookY: 0.6 },
  { progress: 0.60, angle: 0.40, radius:  7, height: 2.2, lookY: 0.6 },
  { progress: 0.85, angle: 0.60, radius:  9, height: 2.8, lookY: 0.8 },
  { progress: 1.00, angle: 0.55, radius:  9, height: 2.8, lookY: 0.8 },
]

function lerpKeyframes(progress) {
  let a = KEYFRAMES[0]
  let b = KEYFRAMES[KEYFRAMES.length - 1]

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (progress >= KEYFRAMES[i].progress && progress <= KEYFRAMES[i + 1].progress) {
      a = KEYFRAMES[i]
      b = KEYFRAMES[i + 1]
      break
    }
  }

  const span = b.progress - a.progress
  const t = span === 0 ? 0 : (progress - a.progress) / span
  // ease in-out cubic
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  return {
    angle:  a.angle  + (b.angle  - a.angle)  * e,
    radius: a.radius + (b.radius - a.radius) * e,
    height: a.height + (b.height - a.height) * e,
    lookY:  a.lookY  + (b.lookY  - a.lookY)  * e,
  }
}

class CameraRig {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      300,
    )

    this._pos    = new THREE.Vector3()
    this._lookAt = new THREE.Vector3()
    this._target = new THREE.Vector3()

    // Gentle hero auto-orbit
    this._heroOrbit = 0

    // Initialize at scroll=0
    const kf = lerpKeyframes(0)
    this._pos.set(
      Math.sin(kf.angle) * kf.radius,
      kf.height,
      Math.cos(kf.angle) * kf.radius,
    )
    this._lookAt.set(0, kf.lookY, 0)
    this.camera.position.copy(this._pos)
    this.camera.lookAt(this._lookAt)
  }

  update(scrollProgress, delta) {
    const DAMPING = 0.07

    const kf = lerpKeyframes(scrollProgress)

    // Slow auto-orbit only in hero phase
    if (scrollProgress < 0.18) {
      this._heroOrbit += delta * 0.18
    } else {
      this._heroOrbit *= 0.97 // decay
    }

    const angle = kf.angle + this._heroOrbit
    this._target.set(
      Math.sin(angle) * kf.radius,
      kf.height,
      Math.cos(angle) * kf.radius,
    )

    this._pos.lerp(this._target, DAMPING)
    this.camera.position.copy(this._pos)

    this._lookAt.lerp(new THREE.Vector3(0, kf.lookY, 0), DAMPING)
    this.camera.lookAt(this._lookAt)
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }
}

export default CameraRig
