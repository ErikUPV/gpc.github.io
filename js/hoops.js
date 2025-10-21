
var THREE = window.THREE;
var CANNON = window.CANNON;   
// utils for syncing THREE -> Cannon
const _wp = new THREE.Vector3();
const _wq = new THREE.Quaternion();

// optional: enforce circuit order

// temp vectors to avoid allocs
const tmpN = new CANNON.Vec3();


function getHoopWorldNormal(hoopBody) {
  // worldN = R(q) * localNormal
  hoopBody.quaternion.vmult(hoopBody.userData.localNormal, tmpN);
  return tmpN;
}

function signedDistanceToHoopPlane(point, hoopBody) {
  const n = getHoopWorldNormal(hoopBody);           // world normal
  const c = hoopBody.position;                      // plane point (center)
  // d = n · (p - c)
  return n.x*(point.x - c.x) + n.y*(point.y - c.y) + n.z*(point.z - c.z);
}



function visualizeBodyExact(body, scene, r, h, segments = 24, color = 0x00ffff) {
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
  const g = new THREE.Group();
  scene.add(g);

  // Three cylinder is +Y; convert to +Z to match our Cannon setup
  const geo = new THREE.CylinderGeometry(r, r, h, segments);
  geo.rotateX(Math.PI / 2); // Rotate from +Y to +Z to match the physics

  const mesh = new THREE.Mesh(geo, mat);
  // NO quaternion application needed - the geometry rotation handles it
  g.add(mesh);

  // Position and orient the group to match the body
  g.position.set(body.position.x, body.position.y, body.position.z);
  g.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
  body.threeDebugMesh = g;
}

// Call this when you create your hoops


function addHoopBodyFor(hoop, world, scene, radius = 4, thickness = 0.5, segments = 16, index = 0) {
    const shape = new CANNON.Cylinder(radius, radius, thickness, segments);

    const body  = new CANNON.Body({
        mass: 0,
        material: new CANNON.Material('hoop'),
    });

    // Cylinder axis is +X by default -> rotate 90º around Y so axis becomes +Z
    const shapeLocalQ = new CANNON.Quaternion();
    shapeLocalQ.setFromEuler(0, Math.PI / 2, 0, 'XYZ');
    body.addShape(shape, new CANNON.Vec3(0, 0, 0), shapeLocalQ);

    // Keep non-blocking hoop, but it will still emit contacts
    body.collisionResponse = false;

    // With axis now +Z, the forward normal is +Z in local space:
    body.userData = {
        type: 'hoop',
        index,
        localNormal: new CANNON.Vec3(0, 0, 1),
        touched: false,
        mesh: hoop,
        hoopTimer: 0.0,
        direction: 1
    };

    hoop.updateWorldMatrix(true, false);
    hoop.getWorldPosition(_wp);
    hoop.getWorldQuaternion(_wq);

    body.position.set(_wp.x, _wp.y, _wp.z);
    body.quaternion.set(_wq.x, _wq.y, _wq.z, _wq.w);

    world.addBody(body);
    hoop.userData.physicsBody = body;

  // visualizeBodyExact(body, scene, 4);
    return body;
}





function createHoop(radius = 4, tube = 0.6) {
    // const hoop = new THREE.Group();
    const rimGeo = new THREE.TorusGeometry(radius, tube, 16, 100);
    const rimMat = new THREE.MeshPhongMaterial({ color: 0xff4400, specular: 0xff4400, shininess: 100 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.castShadow = true; 
    // rimMesh.rotation.x = Math.PI / 2;
    // hoop.add(rimMesh);

    return rimMesh;
} 

function createPoints(numPoints, radius, noiseAmp = 2) {
    const points = [];
    const angleStep = (2 * Math.PI) / numPoints;

    for (let i = 0; i < numPoints; i++) {
        const noise = (Math.random() - 0.5) * noiseAmp;
        const angle = i * angleStep;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        points.push(new THREE.Vector3(x + noise, 0, z + noise));
    }
    return points;
}

function createCircuit(points, tubeRadius, showCurve = false) {
  const circuit = new THREE.Group();

  for (let i = 0; i < points.length; i++) {
    const hoop = createHoop();

    // Place + orient visually first
    const prev = points[(i - 1 + points.length) % points.length];
    const dirVec = points[i].clone().sub(prev).normalize();
    const lookAt = points[i].clone().add(dirVec);

    hoop.position.copy(points[i]);
    hoop.lookAt(lookAt);       // orient the hoop
    hoop.position.y = Math.random() * 5 + 3;       // your visual offset

    circuit.add(hoop);
  }

  // Tube just for visuals (optional)
  if (showCurve) {
    const curve = new THREE.CatmullRomCurve3(points);
    curve.closed = true;
    const geometry = new THREE.TubeGeometry(curve, 200, tubeRadius, 8, true);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.sub(new THREE.Vector3(0, 5, 0))
    circuit.add(mesh);
  }

  return circuit;
}

// after scene.add(circuit); and after you set circuit.position/rotation/scale
function buildHoopColliders(circuit, world, scene, radius = 4, thickness = 0.5) {
  let idx = 0;
  circuit.updateWorldMatrix(true, true);
  circuit.traverse(obj => {
    const isHoop = obj.isMesh && obj.geometry instanceof THREE.TorusGeometry;
    if (isHoop) addHoopBodyFor(obj, world, scene, radius, thickness, 16, idx++);
  });
}

const vectorResta = new THREE.Vector3();
 

function handleHoopTouch(hoopBody, dt) {
  if (!hoopBody || !hoopBody.userData?.mesh) return;

  const mesh = hoopBody.userData.mesh;
  const data = hoopBody.userData;

  // if first time triggered
  if (data.hoopTimer <= 0) {
    data.hoopTimer = 0.2;   // total animation duration (seconds)
  }

  // progress from 0 → 1 over time
  data.hoopTimer -= dt;
  const progress = 1 - Math.max(data.hoopTimer, 0) / 0.2;
  const og_scale = mesh.scale.x;

  // --- first half (grow to 1.4x), second half (shrink to 0) ---
  if (progress < 0.5) {
    const t = progress / 0.5;
    const s = THREE.MathUtils.lerp(og_scale, 3, t);
    mesh.scale.setScalar(s);
  } else {
    const t = (progress - 0.5) / 0.5;
    const s = THREE.MathUtils.lerp(1.4, 0, t);
    mesh.scale.setScalar(s);
  }

  // when finished, disable and hide mesh
  if (data.hoopTimer <= 0) {
    data.touched = false;
    mesh.visible = false;
    mesh.scale.setScalar(0);
  }
}


// function initHoopPassthrough(circuit, radius, world) {
//     console.log(circuit.children);
//     for (let i = 0; i < circuit.children.length; i++) {
//         const child = circuit.children[i];
//         if (child.type === "Mesh") {
//             const shape = new CANNON.Cylinder(radius, radius, 0.5, 8);
//             const body = new CANNON.Body({ mass: 0 });
//             body.addShape(shape);
//             body.position.set(child.position.x, child.position.y, child.position.z);
//             body.quaternion.setFromEuler(child.rotation.x, child.rotation.y, child.rotation.z, 'XYZ');
//             world.addBody(body);
//         }
//     }
// }



window.Hoops = {
  createHoop,
  createCircuit,
  createPoints,
  buildHoopColliders,
  signedDistanceToHoopPlane,
  getHoopWorldNormal,
  handleHoopTouch
};

