
import * as THREE from 'three';
import { createEye } from './FishHelpers';

export function genArowana(group: THREE.Group, mat: THREE.Material, finMat: THREE.Material, eyeMat: THREE.Material) {
     const points = [];
     points.push(new THREE.Vector2(0, 2.0));
     points.push(new THREE.Vector2(0.4, 1.0));
     points.push(new THREE.Vector2(0.4, -1.0));
     points.push(new THREE.Vector2(0, -2.0));
     
     const geo = new THREE.LatheGeometry(points, 3);
     geo.rotateX(Math.PI/2);
     geo.rotateZ(Math.PI/4);
     
     const body = new THREE.Mesh(geo, mat);
     body.scale.set(0.6, 1.2, 1.0);
     group.add(body);

     group.add(createEye(0.25, 0.1, 1.6, eyeMat));
     group.add(createEye(-0.25, 0.1, 1.6, eyeMat));

     const tailGroup = new THREE.Group();
     tailGroup.name = "Tail";
     tailGroup.position.z = -2.0;
     const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.1, 0.8, 3, 1), finMat);
     tail.rotation.x = Math.PI/2;
     tail.scale.z = 0.1;
     tailGroup.add(tail);
     group.add(tailGroup);
}
