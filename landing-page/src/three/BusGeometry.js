import * as THREE from 'three'

// Creates a low-poly AI transit bus — all procedural, no textures
function createBus() {
  const group = new THREE.Group()

  // ─── Materials ──────────────────────────────────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0c1628,
    metalness: 0.45,
    roughness: 0.55,
  })
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x162032,
    metalness: 0.5,
    roughness: 0.5,
  })
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0369a1),
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.72,
    metalness: 0.1,
    roughness: 0.05,
  })
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.15,
    roughness: 0.85,
  })
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    metalness: 0.7,
    roughness: 0.3,
  })
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xbfdbfe),
    emissiveIntensity: 0.9,
  })
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    emissive: new THREE.Color(0xff3333),
    emissiveIntensity: 0.7,
  })
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 1.2,
  })
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0ea5e9),
    emissiveIntensity: 0.4,
    metalness: 0.6,
    roughness: 0.3,
  })

  // ─── Main body ──────────────────────────────────────────────────────────────
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.7, 2.3), bodyMat)
  body.position.y = 0.72
  group.add(body)

  // ─── Roof ───────────────────────────────────────────────────────────────────
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.22, 2.15), trimMat)
  roof.position.y = 1.65
  group.add(roof)

  // ─── Windshield (front glass) ────────────────────────────────────────────────
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 1.6), glassMat)
  windshield.position.set(2.55, 0.9, 0)
  group.add(windshield)

  // ─── Rear window ────────────────────────────────────────────────────────────
  const rearWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.4), glassMat)
  rearWin.position.set(-2.55, 0.88, 0)
  group.add(rearWin)

  // ─── Side windows (InstancedMesh — 4 per side = 8 total, 1 draw call) ───────
  const winGeo = new THREE.BoxGeometry(0.76, 0.52, 0.07)
  const winMesh = new THREE.InstancedMesh(winGeo, glassMat, 8)
  const wm = new THREE.Matrix4()
  const winXPositions = [-1.65, -0.75, 0.15, 1.05]
  let wi = 0
  winXPositions.forEach((x) => {
    wm.makeTranslation(x, 0.88,  1.16)
    winMesh.setMatrixAt(wi++, wm)
    wm.makeTranslation(x, 0.88, -1.16)
    winMesh.setMatrixAt(wi++, wm)
  })
  winMesh.instanceMatrix.needsUpdate = true
  group.add(winMesh)

  // ─── Side accent stripe (emissive line along body) ──────────────────────────
  const stripeGeo = new THREE.BoxGeometry(5.1, 0.06, 0.04)
  const stripe1 = new THREE.Mesh(stripeGeo, accentMat)
  stripe1.position.set(0, 0.35, 1.15)
  const stripe2 = new THREE.Mesh(stripeGeo, accentMat)
  stripe2.position.set(0, 0.35, -1.15)
  group.add(stripe1, stripe2)

  // ─── Wheels (4 regular meshes — easier per-frame rotation) ─────────────────
  const tyrGeo  = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 12)
  const hubGeo  = new THREE.CylinderGeometry(0.18, 0.18, 0.40, 8)
  const wheelPositions = [
    [-1.65, -1.18],
    [-1.65,  1.18],
    [ 1.40, -1.18],
    [ 1.40,  1.18],
  ]
  const wheels = []
  wheelPositions.forEach(([wx, wz]) => {
    const tyre = new THREE.Mesh(tyrGeo, wheelMat)
    tyre.rotation.x = Math.PI / 2
    tyre.position.set(wx, -0.08, wz)

    const hub = new THREE.Mesh(hubGeo, hubMat)
    hub.rotation.x = Math.PI / 2
    hub.position.set(wx, -0.08, wz)

    wheels.push(tyre) // only tyre ref needed for spin
    group.add(tyre, hub)
  })
  group.userData.wheels = wheels

  // ─── Headlights (front, instanced, 1 draw call) ─────────────────────────────
  const hlGeo = new THREE.BoxGeometry(0.25, 0.18, 0.42)
  const hlMesh = new THREE.InstancedMesh(hlGeo, headMat, 2)
  const hm = new THREE.Matrix4()
  hm.makeTranslation(2.58, 0.55,  0.62); hlMesh.setMatrixAt(0, hm)
  hm.makeTranslation(2.58, 0.55, -0.62); hlMesh.setMatrixAt(1, hm)
  hlMesh.instanceMatrix.needsUpdate = true
  group.add(hlMesh)

  // ─── Tail lights (rear, instanced, 1 draw call) ──────────────────────────────
  const tlGeo = new THREE.BoxGeometry(0.25, 0.28, 0.44)
  const tlMesh = new THREE.InstancedMesh(tlGeo, tailMat, 2)
  const tm = new THREE.Matrix4()
  tm.makeTranslation(-2.58, 0.60,  0.65); tlMesh.setMatrixAt(0, tm)
  tm.makeTranslation(-2.58, 0.60, -0.65); tlMesh.setMatrixAt(1, tm)
  tlMesh.instanceMatrix.needsUpdate = true
  group.add(tlMesh)

  // ─── AI sensor housing (roof-mounted) ────────────────────────────────────────
  const sensorHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.28, 0.55),
    sensorMat,
  )
  sensorHousing.position.set(0.6, 1.90, 0)
  group.add(sensorHousing)
  group.userData.sensor = sensorHousing

  // Sensor point light (counts as lighting, not draw call)
  const sensorLight = new THREE.PointLight(0x38bdf8, 2.5, 5)
  sensorLight.position.set(0.6, 2.1, 0)
  group.add(sensorLight)
  group.userData.sensorLight = sensorLight

  // ─── Enable shadows ──────────────────────────────────────────────────────────
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = false
    }
  })

  // ─── Dispose helper ──────────────────────────────────────────────────────────
  group.userData.dispose = () => {
    group.traverse((child) => {
      if (child.isMesh || child.isInstancedMesh) {
        child.geometry.dispose()
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((m) => m.dispose())
      }
    })
  }

  return group
}

export default createBus
