
import * as THREE from 'three';
import { createFin } from './FishHelpers';

export function genDragon(group: THREE.Group, mat: THREE.Material, finMat: THREE.Material) {
     const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 1.5),
        new THREE.Vector3(0, -0.3, 0.5),
        new THREE.Vector3(0, 0.3, -0.5),
        new THREE.Vector3(0, 0, -1.5),
     ]);
     
     const tubeGeo = new THREE.TubeGeometry(path, 8, 0.2, 3, false);
     const body = new THREE.Mesh(tubeGeo, mat);
     group.add(body);

     const headGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
     headGeo.rotateX(-Math.PI/2);
     const head = new THREE.Mesh(headGeo, mat);
     head.position.set(0, 0.1, 1.6);
     group.add(head);

     for(let i=0; i<4; i++) { 
         const leafGeo = new THREE.CircleGeometry(0.2, 3); 
         const leaf = new THREE.Mesh(leafGeo, finMat);
         const point = path.getPointAt(i/3.5);
         leaf.position.copy(point);
         leaf.position.y += 0.15;
         leaf.rotation.z = (i%2===0 ? 0.5 : -0.5);
         group.add(leaf);
     }
}
