// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var clock = new THREE.Clock();
let animating = false;
var animationTimer;
var minimos, maximos;

const keys = Object.create(null);
window.addEventListener('keydown', e => (keys[e.code] = true));
window.addEventListener('keyup',   e => (keys[e.code] = false));

const guiParams = {
  giroBase: 0,
  giroBrazo: 0,
  giroAntebrazoY: 0,
  giroAntebrazoZ: 0,
  giroPinza: 0,
  separacionPinza: 10,
  alambres: false,
  anima: () => animating = true,
};

const gui = new dat.GUI();
const folder = gui.addFolder('Control Robot');


function createGUI() {
  const cBase = folder.add(guiParams, 'giroBase', -180, 180, 1).name('Giro Base');
  const cBrazo = folder.add(guiParams, 'giroBrazo', -45, 45, 1).name('Giro Brazo');
  const cAnteY = folder.add(guiParams, 'giroAntebrazoY', -180, 180, 1).name('Giro Antebrazo Y');
  const cAnteZ = folder.add(guiParams, 'giroAntebrazoZ', -90, 90, 1).name('Giro Antebrazo Z');
  const cPinza = folder.add(guiParams, 'giroPinza', -40, 220, 1).name('Giro Pinza');
  const cSep = folder.add(guiParams, 'separacionPinza', 0, 15, 0.5).name('Separacion Pinza');
  const cAlam = folder.add(guiParams, 'alambres').name('alambres');
  const cAnima = folder.add(guiParams, 'anima').name('Anima');

  minimos = {
    cBase: -180,
    cBrazo: -45,
    cAnteY: -180,
    cAnteZ: -90,
    cPinza: -40,
    cSep: 0,
    cAlam: false,
    cAnima: false
  }
  maximos = {
    cBase: 180,
    cBrazo: 45,
    cAnteY: 180,
    cAnteZ: 90,
    cPinza: 220,
    cSep: 15,
    cAlam: true,
    cAnima: true
  }
  guiParams.controllers = [cBase, cBrazo, cAnteY, cAnteZ, cPinza, cSep, cAlam, cAnima];
}

function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 80, aspectRatio , 0.1, 1000 );
  camera.position.set( 0, 200, 120 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 200, 0 );

  
  // vista de planta
  cameraTop = new THREE.OrthographicCamera( -50, 50, 50,-50, 1, 1000 );
  cameraTop.position.set(0,500,0);
  cameraTop.lookAt( 0, 0, 0 );
  cameraTop.up.set( 0, 0, 1 );
  cameraTop.updateProjectionMatrix();  

  window.addEventListener('resize', updateAspectRatio );
}


function createManoGeometry() {
    var manoGeometry = new THREE.BufferGeometry();

    var vertices = [
      0, 0, 0,
      0, 20, 0,
      0, 20, 4,
      0, 0, 4,
      19, 20, 4,
      19, 20, 0,
      19, 0, 0,
      19, 0, 4,
      38, 16, 0,
      38, 4, 0,
      38, 4, 2,
      38, 16, 2
    ]


    manoGeometry.setAttribute('position',
    new THREE.BufferAttribute(new Float32Array(vertices), 3));

    var indices = [
      3, 7, 0,
      7, 6, 0,
      1, 2, 0,
      2, 3, 0,
      5, 1, 0,
      5, 0, 6,
      4, 5, 6,
      4, 6, 7,
      2, 4, 3,
      4, 7, 3,
      4, 2, 1,
      4, 1, 5,
      4, 5, 8,
      4, 8, 11,
      8, 5, 6,
      8, 6, 9,
      8, 9, 11,
      11, 9, 10,
      4, 11, 7,
      11, 10, 7,
      10, 9, 6,
      10, 6, 7,
    ]
    
    manoGeometry.computeVertexNormals()
    manoGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    manoGeometry.rotateZ( Math.PI / 2);
    manoGeometry.rotateX( Math.PI/2)

    return manoGeometry;
}
function createPlano(material) {
  return new THREE.Mesh(new THREE.BoxGeometry(1000, 1, 1000), material);
}

