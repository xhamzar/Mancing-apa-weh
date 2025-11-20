
import * as THREE from 'three';
import { createFin, createEye } from './FishHelpers';

export function genGeneric(group: THREE.Group, mat: THREE.Material, finMat: THREE.Material, eyeMat: THREE.Material) {
     const frontGeo = new THREE.ConeGeometry(0.5, 1.5, 4);
     frontGeo.rotateX(Math.PI/2);
     const front = new THREE.Mesh(frontGeo, mat);
     front.position.z = 0.75;
     group.add(front);

     const backGeo = new THREE.ConeGeometry(0.5, 1.5, 4);
     backGeo.rotateX(-Math.PI/2);
     const back = new THREE.Mesh(backGeo, mat);
     back.position.z = -0.75;
     group.add(back);

     const tailGroup = new THREE.Group();
     tailGroup.name = "Tail";
     tailGroup.position.z = -1.5;
     const tail = createFin(0.8, 0.8, finMat);
     tail.rotation.y = -Math.PI/2;
     tail.position.x = 0;
     tail.rotation.z = Math.PI/2;
     tailGroup.add(tail);
     group.add(tailGroup);

     const finL = createFin(0.5, 0.5, finMat);
     finL.name = "FinL";
     finL.position.set(0.4, -0.2, 0.5);
     finL.rotation.y = -Math.PI/2;
     finL.rotation.z = -Math.PI/3;
     group.add(finL);
     
     const finR = createFin(0.5, 0.5, finMat);
     finR.name = "FinR";
     finR.position.set(-0.4, -0.2, 0.5);
     finR.rotation.y = -Math.PI/2;
     finR.rotation.z = Math.PI/3;
     group.add(finR);

     group.add(createEye(0.3, 0.1, 1.0, eyeMat));
     group.add(createEye(-0.3, 0.1, 1.0, eyeMat));
}
