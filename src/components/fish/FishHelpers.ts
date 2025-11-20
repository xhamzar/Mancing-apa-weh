
import * as THREE from 'three';

export const createFin = (w: number, h: number, mat: THREE.Material) => {
    const shape = new THREE.Shape();
    shape.moveTo(0,0);
    shape.lineTo(w, h/2);
    shape.lineTo(0, h);
    shape.lineTo(0,0);
    const geo = new THREE.ShapeGeometry(shape);
    return new THREE.Mesh(geo, mat);
};

export const createEye = (x: number, y: number, z: number, mat: THREE.Material) => {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1); 
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
};
