import * as THREE from './three.module.js';
import {
    GLTFLoader
} from './GLTFLoader.js';

let camera, scene, renderer;
let plane;
let pointer, raycaster = false;
let spider, spiderMixer;
let cursor, cursorEdges;
const fps = 15;

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
    geometry.computeBoundingBox();
    geometry.boundingBox.expandByScalar(-25)

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

function onPointerMove(event) {
    setTimeout(function () {
        pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects([plane], false);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            cursor.position.copy(intersect.point).add(intersect.face.normal);
            cursorEdges.position.copy(intersect.point).add(intersect.face.normal);
            spider.scene.lookAt(intersect.point);
            spider.scene.position.lerpVectors(spider.scene.position, intersect.point, 1 / fps);
            render();
        }
    }, 1000 / fps)
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
    setTimeout(function () {
        if (spiderMixer) spiderMixer.update(clock.getDelta());
        requestAnimationFrame(animate);
    }, 1000 / fps);
    render();
}

function render() {
    renderer.render(scene, camera);
}