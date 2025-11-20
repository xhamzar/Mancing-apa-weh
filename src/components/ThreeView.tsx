
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { RodController } from './RodController';
import { BoatController } from './BoatController';
import { BobberController } from './BobberController';
import { WeatherController } from './WeatherController';
import { FishingSpotController } from './FishingSpotController';
import { WeatherType, BoatType, RodSkinType, FishType } from '../types';
import { loadFishModel } from './FishModels'; // Updated import

interface ThreeViewProps {
  rodLevel: number;
  enchant: string;
  boatType: BoatType;
  rodSkin: RodSkinType;
  previewFish: FishType | null;
  onReady?: (api: ThreeViewApi) => void;
  onWeatherUpdate?: (weather: WeatherType, time: number) => void;
}

export interface ThreeViewApi {
  cast: (distance: number) => void;
  reset: () => void;
  setReeling: (reeling: boolean) => void;
  toggleLights: () => boolean;
}

const ThreeView: React.FC<ThreeViewProps> = ({ rodLevel, enchant, boatType, rodSkin, previewFish, onReady, onWeatherUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ThreeViewApi>({ cast: () => {}, reset: () => {}, setReeling: () => {}, toggleLights: () => false });
  
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const rodCtrlRef = useRef<RodController | null>(null);
  const boatCtrlRef = useRef<BoatController | null>(null);
  const bobberCtrlRef = useRef<BobberController | null>(null);
  const weatherCtrlRef = useRef<WeatherController | null>(null);
  const spotCtrlRef = useRef<FishingSpotController | null>(null);

  const gameGroupRef = useRef<THREE.Group>(new THREE.Group());
  const previewGroupRef = useRef<THREE.Group>(new THREE.Group());
  const previewModelRef = useRef<THREE.Group | null>(null); // Ref to rotate the loaded model

  const objectsRef = useRef<{
    line: THREE.Line | null;
    water: any | null;
  }>({ line: null, water: null });

  const stateRef = useRef({
    isCasted: false,
    targetPos: new THREE.Vector3(0, 0, 0),
    manualLights: false
  });
  
  const lastWeatherReportRef = useRef<{weather: WeatherType, hour: number}>({ weather: 'CLEAR', hour: -1 });

  // --- 1. INITIALIZE SCENE ---
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.add(gameGroupRef.current);
    scene.add(previewGroupRef.current);
    previewGroupRef.current.visible = false;

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, -10);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ 
            antialias: false, 
            powerPreference: "default",
            depth: true,
            stencil: false
        }); 
    } catch (e) {
        console.error("WebGL Error:", e);
        return;
    }
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.4, 0.6);
    composer.addPass(bloomPass);
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(30, 100, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
    scene.add(dirLight);

    // --- GAME ASSETS ---
    const sun = new THREE.Vector3();
    const sky = new Sky();
    sky.scale.setScalar(10000);
    gameGroupRef.current.add(sky);
    
    const phi = THREE.MathUtils.degToRad(88);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if(ctx) {
        ctx.fillStyle = '#8080ff'; ctx.fillRect(0,0,256,256);
        for(let i=0; i<5000; i++) {
            const x = Math.random()*256; 
            const y = Math.random()*256;
            ctx.fillStyle = Math.random() > 0.5 ? '#8585ff' : '#7b7bff';
            ctx.fillRect(x,y, 3, 3);
        }
    }
    const normalMap = new THREE.CanvasTexture(canvas);
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;

    const water = new Water(
        new THREE.PlaneGeometry(10000, 10000),
        {
            textureWidth: 256, textureHeight: 256, waterNormals: normalMap,
            sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x004966, 
            distortionScale: 3.7, fog: true
        }
    );
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    gameGroupRef.current.add(water);
    objectsRef.current.water = water;

    // Controllers
    const proxy = gameGroupRef.current as any;
    const boatCtrl = new BoatController(); boatCtrl.addToScene(proxy); boatCtrlRef.current = boatCtrl;
    const rodCtrl = new RodController(); rodCtrl.addToScene(proxy); rodCtrlRef.current = rodCtrl;
    const bobberCtrl = new BobberController(); bobberCtrl.addToScene(proxy); bobberCtrlRef.current = bobberCtrl;
    const spotCtrl = new FishingSpotController(); spotCtrl.addToScene(proxy); spotCtrlRef.current = spotCtrl;

    const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1, opacity: 0.6, transparent: true })
    );
    gameGroupRef.current.add(line);
    objectsRef.current.line = line;

    const weatherCtrl = new WeatherController(scene, sky, dirLight, ambientLight, water);
    weatherCtrlRef.current = weatherCtrl;

    // Loop
    let animationId: number;
    let lastTime = Date.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const time = now * 0.001;

      // --- PREVIEW MODE RENDER ---
      if (previewGroupRef.current.visible) {
          if (previewModelRef.current) {
              previewModelRef.current.rotation.y += 0.01; // Rotate model
              previewModelRef.current.position.y = Math.sin(time * 1.5) * 0.1; // Bob model
          }
          // Keep studio camera focused
          if (cameraRef.current) cameraRef.current.lookAt(0, 0, 0);
          composer.render();
          return; 
      }

      // --- GAME MODE RENDER ---
      if (objectsRef.current.water) objectsRef.current.water.material.uniforms['time'].value += 1.0 / 60.0;
      if (weatherCtrlRef.current) {
        weatherCtrlRef.current.update(dt);
        const ws = weatherCtrlRef.current.state;
        const isNight = ws.time < 6 || ws.time > 18;
        if (boatCtrlRef.current) boatCtrlRef.current.setNightMode(isNight || stateRef.current.manualLights);
        if (spotCtrlRef.current) spotCtrlRef.current.update(dt, ws);

        if (onWeatherUpdate) {
            const h = Math.floor(ws.time);
            if (lastWeatherReportRef.current.hour !== h) {
                lastWeatherReportRef.current.hour = h;
                onWeatherUpdate(ws.weather, ws.time);
            }
        }
      }
      if (rodCtrlRef.current) rodCtrlRef.current.animate(time);
      if (boatCtrlRef.current) boatCtrlRef.current.animate(time);
      if (bobberCtrlRef.current) bobberCtrlRef.current.animate(time);

      const { isCasted, targetPos } = stateRef.current;
      const { line } = objectsRef.current;
      const rodTipPos = new THREE.Vector3();
      if (rodCtrlRef.current) rodCtrlRef.current.getTipWorldPosition(rodTipPos);

      if (isCasted && bobberCtrlRef.current && line) {
        bobberCtrlRef.current.position.lerp(targetPos, 0.05);
        bobberCtrlRef.current.position.y = Math.sin(time * 2.5) * 0.04 - 0.05;
        const p = line.geometry.attributes.position.array as Float32Array;
        p[0] = rodTipPos.x; p[1] = rodTipPos.y; p[2] = rodTipPos.z;
        p[3] = bobberCtrlRef.current.position.x; p[4] = bobberCtrlRef.current.position.y + 0.3; p[5] = bobberCtrlRef.current.position.z;
        line.geometry.attributes.position.needsUpdate = true;
      } else if (line) {
         const p = line.geometry.attributes.position.array as Float32Array;
         p[0] = rodTipPos.x; p[1] = rodTipPos.y; p[2] = rodTipPos.z;
         p[3] = rodTipPos.x; p[4] = rodTipPos.y - 1.5; p[5] = rodTipPos.z;
         line.geometry.attributes.position.needsUpdate = true;
      }
      composer.render();
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (composer) composer.dispose();
      if (normalMap) normalMap.dispose();
      scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.geometry) obj.geometry.dispose();
      });
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, []);

  // --- 2. ASYNC PREVIEW LOADING SWITCH ---
  useEffect(() => {
      const cam = cameraRef.current;
      
      if (previewFish) {
          // Enter Studio Mode
          gameGroupRef.current.visible = false;
          previewGroupRef.current.visible = true;
          previewGroupRef.current.clear();
          previewModelRef.current = null; // Clear Ref

          // Lights
          const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
          keyLight.position.set(2, 5, 5);
          previewGroupRef.current.add(keyLight);
          const rimLight = new THREE.DirectionalLight(0x8888ff, 1.0);
          rimLight.position.set(-2, -2, -5);
          previewGroupRef.current.add(rimLight);

          // Camera
          if (cam) {
              cam.position.set(0, 0, 6);
              cam.lookAt(0, 0, 0);
          }

          // Async Load
          loadFishModel(previewFish)
            .then((model) => {
                if (previewGroupRef.current.visible) {
                    previewGroupRef.current.add(model);
                    previewModelRef.current = model; // Assign ref for animation loop
                }
            })
            .catch(e => {
                console.error("Failed to load model", e);
                // Fallback (Red Box) only if even the procedural fallback failed seriously
                const box = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xff0000, wireframe:true}));
                previewGroupRef.current.add(box);
            });

      } else {
          // Exit Studio Mode
          gameGroupRef.current.visible = true;
          previewGroupRef.current.visible = false;
          previewGroupRef.current.clear();
          previewModelRef.current = null;

          if (cam) {
              cam.position.set(0, 5, 10);
              cam.lookAt(0, 0, -10);
          }
      }
  }, [previewFish]);

  // Update Props
  useEffect(() => { if (rodCtrlRef.current) rodCtrlRef.current.update(rodLevel, enchant, rodSkin); }, [rodLevel, enchant, rodSkin]);
  useEffect(() => { if (bobberCtrlRef.current) bobberCtrlRef.current.updateEnchant(enchant); }, [enchant]);
  useEffect(() => { if (boatCtrlRef.current) boatCtrlRef.current.update(boatType); }, [boatType]);

  // API
  apiRef.current.cast = (d) => {
    stateRef.current.isCasted = true;
    rodCtrlRef.current?.triggerCast();
    if (bobberCtrlRef.current) {
       bobberCtrlRef.current.setVisible(true);
       const start = new THREE.Vector3();
       rodCtrlRef.current?.getTipWorldPosition(start);
       bobberCtrlRef.current.position.copy(start);
    }
    stateRef.current.targetPos.set(0, 0, -10 - (d / 5));
  };
  apiRef.current.reset = () => {
    stateRef.current.isCasted = false;
    rodCtrlRef.current?.setReeling(false);
    bobberCtrlRef.current?.setVisible(false);
  };
  apiRef.current.setReeling = (r) => rodCtrlRef.current?.setReeling(r);
  apiRef.current.toggleLights = () => {
      stateRef.current.manualLights = !stateRef.current.manualLights;
      return stateRef.current.manualLights;
  };

  useEffect(() => { if (onReady) onReady(apiRef.current); }, [onReady]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-black" />;
};

export default React.memo(ThreeView);
