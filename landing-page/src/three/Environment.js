import * as THREE from 'three'

function createEnvironment(scene) {
  // ── Road surface ──────────────────────────────────────────────────────────
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x08101e,
    metalness: 0.05,
    roughness: 0.92,
  })
  const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 9), roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.y = -0.52
  road.receiveShadow = true
  scene.add(road)

  // ── Center lane (emissive glow line) ──────────────────────────────────────
  const laneMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: new THREE.Color(0x0ea5e9),
    emissiveIntensity: 0.35,
  })
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(300, 0.08), laneMat)
  lane.rotation.x = -Math.PI / 2
  lane.position.y = -0.515
  scene.add(lane)

  // ── Road edge markers (InstancedMesh — single draw call) ─────────────────
  const markerGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06)
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 1.0,
  })
  const markerCount = 120
  const markers = new THREE.InstancedMesh(markerGeo, markerMat, markerCount)
  const mm = new THREE.Matrix4()
  let mi = 0
  for (let x = -30; x <= 30 && mi < markerCount; x += 1.5) {
    mm.makeTranslation(x, -0.48,  4.3); markers.setMatrixAt(mi++, mm)
    if (mi < markerCount) {
      mm.makeTranslation(x, -0.48, -4.3); markers.setMatrixAt(mi++, mm)
    }
  }
  markers.count = mi
  markers.instanceMatrix.needsUpdate = true
  scene.add(markers)

  // ── Grid (subtle depth cue) ───────────────────────────────────────────────
  const grid = new THREE.GridHelper(300, 80, 0x0e1a2e, 0x0a1220)
  grid.position.y = -0.52
  scene.add(grid)

  // ── Star field (PointsMaterial — 1 draw call) ────────────────────────────
  const starCount = 600
  const starPos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3 + 0] = (Math.random() - 0.5) * 280
    starPos[i * 3 + 1] = Math.random() * 50 + 8
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 80
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0x7dd3fc,
    size: 0.12,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  })
  scene.add(new THREE.Points(starGeo, starMat))

  // ── Horizon glow (large back plane with emissive gradient effect) ─────────
  const horizonMat = new THREE.MeshBasicMaterial({
    color: 0x050d1a,
    side: THREE.BackSide,
  })
  const horizonSphere = new THREE.Mesh(new THREE.SphereGeometry(150, 16, 8), horizonMat)
  scene.add(horizonSphere)

  // Cleanup helper
  return () => {
    ;[road, lane, markers, grid].forEach((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      }
    })
    starGeo.dispose()
    starMat.dispose()
    horizonMat.dispose()
    horizonSphere.geometry.dispose()
  }
}

export default createEnvironment
