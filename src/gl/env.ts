import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** One PMREM'd studio environment per renderer, shared by every 3D scene (no HDRI file). */
const cache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>()

export function getEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  let env = cache.get(renderer)
  if (!env) {
    const pm = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    env = pm.fromScene(room, 0.04).texture
    room.dispose()
    pm.dispose()
    cache.set(renderer, env)
  }
  return env
}
