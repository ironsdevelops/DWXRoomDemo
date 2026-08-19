import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function makeCanvasTexture(draw, size = 256, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function makeWoodTexture() {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#6B4A34';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 45; i++) {
      const y = (i / 45) * s + (Math.random() - 0.5) * 6;
      ctx.strokeStyle = `rgba(${40 + Math.random() * 30}, ${25 + Math.random() * 15}, ${15 + Math.random() * 10}, ${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) {
        ctx.lineTo(x, y + Math.sin(x / 20 + i) * 3);
      }
      ctx.stroke();
    }
  }, 256, 2, 2);
}

function makeFloorTexture() {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#C9C2B4';
    ctx.fillRect(0, 0, s, s);
    const plankW = s / 6;
    for (let i = 0; i < 6; i++) {
      const shade = 195 + Math.round(Math.random() * 20 - 10);
      ctx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 25})`;
      ctx.fillRect(i * plankW, 0, plankW - 2, s);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < s; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
    }
  }, 256, 4, 4);
}

function makeWallTexture() {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#F2F0E9';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const shade = Math.random() > 0.5 ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }, 128, 2, 2);
}

function makeFabricTexture(hex) {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
  }, 64, 5, 5);
}

function makeLightPanelTexture(brightness) {
  return makeCanvasTexture((ctx, s) => {
    const c = s / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    const warmR = 250, warmG = 240 - brightness * 20, warmB = 210 - brightness * 60;
    const baseR = 221, baseG = 218, baseB = 208;
    const r = Math.round(baseR + (warmR - baseR) * brightness);
    const g = Math.round(baseG + (warmG - baseG) * brightness);
    const b = Math.round(baseB + (warmB - baseB) * brightness);
    grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    grad.addColorStop(0.6, `rgb(${Math.round(r * 0.9)}, ${Math.round(g * 0.9)}, ${Math.round(b * 0.9)})`);
    grad.addColorStop(1, `rgb(${Math.round(baseR * 0.85)}, ${Math.round(baseG * 0.85)}, ${Math.round(baseB * 0.85)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }, 64, 1, 1);
}

function makeTouchPanelTexture(active, roomName) {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = active ? '#0F6E56' : '#333333';
    ctx.beginPath();
    ctx.roundRect(s * 0.15, s * 0.35, s * 0.7, s * 0.3, 10);
    ctx.fill();
    ctx.fillStyle = '#F2F0E9';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(active ? 'In meeting' : 'Join meeting', s / 2, s * 0.5);
    ctx.fillStyle = '#5F5E5A';
    ctx.font = '12px sans-serif';
    ctx.fillText(roomName, s / 2, s * 0.18);
  }, 256, 1, 1);
}

function makeReadoutTexture(tempValue) {
  return makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2F0E9';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(tempValue)}°`, s / 2, s / 2 + 2);
  }, 128, 1, 1);
}

function buildChair(scene, x, z, rotationY, fabricTex) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2C2C2A, roughness: 0.6 });
  const cushionMat = new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.9 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), cushionMat);
  seat.position.y = 0.45;
  group.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), cushionMat);
  back.position.set(0, 0.7, -0.2);
  group.add(back);

  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set(lx, 0.225, lz);
    group.add(leg);
  });

  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  scene.add(group);
}

// Room configuration — pulled from the Asset Inventory list (MTR-09 / The Newton Room).
// Structured as a single config object so a future version can accept this as a prop
// or fetch it per room_id, rather than being hardcoded per file.
const ROOM_CONFIG = {
  roomId: 'MTR-09',
  displayName: 'The Newton Room',
  roomType: 'Meeting Room',
  capacity: 8,
  floor: 3,
  wing: 'North',
  mtrDevice: 'Logitech Rally Bar',
  touchController: 'Logitech Tap',
};

