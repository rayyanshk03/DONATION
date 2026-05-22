import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import InteractiveGlobe from "./InteractiveGlobe";

// ── Geographic continent points [lat, lng] ──────────────────────────────────
const CONTINENT_POINTS: [number, number][] = [
  // North America
  [70,-140],[72,-120],[71,-100],[70,-85],[68,-75],[65,-168],[63,-163],[60,-166],
  [55,-162],[58,-137],[55,-130],[50,-127],[48,-124],[45,-124],[42,-124],[38,-123],
  [35,-121],[32,-117],[30,-110],[25,-110],[22,-106],[20,-105],[18,-103],[16,-93],
  [15,-90],[14,-87],[12,-84],[10,-85],[9,-83],[8,-77],[9,-76],[11,-74],[12,-72],
  [42,-70],[44,-68],[46,-65],[47,-60],[50,-56],[52,-56],[55,-60],[58,-65],
  [60,-65],[62,-70],[64,-78],[65,-82],[60,-78],[58,-78],[55,-76],[52,-80],
  [50,-85],[48,-88],[46,-84],[44,-78],[42,-79],[40,-74],[38,-75],[35,-76],
  [32,-80],[30,-81],[25,-80],[25,-90],[29,-90],[30,-89],[28,-97],[26,-97],
  [50,-100],[52,-110],[55,-115],[58,-120],[55,-105],[50,-90],[48,-95],[45,-100],
  [42,-95],[40,-95],[38,-97],[35,-100],[32,-100],[40,-105],[45,-110],[60,-100],
  [65,-120],[60,-85],[55,-90],[50,-80],[55,-100],[47,-120],[44,-120],[42,-122],
  [48,-123],[50,-120],[52,-115],[54,-110],[56,-115],[58,-125],[62,-145],[64,-163],
  [66,-150],[68,-155],[70,-160],[72,-130],[65,-145],[60,-140],[55,-135],
  // South America
  [12,-72],[10,-63],[8,-62],[6,-62],[4,-60],[2,-60],[0,-50],[-2,-45],[-5,-38],
  [-8,-35],[-10,-37],[-13,-39],[-15,-40],[-18,-39],[-20,-40],[-23,-43],[-25,-48],
  [-27,-49],[-30,-51],[-33,-53],[-35,-58],[-38,-62],[-40,-62],[-42,-63],[-45,-66],
  [-48,-67],[-50,-69],[-53,-69],[-55,-68],[-55,-65],[-50,-74],[-47,-74],[-45,-73],
  [-42,-73],[-38,-73],[-33,-72],[-30,-72],[-25,-70],[-20,-70],[-17,-71],[-15,-75],
  [-12,-77],[-8,-78],[-5,-80],[-2,-80],[0,-78],[2,-77],[4,-77],[7,-77],[9,-76],
  [-10,-55],[-15,-55],[-20,-55],[-25,-55],[-5,-60],[0,-65],[-30,-60],[-10,-65],
  [-15,-65],[-20,-60],[-5,-45],[-10,-48],[-8,-40],[-12,-45],[-18,-48],[-22,-50],
  // Europe
  [71,28],[70,20],[69,15],[68,14],[65,14],[63,8],[60,5],[58,5],[55,8],[55,10],
  [57,10],[57,12],[56,15],[55,15],[54,12],[54,10],[52,8],[51,2],[51,0],[50,-5],
  [48,-5],[47,-2],[46,-2],[43,-2],[43,-9],[42,-9],[40,-8],[37,-8],[36,-6],[36,-5],
  [38,0],[40,0],[40,3],[42,3],[43,5],[43,7],[44,8],[44,12],[45,13],[44,14],
  [42,16],[40,18],[38,15],[38,13],[37,15],[37,12],[40,15],[41,12],[44,12],
  [45,14],[45,16],[46,16],[47,17],[48,17],[50,18],[51,17],[52,21],[54,22],
  [55,22],[56,21],[57,22],[59,22],[60,22],[60,25],[61,28],[60,30],[59,28],
  [58,27],[57,28],[56,26],[55,24],[54,26],[57,20],[59,18],[62,16],[63,14],
  [64,16],[65,15],[66,14],[68,16],[70,24],[50,15],[52,12],[48,15],[46,12],
  [50,20],[55,15],[57,15],[60,15],[47,12],[46,8],[48,10],[50,12],[53,8],
  [51,5],[50,10],[49,8],[48,8],[47,8],[46,10],[47,15],[48,14],[49,14],[50,14],
  // Africa
  [37,10],[33,10],[30,10],[25,10],[20,15],[15,15],[12,15],[10,15],[8,10],
  [5,5],[4,2],[4,0],[5,-3],[5,-5],[4,-8],[6,1],[4,3],[2,5],[0,8],[-2,10],
  [-4,12],[-5,12],[-5,15],[-4,18],[-5,20],[-8,15],[-10,14],[-10,12],[-15,12],
  [-15,15],[-17,13],[-20,13],[-23,14],[-25,15],[-28,17],[-30,17],[-32,18],
  [-34,19],[-34,22],[-33,26],[-34,28],[-33,30],[-30,32],[-27,33],[-25,33],
  [-22,35],[-18,36],[-15,36],[-12,37],[-10,40],[-8,40],[-5,40],[-2,42],
  [0,42],[2,42],[5,42],[8,44],[10,44],[12,44],[12,48],[12,51],[15,42],[18,38],
  [20,38],[22,37],[25,38],[26,33],[28,33],[30,33],[30,30],[31,30],[30,28],
  [30,25],[30,22],[30,18],[28,15],[27,14],[25,12],[22,13],[18,16],[15,16],
  [15,12],[18,12],[20,12],[22,12],[25,10],[28,10],[30,8],[32,12],[33,12],
  [35,10],[36,14],[37,15],[36,10],
  [0,20],[5,25],[10,25],[15,25],[0,30],[5,15],[10,20],[-10,25],[-15,30],[-5,25],
  [5,35],[10,35],[15,35],[0,10],[5,10],[10,30],[15,30],[20,25],[20,30],[-5,30],
  [-10,30],[-15,20],[-20,20],[-25,25],[-25,20],[-20,25],[-15,25],
  // Asia - coasts
  [72,130],[70,140],[68,160],[65,168],[62,162],[60,162],[58,160],[55,162],
  [52,158],[48,142],[45,140],[43,136],[40,132],[38,128],[36,128],[35,129],
  [33,131],[30,121],[28,120],[25,122],[22,114],[20,110],[18,110],[15,108],
  [12,109],[10,105],[10,103],[11,103],[13,100],[15,100],[17,97],[18,95],
  [20,93],[22,93],[24,93],[24,92],[22,88],[20,87],[18,84],[15,80],[10,77],
  [8,77],[8,80],[12,74],[15,74],[18,73],[19,72],[20,70],[22,68],[22,65],
  [25,62],[25,60],[22,60],[22,58],[23,58],[25,56],[26,56],[26,52],[28,48],
  [25,50],[24,54],[24,58],[22,59],[18,55],[15,50],[12,48],[14,42],[16,40],
  [18,38],[22,36],[28,34],[30,33],[33,35],[35,36],[36,36],[37,37],[38,38],
  [40,40],[40,44],[40,50],[40,56],[40,62],[40,68],[40,72],[40,76],[38,76],
  [36,76],[35,75],[34,74],[32,74],[30,75],[28,76],[26,78],[25,82],[25,90],
  [24,88],[22,90],[20,88],[22,92],[25,92],[26,95],[28,100],[28,104],[26,105],
  [25,110],[24,116],[22,116],[22,120],[25,120],[28,118],[30,120],[30,118],
  [32,118],[35,115],[35,110],[35,105],[37,105],[38,108],[40,110],[42,112],
  [43,118],[45,120],[47,125],[48,130],[50,130],[52,140],[55,140],
  // Asia interior
  [45,60],[45,65],[45,70],[45,75],[45,80],[45,85],[45,90],[45,95],
  [50,70],[50,80],[50,90],[55,70],[55,80],[55,90],[55,100],
  [60,70],[60,80],[60,90],[60,100],[60,110],[60,120],
  [65,70],[65,80],[65,90],[65,100],[65,110],[65,120],[65,130],
  [70,80],[70,90],[70,100],[70,110],[70,120],[70,130],[70,140],
  [72,120],[72,110],[72,100],[72,90],[72,80],
  [35,50],[35,60],[35,70],[35,80],[35,90],
  [30,50],[30,60],[30,70],[30,80],[30,90],
  [25,50],[25,60],[25,70],[25,80],
  [55,105],[55,110],[55,115],[55,120],[55,125],[55,130],[55,135],
  [60,105],[60,115],[60,125],[60,130],[60,135],[65,105],[65,115],[65,125],[65,135],
  // Australia
  [-15,130],[-12,136],[-12,140],[-15,142],[-18,148],[-22,150],[-25,153],
  [-28,153],[-30,153],[-33,152],[-35,150],[-37,150],[-38,147],[-38,144],
  [-37,140],[-36,140],[-35,138],[-32,134],[-32,130],[-33,125],[-33,120],
  [-32,116],[-30,115],[-27,114],[-22,114],[-20,118],[-18,122],[-16,124],
  [-25,130],[-25,140],[-25,120],[-30,130],[-30,140],[-20,130],[-20,140],
  [-22,135],[-25,135],[-27,140],[-28,145],[-30,148],
  // Greenland
  [76,-20],[78,-25],[80,-30],[82,-35],[83,-40],[82,-50],[80,-60],[78,-65],
  [76,-68],[72,-66],[68,-54],[65,-42],[65,-38],[67,-35],[70,-30],[73,-25],
  [75,-22],[74,-20],[72,-18],[74,-25],[76,-28],[78,-32],[80,-40],[80,-50],
  // Japan
  [43,141],[41,141],[40,141],[39,141],[38,141],[38,140],[37,136],[36,136],
  [35,136],[34,135],[34,132],[33,130],[34,133],[35,137],[43,144],[44,143],
  [45,142],[44,145],[43,145],[42,143],[41,142],
  // UK + Ireland
  [51,0],[52,2],[53,0],[54,-1],[55,-2],[56,-3],[57,-4],[58,-5],[57,-6],
  [55,-5],[54,-4],[53,-4],[52,-3],[51,-3],[51,-5],[50,-5],[53,-10],[54,-8],
  [55,-7],[54,-6],[53,-6],[52,-8],[51,-8],[52,-10],
  // Indonesia
  [-8,115],[-8,120],[-8,125],[-8,130],[-5,120],[-5,125],[-3,115],[-3,120],
  [1,105],[2,108],[3,110],[4,118],[5,118],[2,115],[-2,110],[-4,115],
  // Madagascar
  [-13,50],[-15,48],[-18,44],[-20,44],[-23,44],[-25,45],[-25,48],[-23,48],
  [-20,48],[-18,48],[-15,50],[-13,50],
  // New Zealand
  [-36,175],[-38,176],[-40,175],[-41,174],[-43,172],[-44,170],[-46,168],
  [-44,172],[-42,172],[-40,176],[-38,178],[-36,175],
];

