import * as THREE from 'three'

class SceneManager {
  constructor(canvas) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020817)
    this.scene.fog = new THREE.FogExp2(0x020817, 0.022)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
  }

  render(camera) {
    this.renderer.render(this.scene, camera)
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  dispose() {
    this.renderer.dispose()
  }
}

export default SceneManager
