import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';

let camera, scene, renderer;
let plane;
let pointer, raycaster = false;
let spider, spiderMixer;
let cursor, cursorEdges;

const objects = [];
var clock = new THREE.Clock();

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(500, 800, 1300);
    camera.lookAt(0, 0, 0);
    camera.zoom = 2;
    camera.updateProjectionMatrix();
    scene = new THREE.Scene();
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
    // todo: fix textures
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
    // todo: add textures
    const geometry = new THREE.BoxGeometry(800, 450, -25);
    geometry.rotateX(-Math.PI / 2);

    plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        visible: true
    }));
    scene.add(plane);
    objects.push(plane);

    // lights
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 0.75, 0.5).normalize();
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

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

function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}

function onPointerMove(event) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        cursor.position.copy(intersect.point).add(intersect.face.normal);
        cursorEdges.position.copy(intersect.point).add(intersect.face.normal);
        // todo: make sure the cursor and the spider don't leave the screen
        // todo: rotate the spider in the direction it's moving
        // todo: add linear interpolation for smoother movement
        // todo: make sure the spider follows the cursor from a distance
        spider.scene.rotation.y = 1;
        spider.scene.position.copy(intersect.point).add(intersect.face.normal);
        render();
    }
}

function onPointerDown(event) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, false);
    if (intersects.length > 0) {
        // todo: clicked on the screen
        render();
    }
}

function animate() {
    if (spiderMixer) spiderMixer.update(clock.getDelta());
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
}