import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Room configuration                                                         */
/*  roomId must match cra04_room_id on the DemoRooms rows in Dataverse.        */
/* -------------------------------------------------------------------------- */
const ROOM_CONFIG = {
  roomId: 'EUX-G-Boardroom',
  displayName: 'EUX-G-Boardroom',
  roomType: 'Boardroom',
  capacity: 8,
};

/* -------------------------------------------------------------------------- */
/*  TANDI brand tokens (same values as the Lisa index.html)                    */
/* -------------------------------------------------------------------------- */
const BRAND = {
  navy: '#0A1E35',
  navyDeep: '#071321',
  blue: '#1A6EBD',
  cyan: '#00D4E8',
  offWhite: '#F4F6FB',
  muted: '#6B7A99',
  alert: '#E2574C',
};

/* -------------------------------------------------------------------------- */
/*  Procedural textures                                                        */
/* -------------------------------------------------------------------------- */
const FONT = "'DM Sans', sans-serif";

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

// Swap a material's map and free the old GPU texture so long-running demos don't leak.
function setMap(material, texture) {
  if (material.map) material.map.dispose();
  material.map = texture;
  material.needsUpdate = true;
}

function makeWoodTexture() {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#5A3D2B';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 45; i++) {
      const y = (i / 45) * s + (Math.random() - 0.5) * 6;
      ctx.strokeStyle = `rgba(${30 + Math.random() * 25}, ${18 + Math.random() * 12}, ${10 + Math.random() * 8}, ${0.15 + Math.random() * 0.2})`;
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
    ctx.fillStyle = '#9AA3AE';
    ctx.fillRect(0, 0, s, s);
    const plankW = s / 6;
    for (let i = 0; i < 6; i++) {
      const shade = 172 + Math.round(Math.random() * 20 - 10);
      ctx.fillStyle = `rgb(${shade - 12}, ${shade - 4}, ${shade})`;
      ctx.fillRect(i * plankW, 0, plankW - 2, s);
    }
    ctx.strokeStyle = 'rgba(10,30,53,0.08)';
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
    ctx.fillStyle = '#EAEFF6';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(10,30,53,0.025)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }, 128, 2, 2);
}

function makeFabricTexture(hex) {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
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
    const baseR = 221, baseG = 225, baseB = 232;
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
    ctx.fillStyle = BRAND.navyDeep;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = active ? BRAND.cyan : '#24405F';
    ctx.beginPath();
    ctx.roundRect(s * 0.15, s * 0.35, s * 0.7, s * 0.3, 10);
    ctx.fill();
    ctx.fillStyle = active ? BRAND.navy : '#FFFFFF';
    ctx.font = `600 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(active ? 'In meeting' : 'Join meeting', s / 2, s * 0.5);
    ctx.fillStyle = BRAND.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(roomName, s / 2, s * 0.18);
  }, 256, 1, 1);
}

function makeReadoutTexture(tempValue) {
  return makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = BRAND.navyDeep;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 64px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(tempValue)}°`, s / 2, s / 2 + 2);
  }, 128, 1, 1);
}

