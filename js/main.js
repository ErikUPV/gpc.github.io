// main.js — skeleton (Three.js r140 + cannon-es)
// Usage: import as ES modules from your HTML
// <script type="module" src="main.js"></script>
// import * as THREE from '../lib/three.module.js';
// import * as CANNON from '../lib/cannon-es.js';
// import { OrbitControls } from '../lib/OrbitControls.module.js';
// import { Sky } from '../lib/Sky.js';
// import { placeIslandsSimple } from './islands.js';
// import { createCircuit, createHoop, createPoints, buildHoopColliders, signedDistanceToHoopPlane, getHoopWorldNormal, handleHoopTouch } from './hoops.js';
// import Stats from '../lib/stats.module.js'
// import { FBXLoader } from '../lib/FBXLoader.module.js';
// import { GLTFLoader } from '../lib/GLTFLoader.module.js';


(() => {
  'use strict';




  // ---------- Globals ----------
  const gltfLoader = new THREE.GLTFLoader();

  let gameState = "notStarted";

  let firstHoopPosition;
  let nextHoopIndex = 0;
  let nextHoopIndexText;
  let renderer, scene, camera;
  let world;
  let waterMesh, waterGeo;
  let sky;
  let playerBody;
  let stamina = 100.0;
  let circuit;
  let playerGroup = new THREE.Group();
  let speed = 40;
  let cameraControls;
  let clock = new THREE.Clock();
  let stats = new Stats();
  let currentFov;
  let targetFov = 60;
  let mixer = null;
  const actions = {};        // <- instead of let actions;
  const animationNames = []; // <- instead of let animationNames;
  let currentAnimationIndex = -1;
  var bar;
  var cameraTop;
  let playerArrow;

  var textCanvas, ctx;

  var touchedHoop;

  let speedTimer = 0.0;
  let animationTimer = 0.0;
  let regenerationTimer = 0.0;
  let restartTimer = 0.0;
  let isJumping = false;

  // stats.dom.style.transform = 'scale(2)';   // 2× size
  // stats.dom.style.transformOrigin = 'top left';

  document.body.appendChild(stats.dom);

  
  // (Optional) input map
  const keys = Object.create(null);
  window.addEventListener('keydown', e => (keys[e.code] = true));
  window.addEventListener('keyup', e => (keys[e.code] = false));


  const _tq = new THREE.Quaternion();
  const _te = new THREE.Euler(0, 0, 0, 'YXZ');

  function getBodyYaw(body) {               // extract yaw from Cannon quat
    _tq.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    _te.setFromQuaternion(_tq, 'YXZ');
    return _te.y;
  }
  function setBodyYaw(body, yaw) {          // set yaw-only (zero pitch/roll)
    _tq.setFromEuler(_te.set(0, yaw, 0, 'YXZ'));
    body.quaternion.set(_tq.x, _tq.y, _tq.z, _tq.w);
  }

// Add at the top with your other imports

/**
 * Load a glTF/.glb and add it to the scene.
 * @param {string} url - Path to the .gltf or .glb file.
 * @param {Object} [opts]
 * @param {THREE.Object3D} [opts.parent=scene] - Where to attach the model.
 * @param {(ev: ProgressEvent<EventTarget>) => void} [opts.onProgress] - Optional progress callback.
 * @returns {Promise<THREE.Object3D>} resolves with the root object (gltf.scene).
 */
function loadGltfModel(url, { parent = scene, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!root) {
          reject(new Error('GLTF has no scene'));
          return;
        }

        // Keep lighting under your control (glTF may include punctual lights)
        root.traverse((n) => {
          if (n.isLight) n.visible = false;
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });

        parent.add(root);
        resolve(root);
      },
      onProgress,
      (err) => reject(err)
    );
  });
}

  
  // ---------- Three ----------
  function initThree() {


    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.style.margin = '0';
    document.body.appendChild(renderer.domElement);


    bar = document.getElementById('gui-bar-fill');

    textCanvas = document.getElementById("text_canvas");
    textCanvas.width = window.innerWidth;
    textCanvas.height = window.innerHeight;
    ctx = textCanvas.getContext("2d");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4cbaed);

    camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 400
    );
    camera.position.set(0, 3, 6);
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.8);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);

    scene.add(hemi, dir);
    dir.castShadow = true;
    // vista de planta
    cameraTop = new THREE.OrthographicCamera( 200, -200, -200, 200, 1, 1000 );
    cameraTop.position.set(0,500,0);
    cameraTop.lookAt( 0, 0, 0 );
    cameraTop.up.set( 0, 1, 0 );
    cameraTop.updateProjectionMatrix();  

    window.addEventListener('resize', onResize);


  }



  // function createGaussianMountain(sigma, height, res, size) {
  //   const geo = new THREE.PlaneGeometry(size, size, res, res);
  //   geo.rotateX(-Math.PI / 2); // make it horizontal


  //   const gaussian = (x, z) => {
  //     let numerator = Math.exp(-0.5 * (x*x + z*z) / (sigma * sigma))
  //     let denominator = 2 * Math.PI * sigma * sigma

  //     return numerator
  //   }

  //   const noise = () => (Math.random() - 0.5) * 0.1
  //   const count = geo.attributes.position.count
  //   for (let i = 0; i < count; i++) {
  //     const x = geo.attributes.position.getX(i);
  //     const z = geo.attributes.position.getZ(i);
  //     const fxz = height * gaussian(x, z) + noise();

  //     if (fxz > 0.2) geo.attributes.position.setY(i, fxz);
  //     else geo.attributes.position.setY(i, -9999)

  //     console.log(fxz)
  //   }

  //   geo.attributes.position.needsUpdate = true;
  //   geo.computeVertexNormals();


  //   const mat = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.7, side: THREE.DoubleSide });
  //   const mesh = new THREE.Mesh(geo, mat);

  //   return mesh
  // }

  //   function changeAnimation(index) {

  //     if(currentAnimationIndex==index)
  //         return;
  //     // Reproducir la nueva animación
  //     console.log(animationNames[index])
  //     console.log(actions[animationNames[index]])
  //     actions[animationNames[index]].play();
  //     //  Detener la animación anterior
  //     actions[animationNames[currentAnimationIndex]].stop();
  //     currentAnimationIndex = index;
  // }

  let activeAction = null;
