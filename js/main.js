import * as THREE from './three.module.js';
import {
    GLTFLoader
} from './GLTFLoader.js';
import {
    RoundedBoxGeometry
} from './RoundedBoxGeometry.js'
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
const fps = 30;

var clock = new THREE.Clock();

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 50, 200);
    camera.updateProjectionMatrix();
    scene = new THREE.Scene();
    RectAreaLightUniformsLib.init();
    scene.background = new THREE.Color(0xf0f0f0);

    const sphereGeometry = new THREE.SphereGeometry(4000, 480, 320);
    // invert the geometry on the x-axis so that all of the faces point inward
    sphereGeometry.scale(-1, 1, 1);

    const sphereTexture = new THREE.TextureLoader().load('/spidey/textures/34222805890_f7da31e951_6k.jpg');
    const sphereMaterial = new THREE.MeshBasicMaterial({
        map: sphereTexture
    });

    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.rotateY(Math.PI / 2);
    scene.add(sphereMesh);

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
    cursor.position.y = -800;
    cursor.position.z = -1800;
    cursorEdges.position.y = -800;
    cursorEdges.position.z = -1800;
    scene.add(cursor);
    scene.add(cursorEdges)

    // spider
    new GLTFLoader().load('/spidey/spider/scene.gltf', function (gltf) {
        spider = gltf;
        spiderMixer = new THREE.AnimationMixer(spider.scene);
        spiderMixer.clipAction(spider.animations[0]).play();
        spider.scene.position.y = -800;
        spider.scene.position.z = -1800;
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

    const screenTexture = new THREE.TextureLoader().load('/spidey/textures/screen.gif');
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
    screen.position.y = -825;
    screen.position.z = -1800;
    scene.add(screen);

    // table
    new GLTFLoader().load('/spidey/metallic_garden_table/scene.gltf', function (gltf) {
        table = gltf;
        let scale = 35;
        table.scene.scale.set(scale, scale, scale);
        table.scene.position.y = -2000;
        table.scene.position.z = -2000;
        table.scene.receiveShadow = true;
        table.scene.castShadow = true;
        scene.add(table.scene);
    }, undefined, function (error) {
        console.error(error);
    });

    // lights
    const ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.intensity = 1;
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.target = screen;
    directionalLight.intensity = 1.5;
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

    controls.minDistance = 10;
    controls.maxDistance = 1000;

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