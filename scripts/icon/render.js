// Logo: oyundaki misketi şeffaf arka planda 3D olarak çizer.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMarbleMesh } from '../../src/marble.js';

const S = 512;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(S, S);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.3));
const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(-2, 3, 4);
scene.add(key);

const marble = createMarbleMesh(env, 1);
marble.material.envMapIntensity = 0.9;
marble.rotation.set(0.35, -0.6, 0.2);
scene.add(marble);

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 0, 4.25);
camera.lookAt(0, 0, 0);
renderer.render(scene, camera);
window.__png = renderer.domElement.toDataURL('image/png');
