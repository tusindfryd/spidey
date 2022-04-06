import * as THREE from './three.module.js';
import {
    GLTFLoader
} from './GLTFLoader.js';
import {
    RoundedBoxGeometry
} from './RoundedBoxGeometry.js'
import {
    RectAreaLightHelper
} from './RectAreaLightHelper.js'
import {
    RectAreaLightUniformsLib
} from './RectAreaLightUniformsLib.js';
import {
    OrbitControls
} from './OrbitControls.js';

let camera, scene, renderer, controls;
let screen, table, floor, wall;
let pointer, raycaster = false;
let spider, spiderMixer;
let cursor, cursorEdges;
const fps = 15;

var clock = new THREE.Clock();

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(500, 800, 1300);
    camera.lookAt(0, 0, 0);
    camera.zoom = 0.5;
    camera.updateProjectionMatrix();
    scene = new THREE.Scene();
    RectAreaLightUniformsLib.init();
    scene.background = new THREE.Color(0xf0f0f0);

    // cursor
    let coordinatesList = [
        [1, 3],
        [0, 20],
        [10, 7],
        [6, 7],
        [8, 1],
        [6, 0],
        [4, 6]
    ].map(xy => new THREE.Vector2(...xy));

    const cursorShape = new THREE.Shape(coordinatesList);
    const cursorGeometry = new THREE.ShapeGeometry(cursorShape);
    cursorGeometry.rotateX(-Math.PI / 2);
    cursorEdges = new THREE.EdgesGeometry(cursorGeometry);
    cursorEdges = new THREE.LineSegments(cursorEdges, new THREE.LineBasicMaterial({
        color: 0x000000
    }));
    const cursorMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    scene.add(cursor);
    scene.add(cursorEdges)

    // spider
    new GLTFLoader().load('../spider/scene.gltf', function (gltf) {
        spider = gltf;
        spiderMixer = new THREE.AnimationMixer(spider.scene);
        spiderMixer.clipAction(spider.animations[0]).play();
        scene.add(spider.scene);
    }, undefined, function (error) {
        console.error(error);
    });

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // screen
    const screenGeometry = new RoundedBoxGeometry(800, 450, 25, 5, 20);
    screenGeometry.rotateX(-Math.PI / 2);
    screenGeometry.computeBoundingBox();
    // todo: clean this up according to the cursor size
    screenGeometry.boundingBox.set(new THREE.Vector3(
        screenGeometry.boundingBox.min.x + 30, screenGeometry.boundingBox.min.y, screenGeometry.boundingBox.min.z + 50
    ), new THREE.Vector3(
        screenGeometry.boundingBox.max.x - 40, screenGeometry.boundingBox.max.y, screenGeometry.boundingBox.max.z - 60
    ))

    const screenTexture = new THREE.TextureLoader().load('../textures/screen.gif');
    const screenMesh = new THREE.MeshPhysicalMaterial({
        map: screenTexture,
        roughness: 0,
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: 1
    });
    const screenSides = new THREE.MeshPhysicalMaterial({
        color: 0x222222,
        roughness: 0,
        metalness: 1,
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: 1
    });

    const screenMaterials = [
        screenSides,
        screenSides,
        screenSides,
        screenSides,
        screenMesh,
        screenSides,
    ];

    screen = new THREE.Mesh(screenGeometry, screenMaterials);
    screen.castShadow = true;
    screen.position.y = -25;
    screen.position.z = 200;
    scene.add(screen);

    // table
    new GLTFLoader().load('../metallic_garden_table/scene.gltf', function (gltf) {
        table = gltf;
        let scale = 30;
        table.scene.scale.set(scale, scale, scale);
        table.scene.position.y = -1025 - 25;
        table.scene.receiveShadow = true;
        table.scene.castShadow = true;
        scene.add(table.scene);
    }, undefined, function (error) {
        console.error(error);
    });

    // floor
    const floorGeometry = new THREE.PlaneGeometry(20000, 5000);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorTexture = new THREE.TextureLoader().load('../textures/stones.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 2.5);
    const floorMesh = new THREE.MeshStandardMaterial({
        map: floorTexture,
        blending: THREE.MultiplyBlending,
        toneMapped: false,
    });
    floor = new THREE.Mesh(floorGeometry, floorMesh);
    floor.castShadow = true;
    floor.receiveShadow = true;
    floor.position.y = -1050;
    scene.add(floor);

    // walls
    const wallGeometry = new THREE.PlaneGeometry(20000, 5000);
    const wallTexture = new THREE.TextureLoader().load('../textures/bricks.jpg');
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(10, 2.5);
    const wallMesh = new THREE.MeshStandardMaterial({
        map: wallTexture
    })
    wall = new THREE.Mesh(wallGeometry, wallMesh);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.position.z = -2500;
    scene.add(wall);

    // lights
    // todo: find the proper way of doing this
    const intensity = 30;
    const screenLight = new THREE.RectAreaLight(0x0000ff, intensity, 800, 400);
    screenLight.rotateX(-3 * Math.PI / 2);
    screenLight.position.y = -25;
    screenLight.position.z = 200;
    scene.add(screenLight)
    // const screenLightLeftHalf = new THREE.RectAreaLight(0x0000ff, intensity, 800 - 50, 450 - 50);
    // screenLightLeftHalf.lookAt(0, 0, 1)
    // scene.add(screenLightLeftHalf);

    // const screenLightRightHalf = new THREE.RectAreaLight(0x0000ff, intensity, 800 - 50, 450 - 50);
    // screenLightRightHalf.lookAt(0, 0, 0)
    // scene.add(screenLightRightHalf);

    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfaeba2);
    // directionalLight.position.set(1, 0.75, 0.5).normalize();
    directionalLight.target = screen;
    directionalLight.intensity = 0.5;
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // controls

    controls = new OrbitControls(camera, renderer.domElement);
    controls.listenToKeyEvents(window);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;

    controls.screenSpacePanning = false;

    controls.minDistance = 100;
    controls.maxDistance = 1000;

    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI / 3;
    controls.minAzimuthAngle = -Math.PI / 14;
    controls.maxAzimuthAngle = Math.PI / 14;

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function onPointerMove(event) {
    // todo: act on idle cursor
    // todo: walk faster on movement
    setTimeout(function () {
        pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects([screen], false);
        if (intersects.length > 0) {
            spiderMixer.clipAction(spider.animations[0]).timeScale = 3;
            document.body.style.cursor = 'none';
            const intersect = intersects[0];
            cursor.position.copy(intersect.point).add(intersect.face.normal);
            cursorEdges.position.copy(intersect.point).add(intersect.face.normal);
            spider.scene.lookAt(intersect.point);
            spider.scene.position.lerpVectors(spider.scene.position, intersect.point, 1 / fps);
            render();
        } else {
            spiderMixer.clipAction(spider.animations[0]).timeScale = 1;
            document.body.style.cursor = 'default';
        }
    }, 1000 / fps)
}

function onPointerDown(event) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects([screen], false);
    if (intersects.length > 0) {
        // todo: clicked on the screen
        render();
    }
}

function animate() {
    setTimeout(function () {
        controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
        if (spiderMixer) spiderMixer.update(clock.getDelta());
        requestAnimationFrame(animate);
    }, 1000 / (2 * fps));
    render();
}

function render() {
    renderer.render(scene, camera);
}