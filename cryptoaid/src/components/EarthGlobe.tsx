import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EarthGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // ── Scene / Camera ─────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 2.8);

    // ── Textures (public CDN – NASA Blue Marble & Night Lights) ───────────
    const loader = new THREE.TextureLoader();
    const earthDay = loader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg"
    );
    const earthSpec = loader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg"
    );
    const earthNorm = loader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg"
    );
    const earthClouds = loader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png"
    );

    // ── Earth Sphere ───────────────────────────────────────────────────────
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthDay,
      specularMap: earthSpec,
      normalMap: earthNorm,
      specular: new THREE.Color(0x2266aa),
      shininess: 18,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);

    // ── Cloud Layer ────────────────────────────────────────────────────────
    const cloudGeo = new THREE.SphereGeometry(1.008, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: earthClouds,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(clouds);

    // ── Atmosphere Glow ────────────────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(1.12, 64, 64);
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
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
          gl_FragColor = vec4(0.18, 0.52, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    scene.add(atmosphere);

    // ── Stars ──────────────────────────────────────────────────────────────
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 120;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── Lighting ───────────────────────────────────────────────────────────
    // Sun-like directional light
    const sun = new THREE.DirectionalLight(0xffeedd, 2.2);
    sun.position.set(5, 3, 5);
    sun.castShadow = true;
    scene.add(sun);

    // Soft ambient so night side isn't pitch black
    const ambient = new THREE.AmbientLight(0x111133, 0.6);
    scene.add(ambient);

    // Rim light (blue tint from behind)
    const rim = new THREE.DirectionalLight(0x4466ff, 0.4);
    rim.position.set(-5, -1, -3);
    scene.add(rim);

    // ── Surface Stars (glowing white/silver twinkling stars on globe) ─────
    const arcCount = 28;
    const arcGroup = new THREE.Group();
    scene.add(arcGroup);
    for (let i = 0; i < arcCount; i++) {
      // Tiny pinpoint star sizes — realistic not big blobs
      const size = 0.003 + Math.random() * 0.005;
      const dotGeo = new THREE.SphereGeometry(size, 8, 8);
      // Pure white to very light blue-white — like real stars
      const brightness = 0.88 + Math.random() * 0.12;
      const starColor = new THREE.Color(brightness, brightness, 1.0);
      const dotMat = new THREE.MeshBasicMaterial({
        color: starColor,
        transparent: true,
        opacity: 0.9,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      const lat = (Math.random() - 0.5) * Math.PI;
      const lon = Math.random() * Math.PI * 2;
      const r = 1.03;
      dot.position.set(
        r * Math.cos(lat) * Math.cos(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.sin(lon)
      );
      // Random twinkling phase and speed
      dot.userData = {
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.4,
      };
      arcGroup.add(dot);
    }

    // ── Mouse drag interaction ─────────────────────────────────────────────
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotVelX = 0;
    let rotVelY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      rotVelX = dy * 0.003;
      rotVelY = dx * 0.003;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // ── Animation Loop ─────────────────────────────────────────────────────
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (isDragging) {
        earth.rotation.x += rotVelX;
        earth.rotation.y += rotVelY;
        clouds.rotation.x += rotVelX;
        clouds.rotation.y += rotVelY;
        arcGroup.rotation.x += rotVelX;
        arcGroup.rotation.y += rotVelY;
        rotVelX *= 0.85;
        rotVelY *= 0.85;
      } else {
        // Gentle auto-spin
        earth.rotation.y += 0.0018;
        clouds.rotation.y += 0.0022; // clouds spin slightly faster
        arcGroup.rotation.y += 0.0018;
      }

      // Twinkle stars — natural flickering like real stars
      arcGroup.children.forEach((dot) => {
        const mesh = dot as THREE.Mesh;
        const phase = mesh.userData.phase as number;
        const speed = mesh.userData.speed as number;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        // Smooth sinusoidal twinkle — min opacity keeps them always visible
        const twinkle = Math.sin(t * speed + phase);
        mat.opacity = 0.35 + 0.65 * (0.5 + 0.5 * twinkle);
        // Very subtle scale pulse — stars don't dramatically resize
        const s = 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(t * speed * 0.7 + phase));
        mesh.scale.setScalar(s);
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ─────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mount.removeEventListener("mousedown", onMouseDown);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
    />
  );
}
