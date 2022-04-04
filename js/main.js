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
import { RectAreaLightUniformsLib } from './RectAreaLightUniformsLib.js';


let camera, scene, renderer;
let plane;
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
    camera.zoom = 2;
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
    // todo: fix spider textures
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
    const geometry = new RoundedBoxGeometry(800, 450, 25, 10, 20);
    geometry.rotateX(-Math.PI / 2);
    geometry.computeBoundingBox();
    geometry.boundingBox.expandByScalar(0);
    geometry.boundingBox.set(new THREE.Vector3(
        geometry.boundingBox.min.x + 30, geometry.boundingBox.min.y, geometry.boundingBox.min.z + 50
    ), new THREE.Vector3(
        geometry.boundingBox.max.x - 40, geometry.boundingBox.max.y, geometry.boundingBox.max.z - 60
    ))

    const screenTexture = new THREE.TextureLoader().load('../textures/screen.gif');
    const screenMesh = new THREE.MeshStandardMaterial({
        map: screenTexture,
       blending: THREE.MultiplyBlending, toneMapped: false, transparent: true
    });
    const screenSides = new THREE.MeshPhysicalMaterial({
        color: 0x222222,
        roughness: 0,
        metalness: 0.5
    });

    const materials = [
        screenSides,
        screenSides,
        screenSides,
        screenSides,
        screenMesh,
        screenSides,
    ];

    plane = new THREE.Mesh(geometry, materials);
    plane.position.y = -25;
    scene.add(plane);

    // lights
    // todo: find the proper way of doing this
    const intensity = 3;
    const screenLightLeftHalf = new THREE.RectAreaLight(0x0000ff, intensity, 800 - 50, 450 - 50);
    screenLightLeftHalf.lookAt(0,0,1)
    scene.add(screenLightLeftHalf);

    const screenLightRightHalf = new THREE.RectAreaLight(0x0000ff, intensity, 800 - 50, 450 - 50);
    screenLightRightHalf.lookAt(0,0,0)
    scene.add(screenLightRightHalf);

    const ambientLight = new THREE.AmbientLight(0xffea00);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffea00);
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
    // todo: act on idle cursor
    // todo: walk faster on movement
    setTimeout(function () {
        pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects([plane], false);

        if (intersects.length > 0) {
            document.body.style.cursor = 'none';
            const intersect = intersects[0];
            cursor.position.copy(intersect.point).add(intersect.face.normal);
            cursorEdges.position.copy(intersect.point).add(intersect.face.normal);
            spider.scene.lookAt(intersect.point);
            spider.scene.position.lerpVectors(spider.scene.position, intersect.point, 1 / fps);
            render();
        } else {
            document.body.style.cursor = 'default';
        }
    }, 1000 / fps)
}

function onPointerDown(event) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects([plane], false);
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