function createBase(material) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 15, 32), material);
  base.rotation.y = - Math.PI / 2;
  return base;
}

function createEsparrago(material) {
  const esparrago = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 18, 32), material);
  return esparrago;
}

function createEje(material) {
  const eje = new THREE.Mesh(new THREE.BoxGeometry(18, 120, 12), material);
  eje.translateY(60);
  eje.rotateY(Math.PI / 2);
  return eje;
}

function createRotula(material) {
  const rotula = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 32), material);
  rotula.translateY(120);
  eje.rotateY(Math.PI / 2);

  return rotula;
}

function createAntebrazo(material) {
  const antebrazo = new THREE.Object3D();
  antebrazo.translateY(120);
  antebrazo.rotation.y = 0;

  const disco = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 6, 32), material);
  antebrazo.add(disco);

  const nervioGeometry = new THREE.BoxGeometry(4, 80, 4);
  const distCentro = 7;
  const positions = [
    [ distCentro, 40,  distCentro],
    [-distCentro, 40,  distCentro],
    [-distCentro, 40, -distCentro],
    [ distCentro, 40, -distCentro],
  ];

  for (let i = 0; i < 4; i++) {
    const nervio = new THREE.Mesh(nervioGeometry, material);
    nervio.position.set(positions[i][0], positions[i][1], positions[i][2])
    antebrazo.add(nervio);
  };

  mano = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 40 ,32), material);
  mano.translateY(80);
  mano.rotateX(Math.PI / 2); 

  const manoGeometry = createManoGeometry();
  manoIzq = new THREE.Mesh(manoGeometry, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
  manoDer = new THREE.Mesh(manoGeometry, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
  manoDer.scale.set(1, -1, 1);


  mano.add(manoIzq);
  mano.add(manoDer);

  manoDer.position.set(9, 10, -2);
  manoIzq.position.set(9, -10, -2);


  antebrazo.add(mano);

  return antebrazo;
}

var base;
var robot;
var brazo, esparrago, eje, rotula, antebrazo, mano, manoIzq, manoDer;
function loadScene()
{
  var material;
    if (guiParams.alambres) {
      material = new THREE.MeshWireframeMaterial({ color: 0x000000, wireframe: true });
    } else {
      material = new THREE.MeshNormalMaterial();
    }

    base = createPlano(material);
    robot = createBase(material);
    brazo = new THREE.Object3D();
    brazo.rotation.y = Math.PI / 2;
    esparrago = createEsparrago(material);

    eje = createEje(material);
    rotula = createRotula(material);
    antebrazo = createAntebrazo(material);

    scene.add(base);
    scene.add(robot);

    robot.add(brazo);

    brazo.add(esparrago);
    brazo.add(eje);
    brazo.add(rotula);
    brazo.add(antebrazo);

    esparrago.rotation.x = Math.PI / 2;
}

function initBody() {
  world = new CANNON.World();
  world.gravity.set(0, 0, 0);

  let robotBody = new CANNON.Body({ mass: 1 });
  let shape = new CANNON.Cylinder(50, 50, 15, 16);
  robotBody.addShape(shape);
  robotBody.position.set(0, 7.5, 0);
  world.addBody(robotBody);

  robot.userData.physicsBody = robotBody;

  // let baseBody = new CANNON.Body({ mass: 0 }); // masa 0 = cuerpo inamovible
  // shape = new CANNON.Box(new CANNON.Vec3(1000, 0.5, 1000));
  // baseBody.addShape(shape);
  // baseBody.position.set(0, -0.5, 0);
  // world.addBody(baseBody);
}
var move = new THREE.Vector3();
var forward = new THREE.Vector3();
var right = new THREE.Vector3();


function managePlayerControls() {
  let body = robot.userData.physicsBody;
  const speed = 1000;
  move.set(0, 0, 0);
  forward.set(0, 0, -1);
  right.set(0, 0, 0);

  // camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  right.crossVectors(camera.up, forward);
  right.normalize();

  if (keys['KeyW']) {
    move.add(forward);
  }
  if (keys['KeyS']) {
    move.sub(forward);
  }
  if (keys['KeyA']) {
    move.add(right);
  }
  if (keys['KeyD']) {
    move.sub(right);
  }

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed);          // same speed diagonally
    body.wakeUp && body.wakeUp();                     // in case it’s sleeping
    body.applyForce(new CANNON.Vec3(move.x, move.y, move.z), body.position);
  }

  body.quaternion.setFromEuler(0, guiParams.giroBase * Math.PI / 180, 0);
  brazo.rotation.z =  guiParams.giroBrazo * Math.PI / 180;
  antebrazo.rotation.y =  guiParams.giroAntebrazoY * Math.PI / 180;
  antebrazo.rotation.z =  guiParams.giroAntebrazoZ * Math.PI / 180;
  mano.rotation.y=  Math.PI / 2 + guiParams.giroPinza * Math.PI / 180;

  manoIzq.position.y = -guiParams.separacionPinza / 2;
  manoDer.position.y = guiParams.separacionPinza / 2;

 

  drag = 0.8;

  body.velocity.x *= drag;
  body.velocity.z *= drag;


}



