import * as THREE from "three";

export function createHumanoid(
  skinMat: THREE.Material,
  shirtMat: THREE.Material,
  shortsMat: THREE.Material,
  hairColor: number,
  faceTex: THREE.Texture,
  isKicker: boolean
) {
  const group = new THREE.Group();

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0);
  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.5,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), headMat);
  head.castShadow = true;
  head.rotation.y = isKicker ? Math.PI : 0;
  headGroup.add(head);

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.9,
  });
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    hairMat
  );
  hair.position.y = 0.02;
  hair.castShadow = true;
  headGroup.add(hair);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.6, 16),
    shirtMat
  );
  body.position.set(0, 0.75, 0);
  body.castShadow = true;
  body.receiveShadow = true;

  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.5, 16);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.3, 0.7, 0);
  armL.castShadow = true;
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.3, 0.7, 0);
  armR.castShadow = true;

  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 16);
  const legL = new THREE.Mesh(legGeo, shortsMat);
  legL.position.set(-0.12, 0.25, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, shortsMat);
  legR.position.set(0.12, 0.25, 0);
  legR.castShadow = true;

  group.add(headGroup, body, armL, armR, legL, legR);
  return { group, armL, armR, legL, legR, body };
}

export function createOptimizedPitch(): THREE.Group {
  const pitchGroup = new THREE.Group();

  const mainGrass = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 })
  );
  mainGrass.rotation.x = -Math.PI / 2;
  mainGrass.position.set(0, 0, -5);
  mainGrass.receiveShadow = true;
  pitchGroup.add(mainGrass);

  // [TỐI ƯU]: Gom 25 sọc cỏ thành 1 lệnh vẽ duy nhất bằng InstancedMesh
  const stripeGeo = new THREE.PlaneGeometry(70, 2);
  const stripeMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  const stripesInstanced = new THREE.InstancedMesh(stripeGeo, stripeMat, 25);
  stripesInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < 25; i++) {
    dummy.position.set(0, 0.005, 18 - i * 2);
    dummy.rotation.x = -Math.PI / 2;
    dummy.updateMatrix();
    stripesInstanced.setMatrixAt(i, dummy.matrix);
    // Áp màu xen kẽ cho từng instance
    stripesInstanced.setColorAt(
      i,
      new THREE.Color(i % 2 === 0 ? 0x2e7d32 : 0x388e3c)
    );
  }
  pitchGroup.add(stripesInstanced);

  return pitchGroup;
}

export function createOptimizedStadium(
  homeColor: string,
  awayColor: string
): THREE.Group {
  const stadiumGroup = new THREE.Group();
  stadiumGroup.position.set(0, 0, -10);

  const fanPositions: { x: number; y: number; z: number; isHome: boolean }[] =
    [];

  // Tính toán vị trí khán giả & Tạo bậc thang
  for (let i = 0; i < 5; i++) {
    const stepY = i * 1.3;
    const stepZ = -i * 2.2;

    const row = new THREE.Mesh(
      new THREE.BoxGeometry(60, stepY + 1.8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    row.position.set(0, stepY / 2, stepZ);
    stadiumGroup.add(row);

    for (let j = -20; j <= 20; j += 1.1) {
      fanPositions.push({
        x: j,
        y: stepY + 0.9,
        z: stepZ,
        isHome: Math.random() > 0.3,
      });
    }
  }

  // [TỐI ƯU TV LAG]: Hàng nghìn khán giả gom lại thành 2 lệnh vẽ (1 Body, 1 Head)
  const totalFans = fanPositions.length;

  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.7, 8);
  const bodyMat = new THREE.MeshStandardMaterial();
  const bodiesInstanced = new THREE.InstancedMesh(bodyGeo, bodyMat, totalFans);

  const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const headsInstanced = new THREE.InstancedMesh(headGeo, headMat, totalFans);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  fanPositions.forEach((pos, idx) => {
    // Body
    dummy.position.set(pos.x, pos.y + 0.05, pos.z);
    dummy.updateMatrix();
    bodiesInstanced.setMatrixAt(idx, dummy.matrix);
    color.setHex(pos.isHome ? homeColor : awayColor);
    bodiesInstanced.setColorAt(idx, color);

    // Head
    dummy.position.set(pos.x, pos.y + 0.55, pos.z);
    dummy.updateMatrix();
    headsInstanced.setMatrixAt(idx, dummy.matrix);
  });

  stadiumGroup.add(bodiesInstanced, headsInstanced);
  return stadiumGroup;
}

export function createPitchLines(): THREE.Group {
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const linesGroup = new THREE.Group();
  linesGroup.position.y = 0.02; // Nâng nhẹ lên mặt cỏ

  const goalLine = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.12), lineMat);
  goalLine.rotation.x = -Math.PI / 2;
  goalLine.position.set(0, 0, -4.04);

  const box5m50Front = new THREE.Mesh(
    new THREE.PlaneGeometry(10.32, 0.12),
    lineMat
  );
  box5m50Front.rotation.x = -Math.PI / 2;
  box5m50Front.position.set(0, 0, -0.1);
  const box5m50Left = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4), lineMat);
  box5m50Left.rotation.x = -Math.PI / 2;
  box5m50Left.position.set(-5.16, 0, -2.1);
  const box5m50Right = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 4),
    lineMat
  );
  box5m50Right.rotation.x = -Math.PI / 2;
  box5m50Right.position.set(5.16, 0, -2.1);

  const box16m50Front = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 0.12),
    lineMat
  );
  box16m50Front.rotation.x = -Math.PI / 2;
  box16m50Front.position.set(0, 0, 8.46);
  const box16m50Left = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 16.5),
    lineMat
  );
  box16m50Left.rotation.x = -Math.PI / 2;
  box16m50Left.position.set(-20.16, 0, 4.21);
  const box16m50Right = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 16.5),
    lineMat
  );
  box16m50Right.rotation.x = -Math.PI / 2;
  box16m50Right.position.set(20.16, 0, 4.21);

  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), lineMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, 0, 2);

  linesGroup.add(
    goalLine,
    box5m50Front,
    box5m50Left,
    box5m50Right,
    box16m50Front,
    box16m50Left,
    box16m50Right,
    spot
  );

  return linesGroup;
}