function makeAirQualityTexture(ppmValue) {
  return makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = BRAND.navyDeep;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 40px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(ppmValue)}`, s / 2, s / 2 - 8);
    ctx.font = `16px ${FONT}`;
    ctx.fillText('ppm CO2', s / 2, s / 2 + 26);
  }, 128, 1, 1);
}

/* -------------------------------------------------------------------------- */
/*  Mock Teams call drawn onto the wall screen                                 */
/*  Turning the screen on shows a "Joining meeting" state, then the call.      */
/* -------------------------------------------------------------------------- */
const CALL_CONFIG = {
  title: 'Project review',
  joiningSeconds: 2.5,
  speakerSeconds: 3.5,
  // Made-up participants. The room is the first tile, as it would be in a Teams Rooms call.
  participants: [
    { name: ROOM_CONFIG.displayName, isRoom: true },
    { name: 'Amelia Hart' },
    { name: 'Daniel Osei' },
    { name: 'Priya Nair' },
    { name: 'Tom Becker' },
    { name: 'Sofia Rossi' },
  ],
  presenter: 'Amelia Hart',
  // Order the active speaker moves through (indexes into participants), repeating.
  speakerOrder: [1, 2, 1, 3, 0, 4, 5, 2],
};

const SCREEN_W = 1280;
const SCREEN_H = 720; // 16:9, one canvas per display

const TEAMS = {
  bg: '#1F1F1F', tile: '#292929', button: '#3D3D3D',
  purple: '#7B83EB', brand: '#5B5FC7', red: '#C4314B', muted: '#A6A6A6',
};
const TEAMS_FONT = "'Segoe UI', 'DM Sans', sans-serif";
const AVATAR_COLORS = ['#8764B8', '#0078D4', '#038387', '#CA5010', '#C239B3'];

function initialsOf(name) {
  return name.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function drawRoomGlyph(ctx, cx, cy) {
  ctx.fillStyle = BRAND.blue;
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.fill();
  // Two smaller people behind, one in front
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  [-30, 30].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + dx, cy + 22, 15, Math.PI, 0);
    ctx.fill();
  });
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 28, 24, Math.PI, 0);
  ctx.fill();
}

function drawJoiningScreen(ctx, t) {
  const W = SCREEN_W, H = SCREEN_H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = TEAMS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = TEAMS.brand;
  ctx.beginPath(); ctx.roundRect(W / 2 - 36, 150, 72, 72, 16); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = `700 44px ${TEAMS_FONT}`;
  ctx.fillText('T', W / 2, 188);

  ctx.font = `600 44px ${TEAMS_FONT}`;
  ctx.fillText(CALL_CONFIG.title, W / 2, 285);
  ctx.fillStyle = TEAMS.muted;
  ctx.font = `400 26px ${TEAMS_FONT}`;
  ctx.fillText(ROOM_CONFIG.displayName, W / 2, 335);

  const cy = 430;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(W / 2, cy, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = TEAMS.purple;
  const a = t * 4.5;
  ctx.beginPath(); ctx.arc(W / 2, cy, 28, a, a + Math.PI * 1.2); ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `400 30px ${TEAMS_FONT}`;
  const base = 'Joining meeting';
  const baseW = ctx.measureText(base).width;
  ctx.textAlign = 'center';
  ctx.fillText(base, W / 2, 510);
  ctx.textAlign = 'left';
  ctx.fillText('.'.repeat(Math.floor(t * 2.5) % 4), W / 2 + baseW / 2 + 2, 510);
}

function drawCallScreen(ctx, t) {
  const W = SCREEN_W, H = SCREEN_H;
  const { participants, speakerOrder, speakerSeconds, title } = CALL_CONFIG;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = TEAMS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';

  // Top bar: meeting title, elapsed time, headcount
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.font = `600 26px ${TEAMS_FONT}`;
  ctx.fillText(title, 28, 36);
  const secs = Math.floor(t);
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  ctx.fillStyle = TEAMS.muted;
  ctx.textAlign = 'center';
  ctx.font = `400 24px ${TEAMS_FONT}`;
  ctx.fillText(clock, W / 2, 36);
  ctx.textAlign = 'right';
  ctx.fillText(`${participants.length} people`, W - 28, 36);

  // Participant grid, 3 x 2
  const cols = 3, rows = 2, padX = 24, top = 76, bottom = 24, gap = 16;
  const tileW = (W - padX * 2 - gap * (cols - 1)) / cols;
  const tileH = (H - top - bottom - gap * (rows - 1)) / rows;
  const speaker = speakerOrder[Math.floor(t / speakerSeconds) % speakerOrder.length];

  participants.forEach((p, i) => {
    const x = padX + (i % cols) * (tileW + gap);
    const y = top + Math.floor(i / cols) * (tileH + gap);
    ctx.fillStyle = TEAMS.tile;
    ctx.beginPath(); ctx.roundRect(x, y, tileW, tileH, 12); ctx.fill();

    const cx = x + tileW / 2, cy = y + tileH / 2 - 14;
    if (p.isRoom) {
      drawRoomGlyph(ctx, cx, cy);
    } else {
      ctx.fillStyle = AVATAR_COLORS[(i - 1) % AVATAR_COLORS.length];
      ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = `600 40px ${TEAMS_FONT}`;
      ctx.fillText(initialsOf(p.name), cx, cy + 2);
    }

    ctx.font = `500 20px ${TEAMS_FONT}`;
    const labelW = ctx.measureText(p.name).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x + 12, y + tileH - 44, labelW + 24, 32, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(p.name, x + 24, y + tileH - 28);

    if (i === speaker) {
      ctx.strokeStyle = TEAMS.purple;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(x + 2.5, y + 2.5, tileW - 5, tileH - 5, 11); ctx.stroke();
      ctx.fillStyle = TEAMS.purple;
      for (let k = 0; k < 3; k++) {
        const h = 8 + 14 * Math.abs(Math.sin(t * 6 + k * 1.3));
        ctx.fillRect(x + tileW - 46 + k * 11, y + 30 - h / 2, 6, h);
      }
    }
  });

  // Short fade in as the call replaces the joining screen
  if (t < 0.5) {
    ctx.fillStyle = `rgba(31,31,31,${1 - t / 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawSideBackdrop(ctx) {
  const W = SCREEN_W, H = SCREEN_H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = TEAMS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = TEAMS.muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 26px ${TEAMS_FONT}`;
  ctx.fillText(ROOM_CONFIG.displayName, W / 2, H / 2);
}

// Second display: the shared content, a simple slide.
function drawSharedScreen(ctx, t) {
  const W = SCREEN_W, H = SCREEN_H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = TEAMS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.font = `500 24px ${TEAMS_FONT}`;
  ctx.fillText(`${CALL_CONFIG.presenter} is presenting`, 32, 36);

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.roundRect(32, 72, W - 64, H - 104, 10); ctx.fill();

  ctx.fillStyle = BRAND.navy;
  ctx.font = `700 54px ${TEAMS_FONT}`;
  ctx.fillText('Workplace review', 88, 150);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `400 26px ${TEAMS_FONT}`;
  ctx.fillText('Room utilisation this week', 88, 206);

  const values = [0.55, 0.8, 0.7, 0.9, 0.45];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const grow = 1 - Math.pow(1 - Math.min(1, t / 1.0), 3);
  const base = 580, maxH = 280, barW = 120, gap = 56;
  values.forEach((v, i) => {
    const x = 88 + i * (barW + gap);
    const h = maxH * v * grow;
    ctx.fillStyle = v === Math.max(...values) ? BRAND.cyan : BRAND.blue;
    ctx.beginPath(); ctx.roundRect(x, base - h, barW, h, 8); ctx.fill();
    ctx.fillStyle = BRAND.muted;
    ctx.textAlign = 'center';
    ctx.font = `400 22px ${TEAMS_FONT}`;
    ctx.fillText(days[i], x + barW / 2, base + 30);
  });

  const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND.navy;
  ctx.font = `700 96px ${TEAMS_FONT}`;
  ctx.fillText(`${avg}%`, 980, 320);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `400 24px ${TEAMS_FONT}`;
  ctx.fillText('average utilisation', 984, 385);

  if (t < 0.5) {
    ctx.fillStyle = `rgba(31,31,31,${1 - t / 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function buildChair(scene, x, z, rotationY, fabricTex) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1D2A3A, roughness: 0.6 });
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

/* -------------------------------------------------------------------------- */
/*  UI pieces                                                                  */
/* -------------------------------------------------------------------------- */
function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  blinds: (
    <Icon>
      <path d="M4 3h16" /><path d="M5 7h14" /><path d="M5 11h14" /><path d="M5 15h14" />
      <path d="M12 15v5" />
    </Icon>
  ),
  lights: (
    <Icon>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" /><path d="M10 22h4" />
    </Icon>
  ),
  temp: (
    <Icon>
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </Icon>
  ),
  air: (
    <Icon>
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </Icon>
  ),
  controls: (
    <Icon>
      <path d="M4 6h8" /><path d="M18 6h2" /><circle cx="15" cy="6" r="2" />
      <path d="M4 12h2" /><path d="M12 12h8" /><circle cx="9" cy="12" r="2" />
      <path d="M4 18h10" /><path d="M20 18h0" /><circle cx="17" cy="18" r="2" />
    </Icon>
  ),
};

// Each slider track carries the same colours as the thing it controls in the 3D room.
const TRACKS = {
  blinds: 'linear-gradient(90deg, #00D4E8, #1A6EBD)',
  lights: 'linear-gradient(90deg, #6B5A3A, #FFD98A)',
  temp: 'linear-gradient(90deg, #378ADD, #D85A30)',
  air: 'linear-gradient(90deg, #3FA86B 0%, #E0A930 40%, #C0392B 100%)',
};

function SliderTile({ id, icon, label, valueText, min, max, step, value, onChange, track }) {
  const frac = (value - min) / (max - min);
  return (
    <div className="rm-tile">
      <label className="rm-tile-top" htmlFor={id}>
        <span className="rm-ico">{icon}</span>
        <span className="rm-label">{label}</span>
        <span className="rm-val">{valueText}</span>
      </label>
      <input
        id={id}
        className="rm-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-valuetext={valueText}
        style={{ '--pos': `calc(${frac} * (100% - 14px) + 7px)`, '--track': track }}
      />
    </div>
  );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

html, body, #root { height: 100%; margin: 0; padding: 0; max-width: none; }
body { display: block; background: ${BRAND.navy}; }
#root { width: 100%; text-align: left; border: 0; min-height: 0; display: block; }

.rm-shell {
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh; width: 100%;
  background: ${BRAND.navy}; color: #fff;
  font-family: ${FONT}; font-size: 16px; line-height: 1.25; letter-spacing: normal; text-align: left;
  overflow: hidden;
}
.rm-shell *, .rm-shell *::before, .rm-shell *::after { box-sizing: border-box; }

/* Header, same navy with cobalt and cyan glows as the Lisa header */
.rm-header { position: relative; flex-shrink: 0; background: ${BRAND.navy}; overflow: hidden; }
.rm-header::before {
  content: ''; position: absolute; top: -40px; right: -50px; width: 180px; height: 180px;
  border-radius: 50%; background: ${BRAND.blue}; opacity: .15; pointer-events: none;
}
.rm-header::after {
  content: ''; position: absolute; bottom: -30px; right: 60px; width: 100px; height: 100px;
  border-radius: 50%; background: ${BRAND.cyan}; opacity: .18; pointer-events: none;
}
.rm-header-inner {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 14px;
  padding: 10px 18px; min-height: 58px;
}
.rm-brand { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
.rm-mark { height: 30px; width: 30px; display: block; }
.rm-word { line-height: 1; }
.rm-word-main { font-size: 16px; font-weight: 700; letter-spacing: .02em; color: #fff; }
.rm-word-sub { font-size: 8px; font-weight: 500; letter-spacing: .18em; color: ${BRAND.cyan}; margin-top: 3px; }
.rm-sep { width: 1px; align-self: stretch; margin: 4px 0; background: rgba(255,255,255,.14); }
.rm-title { min-width: 0; flex: 1; }
.rm-kicker { font-size: 10px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: ${BRAND.cyan}; margin-bottom: 2px; }
.rm-name { font-size: 15px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.rm-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
  font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(255,255,255,.65); white-space: nowrap;
}
.rm-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: ${BRAND.cyan}; }

.rm-live { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,.75); }
.rm-dot { width: 8px; height: 8px; border-radius: 50%; background: ${BRAND.alert}; box-shadow: 0 0 0 3px rgba(226,87,76,.22); }
.rm-live.on .rm-dot { background: ${BRAND.cyan}; box-shadow: 0 0 0 3px rgba(0,212,232,.25); animation: rm-pulse 2.5s infinite; }
@keyframes rm-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(0,212,232,.25); }
  50% { box-shadow: 0 0 0 7px rgba(0,212,232,.08); }
}

.rm-meet {
  display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 14px;
  border-radius: 20px; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08);
  color: #fff; font: 600 12px ${FONT}; cursor: pointer; white-space: nowrap;
  transition: background .15s, border-color .15s, color .15s;
}
.rm-meet::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: .55; }
.rm-meet:hover { background: rgba(26,110,189,.4); border-color: rgba(26,110,189,.7); }
.rm-meet.on { background: ${BRAND.cyan}; border-color: ${BRAND.cyan}; color: ${BRAND.navy}; }
.rm-meet.on::before { opacity: 1; }
.rm-meet.on:hover { background: #33DDEE; }

.rm-iconbtn {
  display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); color: rgba(255,255,255,.85);
  cursor: pointer; transition: background .15s, color .15s, border-color .15s;
}
.rm-iconbtn:hover { background: rgba(26,110,189,.4); border-color: rgba(26,110,189,.7); color: #fff; }
.rm-iconbtn[aria-pressed='true'] { background: rgba(0,212,232,.16); border-color: rgba(0,212,232,.5); color: ${BRAND.cyan}; }

.rm-shell button:focus-visible, .rm-range:focus-visible { outline: 2px solid ${BRAND.cyan}; outline-offset: 2px; }

/* Stage */
.rm-stage {
  position: relative; flex: 1; min-height: 0; overflow: hidden;
  background: radial-gradient(60% 75% at 50% 38%, #12345A 0%, ${BRAND.navy} 58%, ${BRAND.navyDeep} 100%);
}
.rm-canvas { position: absolute; inset: 0; }
.rm-canvas canvas { display: block; }

/* Control dock, floats over the bottom of the scene */
.rm-dock {
  position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 6px;
  border-radius: 16px; background: rgba(10,30,53,.74); border: 1px solid rgba(255,255,255,.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.2); backdrop-filter: blur(14px) saturate(1.2);
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  transition: transform .25s ease, opacity .2s ease, visibility 0s;
}
.rm-dock.closed {
  transform: translateY(calc(100% + 16px)); opacity: 0; visibility: hidden; pointer-events: none;
  transition: transform .25s ease, opacity .2s ease, visibility 0s .25s;
}
.rm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
@media (min-width: 720px) { .rm-grid { grid-template-columns: repeat(4, 1fr); } }

.rm-tile {
  display: flex; flex-direction: column; gap: 3px; padding: 6px 12px 5px; border-radius: 12px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
}
.rm-tile-top { display: flex; align-items: center; gap: 7px; font-size: 12px; cursor: pointer; }
.rm-ico { display: inline-flex; color: ${BRAND.cyan}; }
.rm-label { color: rgba(255,255,255,.72); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-val { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

.rm-range { -webkit-appearance: none; appearance: none; width: 100%; height: 14px; margin: 0; background: transparent; cursor: pointer; }
.rm-range::-webkit-slider-runnable-track {
  height: 6px; border-radius: 99px;
  background: linear-gradient(to right, transparent var(--pos), rgba(7,19,33,.72) var(--pos)), var(--track);
}
.rm-range::-moz-range-track {
  height: 6px; border-radius: 99px;
  background: linear-gradient(to right, transparent var(--pos), rgba(7,19,33,.72) var(--pos)), var(--track);
}
.rm-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px; margin-top: -4px; border-radius: 50%;
  background: #fff; border: 0; box-shadow: 0 0 0 3px rgba(255,255,255,.18), 0 2px 6px rgba(0,0,0,.4);
}
.rm-range::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 0;
  box-shadow: 0 0 0 3px rgba(255,255,255,.18), 0 2px 6px rgba(0,0,0,.4);
}

@media (max-width: 640px) {
  .rm-sep, .rm-badge, .rm-word-sub { display: none; }
  .rm-header-inner { gap: 10px; padding: 10px 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .rm-live.on .rm-dot { animation: none; }
  .rm-dock, .rm-dock.closed { transition: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function EuxGBoardroomDemo() {
  const mountRef = useRef(null);
  const sceneObjectsRef = useRef({});

  const [blindPosition, setBlindPosition] = useState(0);
  const [lightBrightness, setLightBrightness] = useState(0);
  const [screenOn, setScreenOn] = useState(false);
  const [temperature, setTemperature] = useState(21);
  const [airQuality, setAirQuality] = useState(600);
  const [liveConnected, setLiveConnected] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const lastManualChangeRef = useRef(0);
  const MANUAL_GRACE_MS = 6000;

  // Poll the live Dataverse-backed room state via the Azure Function proxy.
  // Skips applying updates for a few seconds after a manual interaction,
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
          const rawState = String(row.cra04_state ?? '').trim();
          const numeric = Number(rawState);
          const lower = rawState.toLowerCase();

          if (device === 'Blinds') {
            // 0 = fully open, 100 = fully closed. Falls back to word-mapping if
            // Dataverse holds a non-numeric value like "Closed" instead of a percentage.
            let value = numeric;
            if (Number.isNaN(value)) {
              if (lower.includes('close')) value = 100;
              else if (lower.includes('open')) value = 0;
              else return; // unrecognized value, skip rather than corrupt the render
            }
            setBlindPosition(Math.max(0, Math.min(100, value)));
          } else if (device === 'Lights') {
            let value = numeric;
            if (Number.isNaN(value)) {
              // Safety net matching the anchor words used in the Copilot Studio
              // parameter description, in case the model ever passes text instead
              // of resolving it to a number itself.
              if (lower === 'off' || lower.includes('dark')) value = 0;
              else if (lower === 'on' || lower.includes('full') || lower === 'bright') value = 100;
              else if (lower.includes('dim') || lower.includes('less bright')) value = 30;
              else if (lower.includes('slightly bright')) value = 60;
              else if (lower.includes('bright')) value = 80;
              else return; // genuinely unrecognized, skip rather than corrupt the render
            }
            setLightBrightness(Math.max(0, Math.min(100, value)));
          } else if (device === 'Temperature') {
            if (!Number.isNaN(numeric)) setTemperature(Math.max(16, Math.min(28, numeric)));
          } else if (device === 'Air Quality') {
            if (!Number.isNaN(numeric)) {
              setAirQuality(Math.max(400, Math.min(2400, numeric)));
            } else if (lower.includes('poor') || lower.includes('stale') || lower.includes('stuffy')) {
              setAirQuality(1800);
            } else if (lower.includes('moderate')) {
              setAirQuality(1200);
            } else if (lower.includes('good') || lower.includes('fresh') || lower.includes('excellent')) {
              setAirQuality(550);
            }
          } else if (device === 'Screen') {
            setScreenOn(lower === 'on');
          }
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

  // Call this from each control's handler to mark a manual interaction,
  // so the next poll (within MANUAL_GRACE_MS) doesn't immediately overwrite it.
  function markManualChange() {
    lastManualChangeRef.current = Date.now();
  }

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    // Transparent clear colour so the stage's navy radial gradient shows behind the room.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const roomW = 6, roomH = 3, roomD = 5;

    const woodTex = makeWoodTexture();
    const floorTex = makeFloorTexture();
    const wallTex = makeWallTexture();
    const fabricTex = makeFabricTexture('#2A4766');

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });

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
      color: 0xE3F0FC, emissive: 0xA9CBEF, emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.05,
    });
    const blindMat = new THREE.MeshStandardMaterial({ color: 0xAEB8C6, roughness: 0.8 });
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

    // Two wall-mounted displays with the video bar centred beneath the gap between them.
    const screenW = 1.6, screenH = 0.9, screenGap = 0.16, screenY = 1.75;
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0E1622, roughness: 0.4 });
    const screens = [-1, 1].map((side) => {
      const x = side * (screenW / 2 + screenGap / 2);
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(screenW + 0.12, screenH + 0.12, 0.05), bezelMat);
      bezel.position.set(x, screenY, -roomD / 2 + 0.03);
      scene.add(bezel);

      // Unlit so the picture shows at its true colours whatever the room lighting is doing.
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(screenW, screenH),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
      );
      face.position.set(x, screenY, -roomD / 2 + 0.06);
      scene.add(face);

      // What each display shows is drawn onto its own canvas.
      const canvas = document.createElement('canvas');
      canvas.width = SCREEN_W;
      canvas.height = SCREEN_H;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return { face, ctx, texture };
    });

    // Video bar, sitting under the gap between the two displays
    const barW = 0.9, barY = 1.12;
    const videoBar = new THREE.Mesh(
      new THREE.BoxGeometry(barW, 0.1, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x1D2A3A, roughness: 0.5 })
    );
    videoBar.position.set(0, barY, -roomD / 2 + 0.08);
    scene.add(videoBar);

    const videoBarLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.4 })
    );
    videoBarLens.rotation.x = Math.PI / 2;
    videoBarLens.position.set(0, barY, -roomD / 2 + 0.13);
    scene.add(videoBarLens);

    const videoBarLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000 })
    );
    videoBarLed.position.set(barW / 2 - 0.07, barY, -roomD / 2 + 0.13);
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

    // Touch panel controller, wedge-shaped body sitting on the table's flatter half
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
    const wedgeMat = new THREE.MeshStandardMaterial({ color: 0x1D2A3A, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide });
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
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1D2A3A, roughness: 0.5 });
    [tableCenterZ - 0.3, tableCenterZ + 0.9].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.04), legMat);
      leg.position.set(0, 0.375, z);
      scene.add(leg);
    });

    // Chairs spaced evenly along the full seating perimeter: both straight sides
    // plus the curve, treated as one continuous path so there's no gap where the
    // straight side meets the arc. Nothing on the back edge nearest the screen.
    const chairRadius = R + 0.4;
    const sideInset = 0.1;
    const sideZstart = backZ + sideInset;
    const sideLength = -sideZstart;
    const arcLength = Math.PI * chairRadius;
    const totalLength = 2 * sideLength + arcLength;
    const numChairs = ROOM_CONFIG.capacity;

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
        new THREE.MeshStandardMaterial({ color: 0x3A4656, roughness: 0.7 })
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

    // Air quality panel, stacked directly below the thermostat on the same wall
    const airQualityRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32),
      new THREE.MeshStandardMaterial({ color: 0x3FA86B, emissive: 0x1F6E42, emissiveIntensity: 0.4, roughness: 0.3 })
    );
    airQualityRing.rotation.x = Math.PI / 2;
    airQualityRing.position.set(-2.5, 1.1, -roomD / 2 + 0.03);
    scene.add(airQualityRing);

    const airQualityDisplay = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 32),
      new THREE.MeshStandardMaterial({ map: makeAirQualityTexture(600), roughness: 0.4 })
    );
    airQualityDisplay.position.set(-2.5, 1.1, -roomD / 2 + 0.05);
    scene.add(airQualityDisplay);

    const airQualityGlow = new THREE.PointLight(0x3FA86B, 0.6, 1.5, 2);
    airQualityGlow.position.set(-2.5, 1.1, -roomD / 2 + 0.2);
    scene.add(airQualityGlow);

    sceneObjectsRef.current = {
      blindsMeshes, glassMat, ambient, daylight, ceilingLights, screens, videoBarLed, touchPanel,
      screenOn: false, screenPhase: 'off', screenPhaseStart: 0, lastScreenDraw: 0,
      thermoRing, thermoDisplay, thermoGlow,
      airQualityRing, airQualityDisplay, airQualityGlow,
      currentTemp: 21, targetTemp: 21, lastDisplayedTemp: 21,
      currentAirQuality: 600, targetAirQuality: 600, lastDisplayedAirQuality: 600,
      currentBlindPosition: 0, targetBlindPosition: 0,
      renderer, scene, camera,
    };

    const coldColor = new THREE.Color(0x378ADD);
    const warmColor = new THREE.Color(0xD85A30);

    const goodAirColor = new THREE.Color(0x3FA86B);
    const midAirColor = new THREE.Color(0xE0A930);
    const poorAirColor = new THREE.Color(0xC0392B);

    const baseAmbient = 0.5, minAmbient = 0.35;
    const baseDaylight = 0.55, minDaylight = 0.08;

    // Pull the camera back on narrow or tall viewports so the whole room stays in frame.
    let orbitRadius = 6.8 * Math.max(1, 1.55 / camera.aspect);

    let angle = 0.6;
    let frameId;
    const animate = () => {
      angle += 0.0022;
      camera.position.x = Math.sin(angle) * orbitRadius;
      camera.position.z = Math.cos(angle) * orbitRadius;
      camera.position.y = 2.5;
      // Aim slightly below the room's centre so it sits above the control dock.
      camera.lookAt(0, 1.0, 0);

      const objs = sceneObjectsRef.current;
      objs.currentTemp += (objs.targetTemp - objs.currentTemp) * 0.02;
      const t = Math.max(0, Math.min(1, (objs.currentTemp - 16) / (28 - 16)));
      const mixed = coldColor.clone().lerp(warmColor, t);
      objs.thermoRing.material.color.copy(mixed);
      objs.thermoRing.material.emissive.copy(mixed);
      objs.thermoGlow.color.copy(mixed);

      if (Math.round(objs.currentTemp) !== Math.round(objs.lastDisplayedTemp)) {
        objs.lastDisplayedTemp = objs.currentTemp;
        setMap(objs.thermoDisplay.material, makeReadoutTexture(objs.currentTemp));
      }

      // Air quality: green (400ppm) -> amber (1200ppm) -> red (2000ppm+)
      objs.currentAirQuality += (objs.targetAirQuality - objs.currentAirQuality) * 0.02;
      const aq = Math.max(400, Math.min(2400, objs.currentAirQuality));
      const aqMixed = aq <= 1200
        ? goodAirColor.clone().lerp(midAirColor, (aq - 400) / (1200 - 400))
        : midAirColor.clone().lerp(poorAirColor, Math.min(1, (aq - 1200) / (2000 - 1200)));
      objs.airQualityRing.material.color.copy(aqMixed);
      objs.airQualityRing.material.emissive.copy(aqMixed);
      objs.airQualityGlow.color.copy(aqMixed);

      if (Math.round(objs.currentAirQuality / 10) !== Math.round(objs.lastDisplayedAirQuality / 10)) {
        objs.lastDisplayedAirQuality = objs.currentAirQuality;
        setMap(objs.airQualityDisplay.material, makeAirQualityTexture(objs.currentAirQuality));
      }

      objs.ceilingLights.forEach((light) => {
        light.currentBrightness += (light.targetBrightness - light.currentBrightness) * 0.05;
        const rounded = Math.round(light.currentBrightness * 20);
        if (rounded !== light.lastBrightness) {
          light.lastBrightness = rounded;
          setMap(light.fixture.material, makeLightPanelTexture(light.currentBrightness));
        }
        light.fixture.material.emissiveIntensity = light.currentBrightness * 0.9;
        light.fixture.material.emissive.set(0xFAC775);
        light.point.intensity = light.currentBrightness * 0.8;
      });

      const avgCeilingBrightness =
        objs.ceilingLights.reduce((sum, l) => sum + l.currentBrightness, 0) / objs.ceilingLights.length;

      objs.currentBlindPosition += (objs.targetBlindPosition - objs.currentBlindPosition) * 0.06;
      objs.blindsMeshes.forEach((b) => {
        b.scale.y = objs.currentBlindPosition;
      });
      const daylightFactor = 1 - objs.currentBlindPosition;
      objs.ambient.intensity = minAmbient + (baseAmbient - minAmbient) * daylightFactor + avgCeilingBrightness * 0.12;
      objs.daylight.intensity = minDaylight + (baseDaylight - minDaylight) * daylightFactor;

      // Screen: joining state first, then the call. Redrawn about 10 times a second.
      if (objs.screenOn) {
        const now = performance.now() / 1000;
        if (objs.screenPhase === 'joining' && now - objs.screenPhaseStart >= CALL_CONFIG.joiningSeconds) {
          objs.screenPhase = 'call';
          objs.screenPhaseStart = now;
          objs.lastScreenDraw = 0;
        }
        if (now - objs.lastScreenDraw > 0.1) {
          objs.lastScreenDraw = now;
          const elapsed = now - objs.screenPhaseStart;
          const [left, right] = objs.screens;
          if (objs.screenPhase === 'joining') {
            drawJoiningScreen(left.ctx, elapsed);
            drawSideBackdrop(right.ctx);
          } else {
            drawCallScreen(left.ctx, elapsed);
            drawSharedScreen(right.ctx, elapsed);
          }
          left.texture.needsUpdate = true;
          right.texture.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // The scene fills whatever space the stage gives it, so it follows window
    // resizes and the control dock opening or closing without a fixed height.
    const resizeObserver = new ResizeObserver(() => {
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      orbitRadius = 6.8 * Math.max(1, 1.55 / camera.aspect);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      screens.forEach((sc) => sc.texture.dispose());
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
    const objs = sceneObjectsRef.current;
    const { screens, videoBarLed, touchPanel } = objs;
    if (!screens) return;
    // Turning on starts at "Joining meeting"; turning off goes back to a black screen.
    objs.screenOn = screenOn;
    objs.screenPhase = screenOn ? 'joining' : 'off';
    objs.screenPhaseStart = performance.now() / 1000;
    objs.lastScreenDraw = 0;
    screens.forEach(({ face, texture }) => {
      face.material.map = screenOn ? texture : null;
      face.material.color.set(screenOn ? 0xffffff : 0x0a0a0a);
      face.material.needsUpdate = true;
    });
    videoBarLed.material.emissive.set(screenOn ? 0x00D4E8 : 0x000000);
    setMap(touchPanel.material, makeTouchPanelTexture(screenOn, ROOM_CONFIG.displayName));
  }, [screenOn]);

  useEffect(() => {
    if (sceneObjectsRef.current) {
      sceneObjectsRef.current.targetTemp = temperature;
    }
  }, [temperature]);

  useEffect(() => {
    if (sceneObjectsRef.current) {
      sceneObjectsRef.current.targetAirQuality = airQuality;
    }
  }, [airQuality]);

  return (
    <div className="rm-shell">
      <style>{STYLES}</style>

      <header className="rm-header">
        <div className="rm-header-inner">
          <div className="rm-brand">
            {/* Optional icon mark; hides itself if the file isn't deployed alongside this app. */}
            <img
              className="rm-mark"
              src="/tandi-mark-transparent.png"
              alt=""
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="rm-word">
              <div className="rm-word-main">TANDI</div>
              <div className="rm-word-sub">LABORATORIES</div>
            </div>
          </div>
          <div className="rm-sep" />
          <div className="rm-title">
            <div className="rm-kicker">{ROOM_CONFIG.roomType}</div>
            <div className="rm-name">{ROOM_CONFIG.displayName}</div>
          </div>
          <div className="rm-meta">
            <span className="rm-badge">Seats {ROOM_CONFIG.capacity}</span>
            <span className={`rm-live${liveConnected ? ' on' : ''}`} role="status">
              <i className="rm-dot" />
              {liveConnected ? 'Live' : 'Offline'}
            </span>
            <button
              type="button"
              className={`rm-meet${screenOn ? ' on' : ''}`}
              role="switch"
              aria-checked={screenOn}
              onClick={() => { markManualChange(); setScreenOn((v) => !v); }}
            >
              {screenOn ? 'End meeting' : 'Start meeting'}
            </button>
            <button
              type="button"
              className="rm-iconbtn"
              aria-pressed={dockOpen}
              aria-label={dockOpen ? 'Hide room controls' : 'Show room controls'}
              title={dockOpen ? 'Hide room controls' : 'Show room controls'}
              onClick={() => setDockOpen((v) => !v)}
            >
              {ICONS.controls}
            </button>
          </div>
        </div>
      </header>

      <main className="rm-stage">
        <div className="rm-canvas" ref={mountRef} />

        <section className={`rm-dock${dockOpen ? '' : ' closed'}`} aria-label="Room controls" aria-hidden={!dockOpen}>
          <div className="rm-grid">
            <SliderTile
              id="rm-blinds" icon={ICONS.blinds} label="Blinds" track={TRACKS.blinds}
              valueText={`${blindPosition}% closed`}
              min={0} max={100} step={5} value={blindPosition}
              onChange={(e) => { markManualChange(); setBlindPosition(Number(e.target.value)); }}
            />
            <SliderTile
              id="rm-lights" icon={ICONS.lights} label="Lights" track={TRACKS.lights}
              valueText={`${lightBrightness}%`}
              min={0} max={100} step={5} value={lightBrightness}
              onChange={(e) => { markManualChange(); setLightBrightness(Number(e.target.value)); }}
            />
            <SliderTile
              id="rm-temp" icon={ICONS.temp} label="Temperature" track={TRACKS.temp}
              valueText={`${temperature}°C`}
              min={16} max={28} step={1} value={temperature}
              onChange={(e) => { markManualChange(); setTemperature(Number(e.target.value)); }}
            />
            <SliderTile
              id="rm-air" icon={ICONS.air} label="CO2" track={TRACKS.air}
              valueText={`${airQuality} ppm`}
              min={400} max={2400} step={50} value={airQuality}
              onChange={(e) => { markManualChange(); setAirQuality(Number(e.target.value)); }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
