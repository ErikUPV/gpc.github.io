// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;

// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

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
function createBase(material) {
  return new THREE.Mesh(new THREE.BoxGeometry(1000, 1, 1000), material);
}

function createRobot(material) {
  return new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 15, 32), material);
}

function createEsparrago(material) {
  const esparrago = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 18, 32), material);
  esparrago.rotation.z = Math.PI / 2;
  return esparrago;
}

function createEje(material) {
  const eje = new THREE.Mesh(new THREE.BoxGeometry(18, 120, 12), material);
  eje.translateY(60);
  return eje;
}

function createRotula(material) {
  const rotula = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 32), material);
  rotula.translateY(120);
  return rotula;
}

function createAntebrazo(material) {
  const antebrazo = new THREE.Object3D();
  antebrazo.translateY(120);

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

  const mano = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 40 ,32), material);
  mano.translateY(80);
  mano.rotation.z = Math.PI / 2;

  const manoGeometry = createManoGeometry();
  const manoIzq = new THREE.Mesh(manoGeometry, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
  manoIzq.position.set(9, -10, -2);
  const manoDer = new THREE.Mesh(manoGeometry, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
  manoDer.position.set(9, 10, -2);
  manoDer.scale.set(1, -1, 1);

  mano.add(manoIzq);
  mano.add(manoDer);
  antebrazo.add(mano);

  return antebrazo;
}

function loadScene()
{
    const material = new THREE.MeshNormalMaterial();

    const base = createBase(material);
    const robot = createRobot(material);
    const brazo = new THREE.Object3D();
    const esparrago = createEsparrago(material);
    const eje = createEje(material);
    const rotula = createRotula(material);
    const antebrazo = createAntebrazo(material);

    scene.add(base);
    base.add(robot);
    robot.add(brazo);

    brazo.add(esparrago);
    brazo.add(eje);
    brazo.add(rotula);
    brazo.add(antebrazo);
}


function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
  // Cambios para actualizar la camara segun mvto del raton

  cameraControls.update();
}

function render()
{
	requestAnimationFrame( render );
	update();
	
  
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