// ── City nodes for arcs [lat, lng, name] ─────────────────────────────────
const CITIES: [number, number, string][] = [
  [40.7128, -74.0060, "New York"],
  [51.5074, -0.1278, "London"],
  [48.8566, 2.3522, "Paris"],
  [35.6762, 139.6503, "Tokyo"],
  [1.3521, 103.8198, "Singapore"],
  [-33.8688, 151.2093, "Sydney"],
  [37.7749, -122.4194, "San Francisco"],
  [25.2048, 55.2708, "Dubai"],
  [28.6139, 77.2090, "Delhi"],
  [-23.5505, -46.6333, "São Paulo"],
  [19.4326, -99.1332, "Mexico City"],
  [-26.2041, 28.0473, "Johannesburg"],
];

// Active global paths to connect via 3D Bezier curves
const DONATION_PATHS = [
  { from: "San Francisco", to: "London" },
  { from: "New York", to: "Paris" },
  { from: "London", to: "Dubai" },
  { from: "Dubai", to: "Delhi" },
  { from: "Delhi", to: "Singapore" },
  { from: "Singapore", to: "Tokyo" },
  { from: "Tokyo", to: "Sydney" },
  { from: "Sydney", to: "San Francisco" },
  { from: "São Paulo", to: "New York" },
  { from: "Johannesburg", to: "London" },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Dynamically generate the neon coordinate/dotted continent map texture in-memory
function createProceduralEarthTexture(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Space/Sea background: Deep obsidian glassmorphic slate blue
  ctx.fillStyle = "#02040a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle digital grid lines
  ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
  ctx.lineWidth = 1;
  const gridCount = 48;
  for (let i = 0; i <= gridCount; i++) {
    // Longitude lines
    const x = (i / gridCount) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();

    // Latitude lines
    if (i <= gridCount / 2) {
      const y = (i / (gridCount / 2)) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  // Draw glowing continental particle nodes
  CONTINENT_POINTS.forEach(([lat, lng]) => {
    // Equirectangular projection mapping
    const x = ((lng + 180) / 360) * canvas.width;
    const y = ((90 - lat) / 180) * canvas.height;

    // Pulse gradient to look neon and high-tech
    const radius = 6.5;
    const grad = ctx.createRadialGradient(x, y, 0.5, x, y, radius);
    grad.addColorStop(0, "rgba(6, 182, 212, 1)");      // cyan core
    grad.addColorStop(0.2, "rgba(14, 116, 144, 0.85)"); // deep teal
    grad.addColorStop(0.5, "rgba(59, 130, 246, 0.4)");  // glowing blue halo
    grad.addColorStop(1, "rgba(59, 130, 246, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // High brightness central core pinpoint
    ctx.fillStyle = "#e0f7fa";
    ctx.beginPath();
    ctx.arc(x, y, 1.0, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas;
}

export default function EarthGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = React.useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 550;
    const H = mount.clientHeight || 550;

    // ── WebGL Renderer ─────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn("WebGL not supported, falling back to 2D Canvas Globe:", e);
      setWebglSupported(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ─────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 2.75);

    // ── Globe Core Geometry & Procedural Material ──────────────────────────
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    
    // Create the procedural CanvasTexture (guarantees 0 HTTP dependency & instantly renders)
    const textureCanvas = createProceduralEarthTexture();
    const earthTexture = new THREE.CanvasTexture(textureCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      transparent: true,
      opacity: 0.95,
      shininess: 24,
      specular: new THREE.Color(0x0e7490),
    });

    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // ── Glowing Digital Atmosphere Shader ──────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(1.10, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
          gl_FragColor = vec4(0.06, 0.71, 0.85, 0.75) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    scene.add(atmosphere);

    // ── Glowing City Nodes ─────────────────────────────────────────────────
    const cityNodeGroup = new THREE.Group();
    earth.add(cityNodeGroup);

    const cityPoints3D: { [name: string]: THREE.Vector3 } = {};

    CITIES.forEach(([lat, lng, name]) => {
      const pos = latLngToVector3(lat, lng, 1.015);
      cityPoints3D[name] = pos;

      // Small glowing city coordinate anchor
      const nodeGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6, // Royal Blue
        transparent: true,
        opacity: 0.9,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      cityNodeGroup.add(nodeMesh);

      // Outer pulsing ripple ring
      const ringGeo = new THREE.RingGeometry(0.012, 0.024, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4, // Cyan glow
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      // Rotate the ring flat against the surface of the sphere
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      ringMesh.userData = {
        scaleSpeed: 0.65 + Math.random() * 0.5,
        maxScale: 2.2 + Math.random() * 1.5,
        currentScale: 1.0,
      };
      cityNodeGroup.add(ringMesh);
    });

    // ── 3D Arcs (Curved Bezier donation corridors) & Animated Packets ──────
    const arcCorridorGroup = new THREE.Group();
    earth.add(arcCorridorGroup);

    const activePackets: {
      mesh: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      speed: number;
      progress: number;
    }[] = [];

    DONATION_PATHS.forEach(({ from, to }) => {
      const start = cityPoints3D[from];
      const end = cityPoints3D[to];
      if (!start || !end) return;

      // 1. Calculate parabolic midpoint for Bezier arc height
      const mid = new THREE.Vector3().addVectors(start, end).normalize();
      const dist = start.distanceTo(end);
      const arcHeight = 1.0 + dist * 0.28; // Arc scales proportionally to distance
      mid.multiplyScalar(arcHeight);

      // 2. Generate smooth 3D Bezier curve
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const curvePts = curve.getPoints(40);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePts);

      // Subtle cyan connection line
      const curveMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
      });
      const lineArc = new THREE.Line(curveGeo, curveMat);
      arcCorridorGroup.add(lineArc);

      // 3. Create active glowing donation packet sphere
      const packetGeo = new THREE.SphereGeometry(0.006, 8, 8);
      const packetMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee, // Pulsing bright cyan
        transparent: true,
        opacity: 0.95,
      });
      const packetMesh = new THREE.Mesh(packetGeo, packetMat);
      earth.add(packetMesh);

      activePackets.push({
        mesh: packetMesh,
        curve: curve,
        speed: 0.08 + Math.random() * 0.12,
        progress: Math.random(),
      });
    });

    // ── Twinkling Deep-Space Stars Field ───────────────────────────────────
    const starCount = 3500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 100;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.65,
    });
    const spaceStars = new THREE.Points(starGeo, starMat);
    scene.add(spaceStars);

    // ── Scene Lighting ─────────────────────────────────────────────────────
    // Sun-like warm directional light
    const sun = new THREE.DirectionalLight(0xffeedd, 2.6);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Subtle blue rim highlight from behind to trace the globe outline
    const rim = new THREE.DirectionalLight(0x0284c7, 0.85);
    rim.position.set(-6, -2, -4);
    scene.add(rim);

    // Soft global ambient space lighting
    const ambient = new THREE.AmbientLight(0x0f172a, 0.8);
    scene.add(ambient);

    // ── Interactive Drag & Glide Controller ────────────────────────────────
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      
      dragVelocity.y = dx * 0.003;
      dragVelocity.x = dy * 0.003;

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Touch support for responsive devices
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouse.x;
      const dy = e.touches[0].clientY - prevMouse.y;
      
      dragVelocity.y = dx * 0.005;
      dragVelocity.x = dy * 0.005;

      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    mount.addEventListener("touchstart", onTouchStart, { passive: true });
    mount.addEventListener("touchmove", onTouchMove, { passive: true });
    mount.addEventListener("touchend", onMouseUp);

    // ── Active Animation Loop ──────────────────────────────────────────────
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Earth & overlay continuous rotations
      if (isDragging) {
        earth.rotation.x += dragVelocity.x;
        earth.rotation.y += dragVelocity.y;
        
        // Decay speed when user releases mouse
        dragVelocity.x *= 0.90;
        dragVelocity.y *= 0.90;
      } else {
        // High premium cinematic rotation
        earth.rotation.y += 0.0028;
      }

      // 1. Animate active donation corridor packets
      activePackets.forEach((packet) => {
        packet.progress += packet.speed * delta;
        if (packet.progress >= 1.0) {
          packet.progress = 0.0;
          packet.speed = 0.08 + Math.random() * 0.12;
        }
        const currentPos = packet.curve.getPointAt(packet.progress);
        packet.mesh.position.copy(currentPos);
      });

      // 2. Animate pulsating ripples at city coordinates
      cityNodeGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
          const u = child.userData;
          u.currentScale += u.scaleSpeed * delta;
          if (u.currentScale > u.maxScale) {
            u.currentScale = 1.0;
          }
          child.scale.setScalar(u.currentScale);
          
          // Fade out ring as it reaches outer boundary
          const material = child.material as THREE.MeshBasicMaterial;
          material.opacity = 0.85 * (1.0 - (u.currentScale - 1.0) / (u.maxScale - 1.0));
        }
      });

      // 3. Subtle camera breathing effect
      camera.position.x = Math.sin(time * 0.18) * 0.03;
      camera.position.y = Math.cos(time * 0.18) * 0.03;

      renderer.render(scene, camera);
    };
    animate();

    // ── Layout Change Resize Controller ────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Thorough WebGL Memory Disposal Cleanup ─────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mount.removeEventListener("mousedown", onMouseDown);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove", onTouchMove);
      mount.removeEventListener("touchend", onMouseUp);

      // Recursive disposal of scene elements
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;

        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      earthTexture.dispose();
      renderer.dispose();
      
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webglSupported) {
    return <InteractiveGlobe />;
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
    />
  );
}
