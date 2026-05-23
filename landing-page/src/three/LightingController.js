import * as THREE from 'three'

// Mood keyframes — each entry maps scrollProgress to lighting state
const MOODS = [
  {
    progress:  0.00,
    ambientInt: 0.25, ambientColor: 0x1a2744,
    mainInt:    1.2,  mainColor:    0x4fc3f7,
    accentInt:  0.8,  accentColor:  0x818cf8,
    rimColor:   0x38bdf8,
  },
  {
    progress:  0.20,
    ambientInt: 0.20, ambientColor: 0x1a0f1a,
    mainInt:    0.9,  mainColor:    0xff8a80,
    accentInt:  1.1,  accentColor:  0xf44336,
    rimColor:   0xff5252,
  },
  {
    progress:  0.40,
    ambientInt: 0.40, ambientColor: 0x0d2137,
    mainInt:    2.0,  mainColor:    0x00e5ff,
    accentInt:  1.0,  accentColor:  0x00bcd4,
    rimColor:   0x00e5ff,
  },
  {
    progress:  0.60,
    ambientInt: 0.45, ambientColor: 0x0d1a2a,
    mainInt:    1.6,  mainColor:    0x4fc3f7,
    accentInt:  0.7,  accentColor:  0x7c4dff,
    rimColor:   0x38bdf8,
  },
  {
    progress:  0.85,
    ambientInt: 0.55, ambientColor: 0x0d1a2a,
    mainInt:    1.8,  mainColor:    0xffffff,
    accentInt:  0.5,  accentColor:  0x818cf8,
    rimColor:   0x6366f1,
  },
  {
    progress:  1.00,
    ambientInt: 0.60, ambientColor: 0x0d1a2a,
    mainInt:    1.8,  mainColor:    0xffffff,
    accentInt:  0.5,  accentColor:  0x818cf8,
    rimColor:   0x6366f1,
  },
]

function lerpMood(progress) {
  let a = MOODS[0]
  let b = MOODS[MOODS.length - 1]

  for (let i = 0; i < MOODS.length - 1; i++) {
    if (progress >= MOODS[i].progress && progress <= MOODS[i + 1].progress) {
      a = MOODS[i]
      b = MOODS[i + 1]
      break
    }
  }

  const span = b.progress - a.progress
  const t = span === 0 ? 0 : (progress - a.progress) / span
  const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // ease in-out quad

  return { a, b, e }
}

const _cA = new THREE.Color()
const _cB = new THREE.Color()

class LightingController {
  constructor(scene) {
    // Ambient
    this.ambient = new THREE.AmbientLight(0x1a2744, 0.25)
    scene.add(this.ambient)

    // Main directional (top-left key)
    this.main = new THREE.DirectionalLight(0x4fc3f7, 1.2)
    this.main.position.set(8, 18, 6)
    this.main.castShadow = true
    this.main.shadow.mapSize.set(1024, 1024)
    this.main.shadow.camera.near = 0.5
    this.main.shadow.camera.far  = 60
    this.main.shadow.camera.left = this.main.shadow.camera.bottom = -12
    this.main.shadow.camera.right = this.main.shadow.camera.top  =  12
    this.main.shadow.bias = -0.001
    scene.add(this.main)

    // Accent fill (opposite side)
    this.accent = new THREE.DirectionalLight(0x818cf8, 0.8)
    this.accent.position.set(-6, 4, 8)
    scene.add(this.accent)

    // Ground rim (low angle, follows bus position)
    this.rim = new THREE.PointLight(0x38bdf8, 1.0, 12)
    this.rim.position.set(0, -0.3, 4)
    scene.add(this.rim)
  }

  update(scrollProgress, busX = 0) {
    const { a, b, e } = lerpMood(scrollProgress)

    this.ambient.intensity = a.ambientInt + (b.ambientInt - a.ambientInt) * e
    _cA.set(a.ambientColor); _cB.set(b.ambientColor)
    this.ambient.color.lerpColors(_cA, _cB, e)

    this.main.intensity = a.mainInt + (b.mainInt - a.mainInt) * e
    _cA.set(a.mainColor); _cB.set(b.mainColor)
    this.main.color.lerpColors(_cA, _cB, e)

    this.accent.intensity = a.accentInt + (b.accentInt - a.accentInt) * e
    _cA.set(a.accentColor); _cB.set(b.accentColor)
    this.accent.color.lerpColors(_cA, _cB, e)

    _cA.set(a.rimColor); _cB.set(b.rimColor)
    this.rim.color.lerpColors(_cA, _cB, e)

    // Rim follows bus along X
    this.rim.position.x = busX
  }
}

export default LightingController
