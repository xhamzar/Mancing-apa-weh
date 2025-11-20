
import * as THREE from 'three';
import { createFin } from './FishHelpers';

export function genAncient(group: THREE.Group, mat: THREE.Material, finMat: THREE.Material) {
     const headGeo = new THREE.BoxGeometry(1.2, 1.2, 1.4);
     const armorMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8, flatShading: true });
     const head = new THREE.Mesh(headGeo, armorMat);
     head.position.z = 0.8;
     group.add(head);

     const bodyGeo = new THREE.ConeGeometry(0.6, 2.5, 4);
     bodyGeo.rotateX(-Math.PI/2);
     const body = new THREE.Mesh(bodyGeo, mat);
     body.position.z = -1.2;
     group.add(body);

     const tailGroup = new THREE.Group();
     tailGroup.name = "Tail";
     tailGroup.position.z = -2.5;
     const tailFin = createFin(0.8, 0.8, finMat);
     tailFin.rotation.y = -Math.PI/2;
     tailGroup.add(tailFin);
     group.add(tailGroup);
}