function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
const lastT = 0;
function animate() {
  t = Date.now();
  dt = clock.getDelta();
  fixedTimeStep  = 1.0 / 60.0;

  if (guiParams.alambres) {
    robot.traverse(function(child) {

        child.material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });

    });
  } else {
    robot.traverse(function(child) {
        child.material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
    });
  }

  if (animating) {
    animationTimer = 3.0;
    animating = false;
  }

  if (animationTimer > 0) {
    const delta = dt;
    factor = 20;
    animationTimer -= delta;
    guiParams.giroBase = Math.max(guiParams.giroBase - dt * factor, minimos['cBase']);
    guiParams.giroBrazo = Math.max(guiParams.giroBrazo - dt * factor, minimos['cBrazo']);
    guiParams.giroAntebrazoY = Math.max(guiParams.giroAntebrazoY -dt * factor, minimos['cAnteY']);
    guiParams.giroAntebrazoZ = Math.max(guiParams.giroAntebrazoZ -dt * factor, minimos['cAnteZ']);
    guiParams.giroPinza = Math.max(guiParams.giroPinza -dt * factor, minimos['cPinza']);
    guiParams.separacionPinza = Math.min(guiParams.separacionPinza + dt * factor, maximos['cSep']);
    if (guiParams.separacionPinza > 15) guiParams.separacionPinza = 0;
    for (const c of guiParams.controllers) c.updateDisplay();
  }

  cameraControls.update();

  update(fixedTimeStep, t);

  

  
}

function update(dt, t)
{
  // Cambios para actualizar la camara segun mvto del raton
  cameraControls.update();
  if (world) {
    managePlayerControls();
  }
  world.step(dt);

  const body = robot.userData.physicsBody;
  robot.position.copy(body.position);
  robot.quaternion.copy(body.quaternion);

}

function render()
{
	requestAnimationFrame( render );
	animate();
	
  
    // vista 3d perspectiva
  renderer.autoClear = false;
  renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
	renderer.setClearColor( new THREE.Color(0xa2a2f2) );
	renderer.clear();
	renderer.render( scene, camera ); 

  // vista de arriba
  var ds = Math.min(window.innerHeight , window.innerWidth)/4;
  renderer.setViewport(0, window.innerHeight - ds, ds, ds);
	renderer.setScissor (0, window.innerHeight - ds, ds, ds);
	renderer.setScissorTest (true);
	renderer.setClearColor( new THREE.Color(0xaffff) );
	renderer.clear();	
	renderer.setScissorTest (false);
  renderer.render(scene, cameraTop);
}

// 1-inicializa 
init();
// 2-Crea una escena
createGUI();
loadScene();
initBody();
// 3-renderiza
render();