let previousAction = null;

function fadeToAction(nextName, duration = 0.35, warp = true) {
  if (!mixer) return;
  const next = actions[nextName];
  if (!next) return;

  previousAction = activeAction;
  activeAction = next;

  // Ensure the new action is ready
  activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

  if (previousAction && previousAction !== activeAction) {
    // --- Phase sync: map current normalized time into next clip ---
    const prevClip = previousAction.getClip();
    const nextClip = activeAction.getClip();
    if (prevClip && nextClip && prevClip.duration > 0 && nextClip.duration > 0) {
      const normalized = previousAction.time / prevClip.duration; // 0..1
      activeAction.time = normalized * nextClip.duration;
    }

    // Fade the old one out and the new one in
    previousAction.crossFadeTo(activeAction, duration, warp);
  } else {
    // First play or same action -> just fade in
    activeAction.fadeIn(duration);
  }

  activeAction.play();
}


  function changeAnimation(index) {

    if (!mixer || index === currentAnimationIndex) return;
    const nextName = animationNames[index];
    const prevName = animationNames[currentAnimationIndex];

    if (nextName && actions[nextName]) {
      const next = actions[nextName];
      // nice fade between clips
      if (prevName && actions[prevName]) {
        actions[prevName].crossFadeTo(next, 0.2, false);
      }
      next.reset().play();
      currentAnimationIndex = index;
    }
  }

  function ensureHolder(body){
  if (!body.holder){
    body.holder = new THREE.Group();
    scene.add(body.holder);
  }
}


  function loadNewModel(body, pathBase, animFiles, texturePath, isJetski = false) {
    const loader = new THREE.FBXLoader();
    const texture = new THREE.TextureLoader().load(texturePath);

    // Remove the previous model if any
    if (body.threemesh && !isJetski) {
      scene.remove(body.threemesh);
      body.threemesh.traverse(c => {
        if (c.isMesh) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      body.threemesh = null;
    }

    loader.load(pathBase, function (object) {
      // scene.add(object);

      object.traverse((child) => {
        if (child.isMesh) {
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
        if (child.isLight) {
          // Soft-disable lights from the asset without touching your scene lighting
          child.visible = false;          // don’t render
          child.intensity = 0;            // no contribution
          child.layers.set(31);           // also isolate on an unused layer
          // child.castShadow = false; child.shadow && (child.shadow.autoUpdate = false);
        }
      });


      // normalize size (~2 m tall)
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = 2.0 / size.y;
      object.scale.setScalar(scale);
      playerGroup.add(object)
      object.position.set(0, 0, 0);
      object.rotation.set(0, 0, 0);
      object.updateMatrixWorld(true);


      if (!isJetski) {
        
        // link to physics body
        body.threemesh = object;
        // object.position.copy(body.position);

        // new mixer
        mixer = new THREE.AnimationMixer(object);
        mixer.addEventListener('finished', (e) => {


          if (currentAnimationIndex == 1) {
            changeAnimation(2);
          }
        });
        Object.keys(actions).forEach(k => delete actions[k]);
        animationNames.length = 0;
        currentAnimationIndex = -1;
        object.position.set(0, +0.5, -1.2);

        // load animations
        let loadedCount = 0;
        animFiles.forEach((file, i) => {
          loader.load(file, (animData) => {
            const name = file.split('/').pop().replace(/\.fbx$/i, '');
            const action = mixer.clipAction(animData.animations[0]);
            if (name.toLowerCase().includes('flair')) {
              action.loop = THREE.LoopOnce;
              action.clampWhenFinished = true;
            } else {
              action.loop = THREE.LoopRepeat;
            }

 
            actions[name] = action;
            animationNames[i] = name;
            loadedCount++;

            if (loadedCount === animFiles.length) {
              console.log('✅ All animations loaded for', pathBase);
            }
          });
        });
      } else {

        object.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              metalness: 0.5,
              roughness: 0.5
            });
          }
        });

        body.jetski = object;
        // object.position.copy(body.position);
      }


    });
  }


  function loadModelAndAnimations() {

    loadNewModel(playerBody, 'models/jetperson/Porfa2.fbx', ['models/jetperson/Idle.fbx', 'models/jetperson/Flair.fbx', 'models/jetperson/Falling Idle.fbx'], 'models/jetperson/jacky_jetski_tex_highres.png');
    loadNewModel(playerBody, 'models/jetski/Jetski2.fbx', [], 'models/jetperson/jacky_jetski_tex_highres.png', true);

    // const loader = new FBXLoader();
    // const texture = new THREE.TextureLoader().load('models/jetperson/jacky_jetski_tex_highres.png');
    // // Cargar modelo base
    // loader.load('models/jetski/Jetski.fbx', function (object) {
    //     // playerMesh = object;
    //     scene.add(object);
    //     object.position.set(0, 0, 0);

    //     object.traverse((child) => {

    //     if (child.isMesh) {
    //       child.material.map = texture;
    //       child.material.needsUpdate = true;
    //     }
    //   }); 

    //   const lightsToRemove = [];
    //   object.traverse((n) => {
    //     if (n.isLight) lightsToRemove.push(n);
    //   });
    //   lightsToRemove.forEach((n) => {
    //     if (n.parent) n.parent.remove(n);
    //   });



    //     // Vamos a ajustar el tamaño del mesh para que su altura sea 2 metros.
    //     var box = new THREE.Box3().setFromObject(object);
    //     var size = new THREE.Vector3();
    //     box.getSize(size);
    //     var s = 2.0 / size.y;
    //     object.scale.set(s,s,s );

    //      playerBody.threemesh = object;

    //     // Set same initial position
    //     object.position.copy(playerBody.position);
    //     mixer = new THREE.AnimationMixer(object);

    //     // Ajustar materiales
    //     object.traverse(function (child) {
    //         if (child.isMesh) {
    //             child.material.transparent = false;
    //             child.material.opacity = 1.0;
    //         }
    //     });

    //     // Cargar y aplicar animaciones
    //     const animations = ['models/jetperson/Idle.fbx', 'models/jetperson/Jumping.fbx', 'models/jetperson/Falling Idle.fbx'];
    //     animations.forEach(function (animFile, index) {
    //         loader.load(animFile, function (animData) {
    //             // Extraer el nombre del archivo sin la ruta ni la extensión .fbx
    //             const name = animFile.split('/').pop().split('.').slice(0, -1).join('.');
    //             const action = mixer.clipAction(animData.animations[0]);
    //             actions[name] = action; // Guardar la acción con el nombre del archivo
    //             animationNames[index] = name; // Almacenar nombre de animación en el array

    //             if (index === 0) { // Iniciar la primera animación
    //                 action.play();
    //             }                                
    //         });
    //     });

    //     // changeAnimation(0); // Iniciar con la animación "Idle"

    // }, undefined, function (error) {
    //     console.error(error);
    // });


  }


  function createLandScape() {
    waterCount = waterGeo.attributes.position.count;
    for (let i = 0; i < waterCount; i++) {
      //Create random mountains

    }
  }


  function loadScene() {

    nextHoopIndexText =

      sky = new Sky();
    sky.scale.setScalar(450000);

    const phi = THREE.MathUtils.degToRad(80);
    const theta = THREE.MathUtils.degToRad(120);
    const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms.sunPosition.value = sunPosition;

    scene.add(sky);
    const SIZE = 800;
    const SEG = 240;

    waterGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    waterGeo.rotateX(-Math.PI / 2); // bake rotation into geometry
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2e7bcf,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    // waterMesh.rotation.x = -Math.PI / 2;
    scene.add(waterMesh);
    scene.add(playerGroup);

    playerArrow = new THREE.Mesh(
      new THREE.ConeGeometry(1,3 ,32),
      new THREE.MeshBasicMaterial({color: 0xff0000}));
    playerArrow.scale.set(10, 10, 10);
    playerArrow.rotation.z = Math.PI/2;
    playerArrow.rotation.y = Math.PI/2;
    scene.add(playerArrow);

    playerArrow.visible = false;




    // const hoop = createHoop(4, 0.2);
    // scene.add(hoop);
    // hoop.position.set(0, 0, -5);

    // const terrainTexture = new THREE.TextureLoader().load('../textures/terrain2.jpg');
    // const islands = placeIslandsSimple({
    //   ringRadius: 180,
    //   count: 10,
    //   seaLevel: 0.25,
    //   innerRadius: 0.7,
    //   outerRadius: 1.35,
    //   minSeparation: 45
    // });

    // islands.traverse(c => {
    //   if (c.material) {
    //     c.material.map = terrainTexture;
    //     c.material.needsUpdate = true;
    //   }
    // });
    // scene.add(islands);

  loadGltfModel('models/volcano_island_lowpoly/scene.gltf').then((obj) => {
  obj.position.set(5, 0, -12);
  obj.scale.setScalar(1.2);
  obj.rotation.y = Math.PI * 0.3;
  obj.type = 'island';

  const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = 200.0 / size.y;
      obj.scale.setScalar(scale);
      obj.position.set(0, 0, 0);
      obj.rotation.set(0, 0, 0);
      obj.updateMatrixWorld(true);
});

    // const normal = createGaussianMountain(3, 10, 60, 20)
    // normal.position.set(10, 2, 10);
    // scene.add(normal);

    const circuitPoints = createPoints(10, 180, 50);
    circuit = createCircuit(circuitPoints, 1, true);
    circuit.position.setY(5);
    scene.add(circuit);

    const hoopTexture = new THREE.TextureLoader().load('textures/hoop/textura_cuadrados_amarillos.avif');
    circuit.traverse(c => {
      if (c.material) {
        c.material.map = hoopTexture;
        c.material.needsUpdate = true;
      }

    })



    buildHoopColliders(circuit, world, scene, 4, 0.01, true);

    // const playerMat = new THREE.MeshStandardMaterial({
    //     color: 0xff7700,
    //     roughness: 0.4,
    //     metalness: 0.0,
    //     flatShading: true,
    // });
    // const playerGeo = new THREE.SphereGeometry(1, 32, 32);
    // const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    // scene.add(playerMesh);
    firstHoopPosition = circuit.children[0].position.clone();
    const hoopForward = new THREE.Vector3(0, 0, 1).applyQuaternion(circuit.children[0].quaternion);
    firstHoopPosition.addScaledVector(hoopForward, -20);

    playerBody.position.set(firstHoopPosition.x, firstHoopPosition.y, firstHoopPosition.z);
    // playerMesh.position.copy(playerBody.position);
    // playerBody.threemesh = playerMesh;




  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // textCanvas.width = window.innerWidth;
    // textCanvas.height = window.innerHeight; 
  }

  

  const tmpPnow = new CANNON.Vec3();
  const tmpPprev = new CANNON.Vec3();
  const tmpV = new CANNON.Vec3();
  const MIN_SPEED_ALONG_NORMAL = 0.5;
  // ---------- Cannon ----------
  function initCannon() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    // TODO: add bodies & constraints here
    playerBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(1), fixedRotation: true });

    world.addBody(playerBody);
    playerBody.addEventListener('collide', (ev) => {
  const otherBody = ev.body;
  
  // Check if it's a hoop
  if (!otherBody.userData?.type === 'hoop') return;
  
  let hoopBody = otherBody;
  // console.log("HOLA - collided with hoop!");
  
  // (optional) enforce order
  if (hoopBody.userData.index !== nextHoopIndex) return;
  
  // current and previous signed distances
  tmpPnow.copy(playerBody.position);
  tmpPprev.copy(prevPlayerPos);
  
  // player velocity along normal
  tmpV.copy(playerBody.velocity);
  const n = getHoopWorldNormal(hoopBody);
  const vAlong = tmpV.x * n.x + tmpV.y * n.y + tmpV.z * n.z;
  
  // FRONT -> BACK crossing only + some speed along normal
  if (vAlong > -MIN_SPEED_ALONG_NORMAL) {
    console.log('Ring passed in correct direction:', hoopBody.userData.index);
    nextHoopIndex = (nextHoopIndex + 1);
    speed = 200;
    speedTimer = 1.5;
    targetFov = 90;
    touchedHoop = hoopBody;
    hoopBody.userData.touched = true;
    console.log('Speed boost! New speed:', speed, 'Camera FOV:', camera.fov);
    camera.updateProjectionMatrix();
  }
});

  }



  // ---------- Update ----------

  function animateHoop(body, dt, speed) {
    if (body.direction === undefined) {
    if (Math.random() < 0.5) body.direction = 1
    else body.direction = -1
  }    

    if (body.position.y > 15) {
      body.direction = -1
    } else if (body.position.y <= 8.5) {
      body.direction = 1
    }

    body.position.y += body.direction * dt * speed

  }

  function waveHeight(x, z, t) {
    return (
      0.8 * Math.sin(0.15 * x + 1.2 * t) + // was 0.15
      0.5 * Math.sin(0.08 * z + 0.8 * t) + // was 0.08
      0.3 * Math.sin(0.01 * (x + z) + 0.6 * t)
    );
  }

  function updateWaterMesh(t) {
    const pos = waterGeo.attributes.position;
    const ox = waterMesh.position.x;
    const oz = waterMesh.position.z;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = waveHeight(x + ox, z + oz, t); // compute height
      pos.setY(i, y);
    }



    pos.needsUpdate = true;
    waterGeo.computeVertexNormals();
    waterGeo.attributes.normal.needsUpdate = true;
  }

  const move = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function applyPlayerControls(body, dt) {
    const jumpSpeed = 15;
    move.set(0, 0, 0);
    forward.set(0, 0, 0);
    right.set(0, 0, 0);

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // W/S => forward/back (along -Z/+Z in world space)
    if (keys['KeyW']) move.add(forward);
    if (keys['KeyS']) move.sub(forward);

    // A/D => left/right (along -X/+X)
    if (keys['KeyA']) {
      move.sub(right);
      // playerBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    }
    if (keys['KeyD']) {
      move.add(right);
      // playerBody.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    }

    if (keys['Space'] && playerBody.position.y < 2) {
      isJumping = true;
      move.add(new THREE.Vector3(0, jumpSpeed, 0));
      changeAnimation(2);
      animationTimer = 0.7
    }

    if (isJumping) {
      playerBody.jetski.rotation.x = THREE.MathUtils.lerp(playerBody.jetski.rotation.x, -0.5, 0.1);
    } else {
      playerBody.jetski.rotation.x = THREE.MathUtils.lerp(playerBody.jetski.rotation.x, 0.0, 0.1);
    }

    animationTimer -= dt;
    regenerationTimer -= dt;

    if (regenerationTimer < 0.0 && stamina < 100.0) {
      stamina += dt * 15;
    }

    if (keys['ShiftLeft']) {  // run
      if (speed != 200 && stamina > 0) {
          speed = 70;
          targetFov = 80;
          camera.updateProjectionMatrix();
          speedTimer = 0.1;
          stamina -= dt * 30;
          regenerationTimer = 2.0;
      }
        
    } else {
      // speed = 40;
      // camera.fov = 60;
      // camera.updateProjectionMatrix();
    }
    // Normalize diagonal movement
    if (currentFov === undefined) currentFov = camera.fov;
    currentFov = THREE.MathUtils.lerp(currentFov, targetFov, 0.1);
    camera.fov = currentFov;
    camera.updateProjectionMatrix();


    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);          // same speed diagonally
      body.wakeUp && body.wakeUp();                     // in case it’s sleeping
      body.applyForce(new CANNON.Vec3(move.x, move.y, move.z), body.position);
    }

    // Add a little water drag
    const drag = 0.9; // 0–1 → smaller = stronger drag
    body.velocity.x *= drag;
    body.velocity.z *= drag;
    if (body.position.y > 0 && isJumping && animationTimer > 0.0) {
    } else if (body.position.y > 0 && isJumping && animationTimer <= 0.0) {
      body.threemesh.y += 0.5
      // changeAnimation(2)
    }
    else {
      isJumping = false;
      changeAnimation(0);
    }

  }



  function applyBuoyancy(body, t) {
    const pos = body.position;
    const radius = 1.0;      // match your sphere’s radius
    const depth = pos.y - 0.4 - waveHeight(pos.x, pos.z, t); // distance from surface
    const k = 20;            // buoyancy strength (tune)
    const d = 2;             // damping factor (tune)

    if (depth < 0) {
      // Apply upward spring force = -k * depth
      const buoyant = -k * depth - d * body.velocity.y;
      body.applyForce(new CANNON.Vec3(0, buoyant, 0), body.position);
    }
  }

  const prevPlayerPos = new CANNON.Vec3();
  let lastDt = 1 / 60;

  function update(dt, t) {
    lastDt = dt;
    cameraControls.target.lerp(new THREE.Vector3(
      playerBody.position.x,
      playerBody.position.y,
      playerBody.position.z
    ), 0.1);

  //  if (Math.random() < 0.01) { // Log occasionally, not every frame
  //   console.log('PlayerBody pos:', playerBody.position);
  //   console.log('PlayerGroup pos:', playerGroup.position);
  //   console.log('Camera pos:', camera.position);
  //   console.log('PlayerGroup children:', playerGroup.children.length);
  // }

    if (mixer) mixer.update(dt);
    // camera.position.lerp(new THREE.Vector3(
    //   playerBody.position.x + 6,
    //   playerBody.position.y + 3,
    //   playerBody.position.z + 6
    // ), 0.1);

    for (let hoopBody of world.bodies) {
        if (hoopBody.userData?.type === 'hoop') {
          animateHoop(hoopBody, dt, 6)
          hoopBody.userData.mesh.position.copy(hoopBody.position)
          hoopBody.userData.mesh.position.sub(new THREE.Vector3(0, 5, 0))
          if (hoopBody.userData.touched) {
            handleHoopTouch(hoopBody, dt);
            changeAnimation(1);
          }
          
        }
      }

    // --- Optional: smooth zoom/distance lock ---
    cameraControls.maxDistance = 10;
    cameraControls.minDistance = 4;
    cameraControls.update();
    const fixedTimeStep = 1.0 / 60.0;  // 60 Hz
    const maxSubSteps = 3;
    world.step(fixedTimeStep, dt, maxSubSteps);

    if (gameState === "notStarted") {
      // keep player still
      if (keys['Enter']) {
        gameState = "Playing";
      }
    }

    if (keys['Digit1']) gameState = "notStarted";
    if (keys['Digit2']) gameState = "Playing";
    if (keys['Digit3']) {
      restartTimer = 5.0;
      gameState = "Win";
    }

    if (gameState === "Playing") applyPlayerControls(playerBody, dt);
    bar.style.width = stamina.toFixed(1) + '%';


    // target yaw: face camera forward on XZ (or use velocity, see below)
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const targetYaw = Math.atan2(fwd.x, fwd.z);

    // smooth turn and lock to Y only
    const currentYaw = getBodyYaw(playerBody);
    const newYaw = THREE.MathUtils.lerp(currentYaw, targetYaw, 0.15); // 0..1 turn rate
    setBodyYaw(playerBody, newYaw);
    applyBuoyancy(playerBody, t);


    if (playerBody.threemesh && playerBody.jetski) {
      
      
      // playerBody.threemesh.position.copy(playerBody.position);
      // playerBody.threemesh.quaternion.copy(playerBody.quaternion);
      // playerBody.jetski.position.copy(playerBody.position)
      // playerBody.jetski.quaternion.copy(playerBody.quaternion);
      // const offset = new THREE.Vector3(0, -0.5, 0);
      playerGroup.position.copy(playerBody.position)
      playerGroup.quaternion.copy(playerBody.quaternion);
      if (currentAnimationIndex == 1) {
        playerBody.threemesh.position.lerp(new THREE.Vector3(-0.7, 2, -0.5), 0.2);
      } else {
        playerBody.threemesh.position.lerp(new THREE.Vector3(0, 0.5, -1.2), 0.2);
      }
      playerArrow.position.copy(playerBody.position)
      playerArrow.position.y = 50;
      playerArrow.quaternion.copy(playerBody.quaternion);
      playerArrow.rotateX(Math.PI/2);



    }

    
    // if (playerBody.userData && playerBody.userData.jetski) {
    //   const j = playerBody.userData.jetski;
    //   j.position.copy(playerBody.position).add(new THREE.Vector3(0, -0.5, 0));
    //   j.quaternion.copy(playerBody.quaternion);
    // }

    prevPlayerPos.copy(playerBody.position);


    scene.traverse(obj => {
      if (obj.userData.physicsBody) {
        const body = obj.userData.physicsBody;
        if (body.threeDebugMesh) {
          body.threeDebugMesh.position.copy(body.position);
          body.threeDebugMesh.quaternion.copy(body.quaternion);
        }
      }
    });
  }



  // Función para proyectar vértices 3D a 2D
  function projectVertexTo2D(vertex, camera) {
    var vector = vertex.clone();
    vector.project(camera); // Proyectar el vector a coordenadas de pantalla
    // Convertir las coordenadas normalizadas (-1 a 1) a coordenadas de píxeles
    var x = (vector.x * 0.5 + 0.5) * textCanvas.width;
    var y = (-vector.y * 0.5 + 0.5) * textCanvas.height;
    return { x: x, y: y };
  }

  // ---------- Loop ----------
  let lastT = 0;
  const fixedTimeStep = 1 / 60; // 60Hz physics

  function animate(ts = 0) {
    
    const t = ts * 0.001;
    const dt = clock.getDelta();
    lastT = t;

    requestAnimationFrame(animate);



    stats.begin();



    updateWaterMesh(t);
    



    waterMesh.position.x = playerBody.position.x;
    waterMesh.position.z = playerBody.position.z;

    if (camera.position.y < 0) {
      scene.fog = new THREE.Fog(0x4cbaed, 0, 15);
      sky.visible = false;
    } else {
      scene.fog = undefined;
      sky.visible = true;
    }
    if (speedTimer >= 0) {
      speedTimer -= dt;
    } else {
      speedTimer = 0;
      if (speed > 40) {
        speed = 60;
        targetFov = 60;

      }
    }
    update(fixedTimeStep, t);
  
      
  const ds = Math.min(window.innerHeight, window.innerWidth) / 4;

  


    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height); // Limpiar el canvas antes de redibujar
    ctx.font = "36px Arial";
    ctx.fillStyle = "black";

    if (gameState === "notStarted") {
      changeAnimation(0 ); // idle animation
      const text = "Press ENTER to Start!";
      const width = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(27, 140, 222, 0.7)";
      ctx.fillRect(-2, window.innerHeight / 2 - 36, window.innerWidth, 50);

      ctx.fillStyle = "white"
      // ctx.fillRect(rectX - paddingX, rectY, textWidth + 2 * paddingX, textHeight + 2 * paddingY);
      ctx.fillText(text, window.innerWidth / 2 - width / 2, window.innerHeight / 2);
    
    } else if (gameState === "Playing") {
      if (nextHoopIndex < circuit.children.length - 1) {
      if (camera.position.y > 0) {
        const text = "Aros superados: " + (nextHoopIndex) + " / " + (circuit.children.length - 1);
        const length = ctx.measureText(text).width;

        ctx.fillStyle = "rgba(27, 140, 222, 0.7)";
        ctx.fillRect(40, 70, length + 20, 42);

        ctx.fillStyle = "white";
        ctx.fillText(text, 50, 100);
      
        const vertex = new THREE.Vector3();
        circuit.children[nextHoopIndex].getWorldPosition(vertex);
        vertex.add(new THREE.Vector3(0, 5, 0)); // Ajustar la altura del texto

        // Proyectar el vértice actual a 2D
        var projected = projectVertexTo2D(vertex, camera);

        // Dibujar el número del vértice en la posición 2D proyectada
        ctx.fillText("Next!", projected.x, projected.y);
      }
      


    } else {
      gameState = "Win";
      restartTimer = 5.0;
      changeAnimation(0); // idle animation
      }
    } else if (gameState === "Win") {
      const text = "All hoops completed! 🎉";
      const width = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(27, 140, 222, 0.7)";
      ctx.fillRect(-2, window.innerHeight / 2 - 36, window.innerWidth, 50);
      ctx.fillStyle = "white"
      ctx.fillText(text, window.innerWidth / 2 - width / 2, window.innerHeight / 2);
    }


  if (gameState === "Win") {
    restartTimer -= dt;
    if (restartTimer <= 0) {
      // Reset game state
     window.location.reload();
    }
  }

  ctx.restore();
    // Obtener la posición del vértice

    // vista de arriba
     // vista 3d perspectiva
  renderer.autoClear = false;

  // --- 1. Main perspective view ---
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.setClearColor(0xa2a2f2);
  renderer.clear(true, true, true); // clear color, depth, stencil
  renderer.render(scene, camera);

  // --- 2. Mini top-down view ---
  playerArrow.visible = true;
  renderer.setViewport(window.innerWidth - ds, window.innerHeight - ds, ds, ds);
  renderer.setScissor(window.innerWidth - ds, window.innerHeight - ds, ds, ds);
  renderer.setScissorTest(true);

  // Reset depth so inset draws cleanly
  renderer.clearDepth();

  // Optional: clear only color in inset
  renderer.setClearColor(0x0AFFFF);
  renderer.clearColor();
  renderer.render(scene, cameraTop);

  // --- 3. Restore ---
  renderer.setScissorTest(false);
  playerArrow.visible = false;


    stats.end();



  }


  // ---------- Boot ----------
  function boot() {
    initThree();
    initCannon();
    loadScene();
    loadModelAndAnimations();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    animate();
  }

  boot();
})();
