
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FishType } from '../types';
import { genDragon } from './fish/DragonModel';
import { genShark } from './fish/SharkModel';
import { genAncient } from './fish/AncientModel';
import { genArowana } from './fish/ArowanaModel';
import { genCoelacanth } from './fish/CoelacanthModel';
import { genGeneric } from './fish/GenericModel';

// Cache loaded models to prevent re-downloading
const modelCache: Record<string, THREE.Group> = {};

// --- MODEL MAPPING CONFIGURATION ---
// Maps Fish IDs to specific .obj filenames and fallback generators
const getModelConfig = (id: string) => {
    // DRAGON TIER
    if (id.includes('dragon')) return { file: 'sea_dragon', gen: genDragon };
    
    // SHARK / COSMIC TIER
    if (id.includes('cosmic') || id.includes('megalodon')) return { file: 'megalodon', gen: genShark };
    if (id.includes('shark')) return { file: 'shark', gen: genShark };
    
    // ANCIENT TIER
    if (id.includes('ancient') || id.includes('dunkle')) return { file: 'dunkleosteus', gen: genAncient };
    
    // LEGENDARY TIER
    if (id.includes('legend') || id.includes('coelacanth')) return { file: 'coelacanth', gen: genCoelacanth };
    
    // MYTHICAL TIER
    if (id.includes('mythical') || id.includes('leeds')) return { file: 'leedsichthys', gen: genCoelacanth }; // Fallback to bulky
    
    // RARE TIER
    if (id.includes('rare') || id.includes('arowana')) return { file: 'arowana', gen: genArowana };
    
    // SPECIAL TIER
    if (id.includes('rainbow') || id.includes('trout')) return { file: 'rainbow_trout', gen: genGeneric };
    
    // UNCOMMON TIER
    if (id.includes('blue') || id.includes('tetra')) return { file: 'neon_tetra', gen: genGeneric };
    
    // COMMON TIER
    if (id.includes('common') || id.includes('gold')) return { file: 'goldfish', gen: genGeneric };

    // Default Fallback
    return { file: 'generic_fish', gen: genGeneric };
};

export const loadFishModel = (fish: FishType): Promise<THREE.Group> => {
    return new Promise((resolve) => {
        const { file, gen } = getModelConfig(fish.id);
        const cacheKey = file; 

        // 1. Use Cached Geometry if available
        if (modelCache[cacheKey]) {
            const cloned = modelCache[cacheKey].clone();
            applySkin(cloned, fish); 
            resolve(cloned);
            return;
        }

        // 2. Attempt to load OBJ
        const loader = new OBJLoader();
        const url = `/models/${file}.obj`; // Looks in public/models/

        // console.log(`Loading 3D Model: ${url} for ${fish.name}`);

        loader.load(
            url,
            (obj) => {
                // === SUCCESS: OBJ Loaded ===
                // Normalize Scale & Center
                const box = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                
                // Auto-scale to ~3.0 units size for consistency
                if (maxDim > 0) obj.scale.setScalar(3.0 / maxDim);

                const center = new THREE.Vector3();
                box.getCenter(center);
                obj.position.sub(center); // Center pivot to 0,0,0

                // Cache the raw geometry group
                modelCache[cacheKey] = obj;
                
                // Clone and Skin
                const processed = obj.clone();
                applySkin(processed, fish);
                resolve(processed);
            },
            undefined, // onProgress
            (err) => {
                // === FAIL: Fallback to Procedural ===
                // This safely handles missing .obj files
                console.warn(`OBJ load failed for ${url}. Using procedural fallback.`);
                
                const group = new THREE.Group();
                // Use dummy mats for generation, they get replaced by applySkin
                const mat = new THREE.MeshStandardMaterial(); 
                gen(group, mat, mat, mat); 
                
                // Adjust scale for procedural models
                group.scale.setScalar(1.2);

                modelCache[cacheKey] = group; // Cache the procedural geo too
                
                const processed = group.clone();
                applySkin(processed, fish);
                resolve(processed);
            }
        );
    });
};

function applySkin(group: THREE.Group, fish: FishType) {
    const color = new THREE.Color(fish.color);
    
    // Main Body Material
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 0.4, 
        metalness: 0.1,
        flatShading: true,
        side: THREE.DoubleSide
    });
    
    // Fin Material (Slightly Darker/Different)
    const finMat = new THREE.MeshStandardMaterial({ 
        color: color.clone().offsetHSL(0, 0, -0.1), 
        roughness: 0.6, 
        flatShading: true,
        side: THREE.DoubleSide
    });
    
    // Eye Material
    const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.2, 
        flatShading: false 
    });

    group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Logic to assign materials based on Mesh Name (from Blender/OBJ)
            // Naming convention expected in OBJ: 'Eye', 'Fin', 'Body'
            // If generic/unnamed, defaults to Body Color.
            const name = child.name.toLowerCase();
            
            if (name.includes('eye')) {
                child.material = eyeMat;
            } else if (name.includes('fin') || name.includes('tail') || name.includes('wing')) {
                child.material = finMat;
            } else {
                // Default to body color
                child.material = bodyMat;
            }
        }
    });
}
