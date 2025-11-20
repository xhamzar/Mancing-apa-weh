
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { Water } from 'three/addons/objects/Water.js';
// @ts-ignore
import { Sky } from 'three/addons/objects/Sky.js';
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { RodController } from './RodController';
import { BoatController } from './BoatController';
import { BobberController } from './BobberController';
import { WeatherController } from './WeatherController';
import { FishingSpotController } from './FishingSpotController';
import { WeatherType, BoatType, RodSkinType, FishType } from '../types';
import { generateFishModel } from './FishModels';

interface ThreeViewProps {
  rodLevel: number;
  enchant: string;
  boatType: BoatType;
  rodSkin: RodSkinType;
  previewFish: FishType | null; // Prop for Fish Viewer Mode
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
  
  // Camera reference for switching views
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Controllers refs for React updates
  const rodCtrlRef = useRef<RodController | null>(null);
  const boatCtrlRef = useRef<BoatController | null>(null);
  const bobberCtrlRef = useRef<BobberController | null>(null);
  const weatherCtrlRef = useRef<WeatherController | null>(null);
  const spotCtrlRef = useRef<FishingSpotController | null>(null);

  // Scene Groups
  const gameGroupRef = useRef<THREE.Group>(new THREE.Group());
  const previewGroupRef = useRef<THREE.Group>(new THREE.Group());

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

