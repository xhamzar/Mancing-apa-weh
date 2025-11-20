
import * as THREE from 'three';
import { createFin } from './FishHelpers';

export function genCoelacanth(group: THREE.Group, mat: THREE.Material, finMat: THREE.Material) {
      const points = [];
      points.push(new THREE.Vector2(0, 1.5));
      points.push(new THREE.Vector2(0.6, 0.5));
      points.push(new THREE.Vector2(0.6, -0.5));
      points.push(new THREE.Vector2(0.3, -1.5));
      points.push(new THREE.Vector2(0, -2.0));

      const geo = new THREE.LatheGeometry(points, 5);
      geo.rotateX(Math.PI/2);
      const body = new THREE.Mesh(geo, mat);
      group.add(body);
      
      const finB = createFin(0.6, 0.6, finMat);
      finB.rotation.y = -Math.PI/2;
      finB.rotation.z = Math.PI; 
      finB.position.y = -0.5;
      group.add(finB);

      const tailGroup = new THREE.Group();
      tailGroup.name = "Tail";
      tailGroup.position.z = -2.0;
      const tail = createFin(0.8, 0.8, finMat);
      tail.rotation.y = -Math.PI/2;
      tail.rotation.z = Math.PI/2;
      tailGroup.add(tail);
      group.add(tailGroup);
}