export default function Room3DDemo() {
  const mountRef = useRef(null);
  const sceneObjectsRef = useRef({});

  const [blindPosition, setBlindPosition] = useState(0);
  const [lightBrightness, setLightBrightness] = useState(0);
  const [screenOn, setScreenOn] = useState(false);
  const [temperature, setTemperature] = useState(21);
  const [liveConnected, setLiveConnected] = useState(false);
  const lastManualChangeRef = useRef(0);
  const MANUAL_GRACE_MS = 6000;

  // Poll the live Dataverse-backed room state via the Azure Function proxy.
  // Skips applying updates for a few seconds after a manual slider interaction,
  // so a poll landing mid-drag doesn't yank the control back under the user's hand.
  useEffect(() => {
    let cancelled = false;

    async function pollRoomState() {
      try {
        const res = await fetch(`/api/room-state?room_id=${ROOM_CONFIG.roomId}`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const rows = await res.json();
        if (cancelled) return;

        setLiveConnected(true);
        const inGracePeriod = Date.now() - lastManualChangeRef.current < MANUAL_GRACE_MS;
        if (inGracePeriod) return;

        rows.forEach((row) => {
          const device = row.cra04_device;
          const state = row.cra04_state;
          if (device === 'Blinds') setBlindPosition(Number(state));
          else if (device === 'Lights') setLightBrightness(Number(state));
          else if (device === 'Temperature') setTemperature(Number(state));
          else if (device === 'Screen') setScreenOn(state === 'On');
        });
      } catch (err) {
        console.error('Room state poll failed:', err);
        if (!cancelled) setLiveConnected(false);
      }
    }

    pollRoomState();
    const intervalId = setInterval(pollRoomState, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // Call this from each slider/button's onChange to mark a manual interaction,
  // so the next poll (within MANUAL_GRACE_MS) doesn't immediately overwrite it.
  function markManualChange() {
    lastManualChangeRef.current = Date.now();
  }

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE6E4DB);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const roomW = 6, roomH = 3, roomD = 5;

    const woodTex = makeWoodTexture();
    const floorTex = makeFloorTexture();
    const wallTex = makeWallTexture();
    const fabricTex = makeFabricTexture('#5F5E5A');

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
    const tableMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    backWall.position.set(0, roomH / 2, -roomD / 2);
    scene.add(backWall);

    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(-roomW / 2, roomH / 2, 0);
    scene.add(sideWall);

    // Three portrait windows with blinds along the side wall
    const windowW = 0.7, windowH = 1.7;
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xFCEFD1, emissive: 0xF5D98A, emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.05,
    });
    const blindMat = new THREE.MeshStandardMaterial({ color: 0xB4B2A9, roughness: 0.8 });
    // Anchor the blind geometry at its top edge so scaling grows downward, not from center
    const blindGeo = new THREE.PlaneGeometry(windowW, windowH);
    blindGeo.translate(0, -windowH / 2, 0);
    const windowTopY = 1.55 + windowH / 2;

    const blindsMeshes = [];
    [-1.6, 0, 1.6].forEach((z) => {
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(windowW, windowH), glassMat);
      glass.position.set(-roomW / 2 + 0.01, 1.55, z);
      glass.rotation.y = Math.PI / 2;
      scene.add(glass);

      const blind = new THREE.Mesh(blindGeo, blindMat);
      blind.position.set(-roomW / 2 + 0.02, windowTopY, z);
      blind.rotation.y = Math.PI / 2;
      blind.scale.y = 0;
      scene.add(blind);
      blindsMeshes.push(blind);
    });

    // Wall-mounted screen — Samsung 75" QM75B, centered (Newton Room: single MTR display)
    const screenBezel = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.3, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    screenBezel.position.set(0, 1.75, -roomD / 2 + 0.03);
    scene.add(screenBezel);

    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x000000, emissiveIntensity: 0 })
    );
    screenFace.position.set(0, 1.75, -roomD / 2 + 0.06);
    scene.add(screenFace);

    // Logitech Rally Bar — single built-in intelligent-director camera
    const videoBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.09, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x2C2C2A, roughness: 0.5 })
    );
    videoBar.position.set(0, 1.05, -roomD / 2 + 0.08);
    scene.add(videoBar);

    const videoBarLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.4 })
    );
    videoBarLens.rotation.x = Math.PI / 2;
    videoBarLens.position.set(0, 1.05, -roomD / 2 + 0.13);
    scene.add(videoBarLens);

    const videoBarLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000 })
    );
    videoBarLed.position.set(0.28, 1.05, -roomD / 2 + 0.13);
    scene.add(videoBarLed);

    // D-shaped table: square straight edge near the screen, semicircular curve on the
    // far side, with chairs fanned around the curve facing radially toward the screen.
    const tableCenterZ = -0.7;
    const R = 1.3, backZ = -0.6, arcSegments = 12;
    const outline = [[-R, backZ], [R, backZ]];
    for (let i = 0; i <= arcSegments; i++) {
      const theta = (i / arcSegments) * Math.PI;
      outline.push([R * Math.cos(theta), R * Math.sin(theta)]);
    }
    const fanCenter = [0, 0.2];
    const tablePositions = [];
    const tableUVs = [];
    const toUV = ([x, z]) => [(x + 2) / 4, (z + 1) / 3];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      tablePositions.push(fanCenter[0], 0, fanCenter[1], a[0], 0, a[1], b[0], 0, b[1]);
      tableUVs.push(...toUV(fanCenter), ...toUV(a), ...toUV(b));
    }
    const tableGeo = new THREE.BufferGeometry();
    tableGeo.setAttribute('position', new THREE.Float32BufferAttribute(tablePositions, 3));
    tableGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tableUVs, 2));
    tableGeo.computeVertexNormals();
    const tableTopMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5, side: THREE.DoubleSide });
    const table = new THREE.Mesh(tableGeo, tableTopMat);
    table.position.set(0, 0.75, tableCenterZ);
    scene.add(table);

    // Touch panel controller — wedge-shaped body, sitting on the table's flatter half
    const hw = 0.11, zFront = 0.09, zBack = -0.09, yTopFront = 0.015, yTopBack = 0.09;
    const wv = {
      bfl: [-hw, 0, zFront], bfr: [hw, 0, zFront],
      bbl: [-hw, 0, zBack], bbr: [hw, 0, zBack],
      tbl: [-hw, yTopBack, zBack], tbr: [hw, yTopBack, zBack],
      tfl: [-hw, yTopFront, zFront], tfr: [hw, yTopFront, zFront],
    };
    const bodyQuads = [
      [wv.bfl, wv.bfr, wv.bbr, wv.bbl], // bottom
      [wv.bbl, wv.bbr, wv.tbr, wv.tbl], // back
      [wv.bfl, wv.bfr, wv.tfr, wv.tfl], // front
      [wv.bfl, wv.bbl, wv.tbl, wv.tfl], // left
      [wv.bfr, wv.bbr, wv.tbr, wv.tfr], // right
    ];
    const bodyPositions = [];
    bodyQuads.forEach(([a, b, c, d]) => {
      bodyPositions.push(...a, ...b, ...c, ...a, ...c, ...d);
    });
    const wedgeGeo = new THREE.BufferGeometry();
    wedgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bodyPositions, 3));
    wedgeGeo.computeVertexNormals();
    const wedgeMat = new THREE.MeshStandardMaterial({ color: 0x2C2C2A, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide });
    const wedgeBody = new THREE.Mesh(wedgeGeo, wedgeMat);
    wedgeBody.position.set(0, 0.79, tableCenterZ + 0.35);
    scene.add(wedgeBody);

    const slopeAngle = Math.atan2(yTopBack - yTopFront, zFront - zBack);
    const touchPanelMat = new THREE.MeshStandardMaterial({ map: makeTouchPanelTexture(false, ROOM_CONFIG.displayName), roughness: 0.3 });
    const touchPanel = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 0.01, 0.2), touchPanelMat);
    touchPanel.rotation.x = -(Math.PI / 2 - slopeAngle);
    touchPanel.position.set(0, 0.79 + (yTopFront + yTopBack) / 2 + 0.003, tableCenterZ + 0.35);
    scene.add(touchPanel);

    // Trestle legs under the straight (screen-side) and curved (far) halves
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2C2C2A, roughness: 0.5 });
    [tableCenterZ - 0.3, tableCenterZ + 0.9].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.04), legMat);
      leg.position.set(0, 0.375, z);
      scene.add(leg);
    });

    // Chairs spaced evenly along the full seating perimeter — both straight sides
    // plus the curve, treated as one continuous path so there's no gap where the
    // straight side meets the arc. Still nothing on the back edge nearest the screen.
    const chairRadius = R + 0.4;
    const sideInset = 0.1;
    const sideZstart = backZ + sideInset;
    const sideLength = -sideZstart;
    const arcLength = Math.PI * chairRadius;
    const totalLength = 2 * sideLength + arcLength;
    const numChairs = 8;

    for (let i = 0; i < numChairs; i++) {
      const t = ((i + 0.5) / numChairs) * totalLength;
      let x, localZ, rotY;
      if (t < sideLength) {
        x = -chairRadius;
        localZ = sideZstart + t;
        rotY = Math.PI / 2;
      } else if (t < sideLength + arcLength) {
        const s = t - sideLength;
        const theta = Math.PI - s / chairRadius;
        x = chairRadius * Math.cos(theta);
        localZ = chairRadius * Math.sin(theta);
        rotY = Math.atan2(-Math.cos(theta), -Math.sin(theta));
      } else {
        const s2 = t - sideLength - arcLength;
        x = chairRadius;
        localZ = -s2;
        rotY = -Math.PI / 2;
      }
      buildChair(scene, x, tableCenterZ + localZ, rotY, fabricTex);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const daylight = new THREE.DirectionalLight(0xE6F1FB, 0.55);
    daylight.position.set(-3, 4, 0);
    scene.add(daylight);
    const ceilingLights = [];
    [[-1.3, 1.3], [1.3, 1.3], [-1.3, -1.3], [1.3, -1.3]].forEach(([x, z]) => {
      const bezel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x444441, roughness: 0.7 })
      );
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(x, roomH - 0.02, z);
      scene.add(bezel);

      const panelMat = new THREE.MeshStandardMaterial({
        map: makeLightPanelTexture(0), emissive: 0x000000, emissiveIntensity: 0, roughness: 0.5,
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), panelMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(x, roomH - 0.06, z);
      scene.add(panel);

      const point = new THREE.PointLight(0xFAC775, 0, 3, 2);
      point.position.set(x, roomH - 0.15, z);
      scene.add(point);

      ceilingLights.push({ fixture: panel, point, currentBrightness: 0, targetBrightness: 0, lastBrightness: -1 });
    });

    // HVAC thermostat panel, mounted on the back wall near the corner
    const thermoRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32),
      new THREE.MeshStandardMaterial({ color: 0x378ADD, emissive: 0x185FA5, emissiveIntensity: 0.4, roughness: 0.3 })
    );
    thermoRing.rotation.x = Math.PI / 2;
    thermoRing.position.set(-2.5, 1.5, -roomD / 2 + 0.03);
    scene.add(thermoRing);

    const thermoDisplay = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 32),
      new THREE.MeshStandardMaterial({ map: makeReadoutTexture(21), roughness: 0.4 })
    );
    thermoDisplay.position.set(-2.5, 1.5, -roomD / 2 + 0.05);
    scene.add(thermoDisplay);

    const thermoGlow = new THREE.PointLight(0x378ADD, 0.6, 1.5, 2);
    thermoGlow.position.set(-2.5, 1.5, -roomD / 2 + 0.2);
    scene.add(thermoGlow);

    sceneObjectsRef.current = {
      blindsMeshes, glassMat, ambient, daylight, ceilingLights, screenFace, videoBarLed, touchPanel,
      thermoRing, thermoDisplay, thermoGlow,
      currentTemp: 21, targetTemp: 21, lastDisplayedTemp: 21,
      currentBlindPosition: 0, targetBlindPosition: 0,
      renderer, scene, camera,
    };

    const coldColor = new THREE.Color(0x378ADD);
    const warmColor = new THREE.Color(0xD85A30);

    const baseAmbient = 0.5, minAmbient = 0.35;
    const baseDaylight = 0.55, minDaylight = 0.08;

    let angle = 0.6;
    let frameId;
    const animate = () => {
      angle += 0.0022;
      camera.position.x = Math.sin(angle) * 6.4;
      camera.position.z = Math.cos(angle) * 6.4;
      camera.position.y = 2.4;
      camera.lookAt(0, 1.5, 0);

      const objs = sceneObjectsRef.current;
      objs.currentTemp += (objs.targetTemp - objs.currentTemp) * 0.02;
      const t = Math.max(0, Math.min(1, (objs.currentTemp - 16) / (28 - 16)));
      const mixed = coldColor.clone().lerp(warmColor, t);
      objs.thermoRing.material.color.copy(mixed);
      objs.thermoRing.material.emissive.copy(mixed);
      objs.thermoGlow.color.copy(mixed);

      if (Math.round(objs.currentTemp) !== Math.round(objs.lastDisplayedTemp)) {
        objs.lastDisplayedTemp = objs.currentTemp;
        objs.thermoDisplay.material.map = makeReadoutTexture(objs.currentTemp);
        objs.thermoDisplay.material.needsUpdate = true;
      }

      objs.ceilingLights.forEach((light) => {
        light.currentBrightness += (light.targetBrightness - light.currentBrightness) * 0.05;
        const rounded = Math.round(light.currentBrightness * 20);
        if (rounded !== light.lastBrightness) {
          light.lastBrightness = rounded;
          light.fixture.material.map = makeLightPanelTexture(light.currentBrightness);
          light.fixture.material.needsUpdate = true;
        }
        light.fixture.material.emissiveIntensity = light.currentBrightness * 0.9;
        light.fixture.material.emissive.set(0xFAC775);
        light.point.intensity = light.currentBrightness * 2.0;
      });

      const avgCeilingBrightness =
        objs.ceilingLights.reduce((sum, l) => sum + l.currentBrightness, 0) / objs.ceilingLights.length;

      objs.currentBlindPosition += (objs.targetBlindPosition - objs.currentBlindPosition) * 0.06;
      objs.blindsMeshes.forEach((b) => {
        b.scale.y = objs.currentBlindPosition;
      });
      const daylightFactor = 1 - objs.currentBlindPosition;
      objs.ambient.intensity = minAmbient + (baseAmbient - minAmbient) * daylightFactor + avgCeilingBrightness * 0.32;
      objs.daylight.intensity = minDaylight + (baseDaylight - minDaylight) * daylightFactor;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (sceneObjectsRef.current) {
      sceneObjectsRef.current.targetBlindPosition = blindPosition / 100;
    }
  }, [blindPosition]);

  useEffect(() => {
    const { ceilingLights } = sceneObjectsRef.current;
    if (!ceilingLights) return;
    ceilingLights.forEach((light) => {
      light.targetBrightness = lightBrightness / 100;
    });
  }, [lightBrightness]);

  useEffect(() => {
    const { screenFace, videoBarLed, touchPanel } = sceneObjectsRef.current;
    if (!screenFace) return;
    screenFace.material.color.set(screenOn ? 0x1a3a5c : 0x0a0a0a);
    screenFace.material.emissive.set(screenOn ? 0x1a3a5c : 0x000000);
    screenFace.material.emissiveIntensity = screenOn ? 0.6 : 0;
    videoBarLed.material.emissive.set(screenOn ? 0x1D9E75 : 0x000000);
    touchPanel.material.map = makeTouchPanelTexture(screenOn, ROOM_CONFIG.displayName);
    touchPanel.material.needsUpdate = true;
  }, [screenOn]);

  useEffect(() => {
    if (sceneObjectsRef.current) {
      sceneObjectsRef.current.targetTemp = temperature;
    }
  }, [temperature]);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#2C2C2A' }}>{ROOM_CONFIG.displayName}</h2>
          <span style={{ fontSize: 13, color: '#888780' }}>
            {ROOM_CONFIG.roomId} · {ROOM_CONFIG.roomType} · Seats {ROOM_CONFIG.capacity} · Floor {ROOM_CONFIG.floor}, {ROOM_CONFIG.wing}
          </span>
        </div>
        <span style={{
          fontSize: 12, padding: '4px 10px', borderRadius: 999,
          background: liveConnected ? '#E6F4EE' : '#F2E9E4',
          color: liveConnected ? '#0F6E56' : '#A65B32',
        }}>
          {liveConnected ? '● Live' : '○ Offline'}
        </span>
      </div>
      <div
        ref={mountRef}
        style={{ width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e0ddd3' }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          onClick={() => { markManualChange(); setScreenOn((v) => !v); }}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #d3d1c7', background: '#fff', cursor: 'pointer', fontSize: 14 }}
        >
          {screenOn ? 'End meeting' : 'Start meeting'}
        </button>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5F5E5A', marginBottom: 6 }}>
          <span>Blind position</span>
          <span>{blindPosition}% closed</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={blindPosition}
          onChange={(e) => { markManualChange(); setBlindPosition(Number(e.target.value)); }}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5F5E5A', marginBottom: 6 }}>
          <span>Ceiling light brightness</span>
          <span>{lightBrightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={lightBrightness}
          onChange={(e) => { markManualChange(); setLightBrightness(Number(e.target.value)); }}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5F5E5A', marginBottom: 6 }}>
          <span>HVAC target temperature</span>
          <span>{temperature}°C</span>
        </div>
        <input
          type="range"
          min="16"
          max="28"
          step="1"
          value={temperature}
          onChange={(e) => { markManualChange(); setTemperature(Number(e.target.value)); }}
          style={{ width: '100%' }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#888780', marginTop: 10 }}>
        The thermostat on the back wall eases toward the target temperature and its glow
        shifts from cold blue to warm amber. Closing the blinds also dims the room's ambient
        and directional lighting — the same easing pattern throughout, so everything settles
        smoothly rather than snapping between states.
      </p>
    </div>
  );
}