  // --- 1. INITIALIZE SCENE (RUNS ONCE) ---
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.add(gameGroupRef.current);
    scene.add(previewGroupRef.current);
    previewGroupRef.current.visible = false; // Start in Game Mode

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, -10);
    cameraRef.current = camera;

    // Renderer
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

    // Post Processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4, 0.4, 0.6
    );
    composer.addPass(bloomPass);
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // --- GLOBAL LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(30, 100, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 512; // Low res for performance
    dirLight.shadow.mapSize.height = 512;
    scene.add(dirLight);

    // --- GAME GROUP SETUP ---
    const sun = new THREE.Vector3();
    const sky = new Sky();
    sky.scale.setScalar(10000);
    gameGroupRef.current.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const phi = THREE.MathUtils.degToRad(88);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    
    // Procedural Water Texture
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if(ctx) {
        ctx.fillStyle = '#8080ff'; 
        ctx.fillRect(0,0,256,256);
        for(let i=0; i<5000; i++) {
            const x = Math.random()*256;
            const y = Math.random()*256;
            ctx.fillStyle = Math.random() > 0.5 ? '#8585ff' : '#7b7bff';
            ctx.fillRect(x,y, 3, 3);
        }
    }
    const normalMap = new THREE.CanvasTexture(canvas);
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(
        waterGeometry,
        {
            textureWidth: 256, 
            textureHeight: 256,
            waterNormals: normalMap,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x004966, 
            distortionScale: 3.7,
            fog: true
        }
    );
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    gameGroupRef.current.add(water);
    objectsRef.current.water = water;

    // Init Controllers (Game Group)
    const gameSceneProxy = gameGroupRef.current as any;

    const boatCtrl = new BoatController();
    boatCtrl.addToScene(gameSceneProxy);
    boatCtrlRef.current = boatCtrl;

    const rodCtrl = new RodController();
    rodCtrl.addToScene(gameSceneProxy);
    rodCtrlRef.current = rodCtrl;

    const bobberCtrl = new BobberController();
    bobberCtrl.addToScene(gameSceneProxy);
    bobberCtrlRef.current = bobberCtrl;

    const spotCtrl = new FishingSpotController();
    spotCtrl.addToScene(gameSceneProxy);
    spotCtrlRef.current = spotCtrl;

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1, opacity: 0.6, transparent: true });
    const points = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, lineMat);
    gameGroupRef.current.add(line);
    objectsRef.current.line = line;

    // Weather
    const weatherCtrl = new WeatherController(scene, sky, dirLight, ambientLight, water);
    weatherCtrlRef.current = weatherCtrl;

    // --- ANIMATION LOOP ---
    let animationId: number;
    let lastTime = Date.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const time = now * 0.001;

      // --- IF PREVIEW ACTIVE: RENDER FISH AND SKIP GAME LOGIC ---
      if (previewGroupRef.current.visible) {
          const fish = previewGroupRef.current.children[0];
          if (fish) {
              fish.rotation.y += 0.01;
              fish.position.y = Math.sin(time * 1.5) * 0.1; // Float gently at center
          }
          // Lock camera for studio view
          if (cameraRef.current) {
              // Ensure it stays looking at center even if other logic touches it
              cameraRef.current.lookAt(0, 0, 0); 
          }
          composer.render();
          return; 
      }

      // --- GAME LOGIC ---
      if (objectsRef.current.water) {
        objectsRef.current.water.material.uniforms['time'].value += 1.0 / 60.0;
      }

      if (weatherCtrlRef.current) {
        weatherCtrlRef.current.update(dt);
        
        const weatherState = weatherCtrlRef.current.state;
        const isNight = weatherState.time < 6 || weatherState.time > 18;
        const lightsActive = isNight || stateRef.current.manualLights;
        if (boatCtrlRef.current) boatCtrlRef.current.setNightMode(lightsActive);
        if (spotCtrlRef.current) spotCtrlRef.current.update(dt, weatherState);

        if (onWeatherUpdate) {
            const currentHour = Math.floor(weatherState.time);
            const last = lastWeatherReportRef.current;
            if (last.weather !== weatherState.weather || last.hour !== currentHour) {
                lastWeatherReportRef.current = { weather: weatherState.weather, hour: currentHour };
                onWeatherUpdate(weatherState.weather, weatherState.time);
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
        const bobble = Math.sin(time * 2.5) * 0.04 + Math.cos(time * 1.5) * 0.02;
        bobberCtrlRef.current.position.y = bobble - 0.05;

        const positions = line.geometry.attributes.position.array as Float32Array;
        positions[0] = rodTipPos.x; positions[1] = rodTipPos.y; positions[2] = rodTipPos.z;
        positions[3] = bobberCtrlRef.current.position.x; 
        positions[4] = bobberCtrlRef.current.position.y + 0.3; 
        positions[5] = bobberCtrlRef.current.position.z;
        line.geometry.attributes.position.needsUpdate = true;
      } else if (line && !isCasted) {
         const positions = line.geometry.attributes.position.array as Float32Array;
         positions[0] = rodTipPos.x; positions[1] = rodTipPos.y; positions[2] = rodTipPos.z;
         const swingX = Math.sin(time * 1.5) * 0.1;
         const swingZ = Math.cos(time * 1.2) * 0.1;
         positions[3] = rodTipPos.x + swingX; positions[4] = rodTipPos.y - 1.5; positions[5] = rodTipPos.z + swingZ;
         line.geometry.attributes.position.needsUpdate = true;
      }

      composer.render();
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // CLEANUP ON UNMOUNT
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      if (composer) composer.dispose();
      if (normalMap) normalMap.dispose();
      
      scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
              if(object.geometry) object.geometry.dispose();
              if (object.material) {
                  if (Array.isArray(object.material)) object.material.forEach((m: any) => m.dispose());
                  else (object.material as any).dispose();
              }
          }
      });

      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
           container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // --- 2. HANDLE PREVIEW MODE SWITCHING ---
  useEffect(() => {
      const cam = cameraRef.current;

      if (previewFish) {
          // === ENTER STUDIO MODE ===
          gameGroupRef.current.visible = false;
          previewGroupRef.current.visible = true;
          previewGroupRef.current.clear();

          try {
              // Create Fish Model
              const fishModel = generateFishModel(previewFish);
              fishModel.position.set(0, 0, 0);
              fishModel.scale.setScalar(1.5);
              previewGroupRef.current.add(fishModel);

              // Studio Lighting (Key + Rim)
              const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
              keyLight.position.set(2, 5, 5);
              previewGroupRef.current.add(keyLight);

              const rimLight = new THREE.DirectionalLight(0x8888ff, 1.0);
              rimLight.position.set(-2, -2, -5);
              previewGroupRef.current.add(rimLight);

              // Move Camera to Close-up
              if (cam) {
                  cam.position.set(0, 0, 6);
                  cam.lookAt(0, 0, 0);
              }

          } catch (err) {
              console.error("Failed to generate fish model:", err);
              // Fallback Error Mesh
              const errorMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
              previewGroupRef.current.add(errorMesh);
          }

      } else {
          // === RETURN TO GAME MODE ===
          gameGroupRef.current.visible = true;
          previewGroupRef.current.visible = false;
          previewGroupRef.current.clear();

          // Reset Camera to Game Position
          if (cam) {
              cam.position.set(0, 5, 10);
              cam.lookAt(0, 0, -10);
          }
      }
  }, [previewFish]);

  // Update props
  useEffect(() => {
    if (rodCtrlRef.current) rodCtrlRef.current.update(rodLevel, enchant, rodSkin);
    if (bobberCtrlRef.current) bobberCtrlRef.current.updateEnchant(enchant);
  }, [rodLevel, enchant, rodSkin]);

  useEffect(() => {
      if (boatCtrlRef.current) boatCtrlRef.current.update(boatType);
  }, [boatType]);

  // Setup API
  apiRef.current.cast = (distance: number) => {
    stateRef.current.isCasted = true;
    if (rodCtrlRef.current) rodCtrlRef.current.triggerCast();
    if (bobberCtrlRef.current) {
      bobberCtrlRef.current.setVisible(true);
      const startPos = new THREE.Vector3();
      if (rodCtrlRef.current) rodCtrlRef.current.getTipWorldPosition(startPos);
      bobberCtrlRef.current.position.copy(startPos);
    }
    const zPos = -10 - (distance / 5);
    stateRef.current.targetPos.set(0, 0, zPos);
  };

  apiRef.current.reset = () => {
    stateRef.current.isCasted = false;
    if (rodCtrlRef.current) rodCtrlRef.current.setReeling(false);
    if (bobberCtrlRef.current) bobberCtrlRef.current.setVisible(false);
  };

  apiRef.current.setReeling = (reeling: boolean) => {
    if (rodCtrlRef.current) rodCtrlRef.current.setReeling(reeling);
  };

  apiRef.current.toggleLights = () => {
      stateRef.current.manualLights = !stateRef.current.manualLights;
      return stateRef.current.manualLights;
  };

  useEffect(() => {
    if (onReady) onReady(apiRef.current);
  }, [onReady]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-black" />;
};

export default React.memo(ThreeView);
