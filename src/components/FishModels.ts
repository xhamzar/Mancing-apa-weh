
import * as THREE from 'three';
import { FishType } from '../types';
import { genDragon } from './fish/DragonModel';
import { genShark } from './fish/SharkModel';
import { genAncient } from './fish/AncientModel';
import { genArowana } from './fish/ArowanaModel';
import { genCoelacanth } from './fish/CoelacanthModel';
import { genGeneric } from './fish/GenericModel';

export function generateFishModel(fish: FishType): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(fish.color);
  
  // Shared Materials with DoubleSide to prevent invisible faces on open geometry
  const mat = new THREE.MeshStandardMaterial({ 
      color: color, 
      roughness: 0.4, 
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide
  });
  
  const finMat = new THREE.MeshStandardMaterial({ 
      color: color.clone().offsetHSL(0, 0, -0.1), 
      roughness: 0.6, 
      side: THREE.DoubleSide,
      flatShading: true
  });
  
  const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111, 
      roughness: 0.8, 
      flatShading: true,
      side: THREE.DoubleSide
  });

  // Route to specific generator based on ID
  if (fish.id.includes('dragon')) {
      genDragon(group, mat, finMat);
  } else if (fish.id.includes('cosmic') || fish.id.includes('shark')) {
      genShark(group, mat, finMat, eyeMat);
  } else if (fish.id.includes('ancient') || fish.id.includes('dunkle')) {
      genAncient(group, mat, finMat);
  } else if (fish.id.includes('rare') || fish.id.includes('arowana')) {
      genArowana(group, mat, finMat, eyeMat);
  } else if (fish.id.includes('legend') || fish.id.includes('coelacanth')) {
      genCoelacanth(group, mat, finMat);
  } else {
      genGeneric(group, mat, finMat, eyeMat);
  }

  return group;
}
