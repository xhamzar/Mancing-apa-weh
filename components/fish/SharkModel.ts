
import * as THREE from 'three';
import { createFin, createEye } from './FishHelpers';

export function genShark(group: THREE.Group, mat: THREE.Material, finMat: THREE.Material, eyeMat: THREE.Material) {
     const points = [];
     points.push(new THREE.Vector2(0, 2.5));
     points.push(new THREE.Vector2(0.5, 1.5));
     points.push(new THREE.Vector2(0.7, 0.5));
     points.push(new THREE.Vector2(0.4, -1.5));
     points.push(new THREE.Vector2(0, -3.0));
     
     const geo = new THREE.LatheGeometry(points, 4);
     geo.rotateX(Math.PI/2);
     const body = new THREE.Mesh(geo, mat);
     body.scale.z = 0.8;
     group.add(body);

     const dorsal = createFin(0.8, 0.8, finMat);
     dorsal.rotation.y = -Math.PI/2;
     dorsal.rotation.z = -Math.PI/4;
     dorsal.position.set(0, 0.6, 0.2);
     group.add(dorsal);

     const tailGroup = new THREE.Group();
     tailGroup.name = "Tail";
     tailGroup.position.z = -2.8;
     const topTail = createFin(1.0, 0.6, finMat);
     topTail.rotation.y = -Math.PI/2;
     topTail.rotation.z = Math.PI/3;
     const botTail = createFin(0.8, 0.5, finMat);
     botTail.rotation.y = -Math.PI/2;
     botTail.rotation.z = -Math.PI/3;
     tailGroup.add(topTail, botTail);
     group.add(tailGroup);

     group.add(createEye(0.35, 0.2, 1.8, eyeMat));
     group.add(createEye(-0.35, 0.2, 1.8, eyeMat));
}
