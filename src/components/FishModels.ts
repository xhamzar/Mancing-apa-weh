
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FishType } from '../types';
import { genDragon } from './fish/DragonModel';
import { genShark } from './fish/SharkModel';
import { genAncient } from './fish/AncientModel';
import { genArowana } from './fish/ArowanaModel';
import { genCoelacanth } from './fish/CoelacanthModel';
import { genGeneric } from './fish/GenericModel';

const modelCache: Record<string, THREE.Group> = {};

const getModelConfig = (id: string) => {
    if (id.includes('dragon')) return { file: 'sea_dragon', gen: genDragon };
    if (id.includes('cosmic') || id.includes('megalodon')) return { file: 'megalodon', gen: genShark };
    if (id.includes('shark')) return { file: 'shark', gen: genShark };
    if (id.includes('ancient') || id.includes('dunkle')) return { file: 'dunkleosteus', gen: genAncient };
    if (id.includes('legend') || id.includes('coelacanth')) return { file: 'coelacanth', gen: genCoelacanth };
    if (id.includes('mythical') || id.includes('leeds')) return { file: 'leedsichthys', gen: genCoelacanth };
    if (id.includes('rare') || id.includes('arowana')) return { file: 'arowana', gen: genArowana };
    if (id.includes('rainbow') || id.includes('trout')) return { file: 'rainbow_trout', gen: genGeneric };
    if (id.includes('blue') || id.includes('tetra')) return { file: 'neon_tetra', gen: genGeneric };
    if (id.includes('common') || id.includes('gold')) return { file: 'goldfish', gen: genGeneric };
    return { file: 'generic_fish', gen: genGeneric };
};

export const loadFishModel = (fish: FishType): Promise<THREE.Group> => {
    return new Promise((resolve) => {
        const { file, gen } = getModelConfig(fish.id);
        const cacheKey = file; 

        if (modelCache[cacheKey]) {
            const cloned = modelCache[cacheKey].clone();
            applySkin(cloned, fish); 
            resolve(cloned);
            return;
        }

        const loader = new OBJLoader();
        // PERUBAHAN PENTING: Menggunakan './models/' agar relatif terhadap index.html
        // Ini mencegah error 404 di GitHub Pages yang menggunakan sub-path
        const url = `./models/${file}.obj`; 

        loader.load(
            url,
            (obj) => {
                const box = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                
                if (maxDim > 0) obj.scale.setScalar(3.0 / maxDim);

                const center = new THREE.Vector3();
                box.getCenter(center);
                obj.position.sub(center); 

                modelCache[cacheKey] = obj;
                
                const processed = obj.clone();
                applySkin(processed, fish);
                resolve(processed);
            },
            undefined, 
            (err) => {
                console.warn(`OBJ load failed for ${url}. Using procedural fallback.`);
                const group = new THREE.Group();
                const mat = new THREE.MeshStandardMaterial(); 
                gen(group, mat, mat, mat); 
                group.scale.setScalar(1.2);
                modelCache[cacheKey] = group; 
                const processed = group.clone();
                applySkin(processed, fish);
                resolve(processed);
            }
        );
    });
};

function applySkin(group: THREE.Group, fish: FishType) {
    const color = new THREE.Color(fish.color);
    
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 0.4, 
        metalness: 0.1,
        flatShading: true,
        side: THREE.DoubleSide
    });
    
    const finMat = new THREE.MeshStandardMaterial({ 
        color: color.clone().offsetHSL(0, 0, -0.1), 
        roughness: 0.6, 
        flatShading: true,
        side: THREE.DoubleSide
    });
    
    const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.2, 
        flatShading: false 
    });

    group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const name = child.name.toLowerCase();
            
            if (name.includes('eye')) {
                child.material = eyeMat;
            } else if (name.includes('fin') || name.includes('tail') || name.includes('wing')) {
                child.material = finMat;
            } else {
                child.material = bodyMat;
            }
        }
    });
}
