import React, { useEffect, useRef } from "react";

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
  [40.7,-74.0,"New York"],[51.5,-0.1,"London"],[48.9,2.3,"Paris"],
  [55.7,37.6,"Moscow"],[35.7,139.7,"Tokyo"],[22.3,114.2,"Hong Kong"],
  [1.3,103.8,"Singapore"],[28.6,77.2,"Delhi"],[-33.9,151.2,"Sydney"],
  [-23.5,-46.6,"São Paulo"],[19.4,-99.1,"Mexico City"],[37.8,-122.4,"San Francisco"],
  [43.7,-79.4,"Toronto"],[52.5,13.4,"Berlin"],[41.9,12.5,"Rome"],
  [39.9,116.4,"Beijing"],[31.2,121.5,"Shanghai"],[-26.2,28.0,"Johannesburg"],
  [30.0,31.2,"Cairo"],[25.2,55.3,"Dubai"],[34.0,118.2,"Los Angeles"],
  [41.4,2.2,"Barcelona"],[59.9,30.3,"St. Petersburg"],[50.1,14.4,"Prague"],
  [-34.6,-58.4,"Buenos Aires"],[33.9,-118.4,"LA"],[47.6,-122.3,"Seattle"],
  [45.5,-73.6,"Montreal"],[19.1,72.9,"Mumbai"],[13.1,80.3,"Chennai"],
];

function latLngToXYZ(lat: number, lng: number): [number, number, number] {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -Math.sin(phi) * Math.cos(theta),
     Math.cos(phi),
     Math.sin(phi) * Math.sin(theta),
  ];
}

function rotateY(x: number, y: number, z: number, a: number): [number, number, number] {
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
}
function rotateX(x: number, y: number, z: number, a: number): [number, number, number] {
  return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
}

function slerp(
  a: [number,number,number], b: [number,number,number], t: number
): [number,number,number] {
  const dot = Math.min(1, Math.max(-1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]));
  const omega = Math.acos(dot);
  if (Math.abs(omega) < 0.0001) return a;
  const s = Math.sin(omega);
  const ta = Math.sin((1-t)*omega) / s;
  const tb = Math.sin(t*omega)     / s;
  return [ta*a[0]+tb*b[0], ta*a[1]+tb*b[1], ta*a[2]+tb*b[2]];
}

interface Arc {
  from: [number,number,number];
  to:   [number,number,number];
  head: number;   // 0→1
  tail: number;   // lags head
  speed: number;
  hue: number;    // HSL hue
  width: number;
  done: boolean;
}

export default function InteractiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf: number;
    let W = 0, H = 0;
    let rotY = 0;
    const TILT   = 0.3;    // Earth's axial tilt feel
    const RADIUS = 220;
    const CAM    = 680;
    let targetMouseX = 0;
    let smoothMouseX = 0;

    // Pre-compute continent 3D coords
    const globePts = CONTINENT_POINTS.map(([la, ln]) => latLngToXYZ(la, ln));
    const cityPts  = CITIES.map(([la, ln]) => latLngToXYZ(la, ln));

    // ── Stars background ─────────────────────────────────────────────
    const STARS = Array.from({length: 180}, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.1,
      a: 0.2 + Math.random() * 0.6,
    }));

    // ── Arc pool ──────────────────────────────────────────────────────
    const arcs: Arc[] = [];
    // Arc hues: amber 38, orange 22, red 0, green 160, blue 210
    const ARC_HUES = [38, 22, 0, 160, 210, 280];

    const makeArc = () => {
      let i = Math.floor(Math.random() * CITIES.length);
      let j = Math.floor(Math.random() * CITIES.length);
      while (j === i) j = Math.floor(Math.random() * CITIES.length);
      arcs.push({
        from: cityPts[i], to: cityPts[j],
        head: 0, tail: -0.3,
        speed: 0.004 + Math.random() * 0.004,
        hue: ARC_HUES[Math.floor(Math.random() * ARC_HUES.length)],
        width: 1.2 + Math.random() * 1.4,
        done: false,
      });
    };
    for (let i = 0; i < 8; i++) makeArc();

    // ── Resize ────────────────────────────────────────────────────────
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      W = p.clientWidth; H = p.clientHeight;
      canvas.width = W; canvas.height = H;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Mouse ─────────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      targetMouseX = ((e.clientX / window.innerWidth) - 0.5) * 0.6;
    };
    window.addEventListener("mousemove", onMouse);

    // ── Project 3D → 2D ──────────────────────────────────────────────
    const proj = (x: number, y: number, z: number): [number,number,number] => {
      const sc = CAM / (CAM + z * RADIUS);
      return [W/2 + x * RADIUS * sc, H/2 + y * RADIUS * sc, z];
    };

    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      // Smooth mouse
      smoothMouseX += (targetMouseX - smoothMouseX) * 0.04;
      rotY += 0.006; // continuous rotation speed
      const ry = rotY + smoothMouseX;

      // ── Stars ─────────────────────────────────────────────────────
      STARS.forEach(s => {
        ctx.fillStyle = `rgba(180,220,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Outer atmosphere glow (multi-layer) ──────────────────────
      const layers = [
        { r: RADIUS * 1.45, c: "rgba(0,120,255,0.04)" },
        { r: RADIUS * 1.28, c: "rgba(0,160,255,0.07)" },
        { r: RADIUS * 1.12, c: "rgba(0,200,255,0.10)" },
      ];
      layers.forEach(({ r, c }) => {
        const g = ctx.createRadialGradient(cx, cy, RADIUS * 0.85, cx, cy, r);
        g.addColorStop(0, c);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Ocean sphere ──────────────────────────────────────────────
      const sg = ctx.createRadialGradient(
        cx - RADIUS * 0.3, cy - RADIUS * 0.35, RADIUS * 0.05,
        cx, cy, RADIUS
      );
      sg.addColorStop(0,   "rgba(0,45,100,0.95)");
      sg.addColorStop(0.4, "rgba(0,18,50,0.97)");
      sg.addColorStop(1,   "rgba(0,5,18,0.99)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // ── Lat/Lng grid ──────────────────────────────────────────────
      const drawGrid = (isLat: boolean, values: number[], step: number) => {
        values.forEach(v => {
          ctx.beginPath();
          let started = false;
          for (let u = -180; u <= 180; u += step) {
            const la = isLat ? v : u;
            const ln = isLat ? u : v;
            let [gx, gy, gz] = latLngToXYZ(la, ln);
            let [rx, ry2, rz] = rotateX(...rotateY(gx, gy, gz, ry), TILT);
            if (rz < 0) { started = false; continue; }
            const depth = (rz + 1) / 2;
            const [px, py] = proj(rx, ry2, rz);
            const alpha = 0.03 + depth * 0.07;
            if (!started) {
              ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
              ctx.moveTo(px, py); started = true;
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.lineWidth = 0.4;
          ctx.stroke();
        });
      };
      drawGrid(true, [-60,-30,0,30,60], 3);
      drawGrid(false, [-150,-120,-90,-60,-30,0,30,60,90,120,150,180], 4);

      // ── Continent dots ───────────────────────────────────────────
      globePts.forEach(([gx, gy, gz]) => {
        let [rx, ry2, rz] = rotateX(...rotateY(gx, gy, gz, ry), TILT);
        if (rz < -0.05) return;
        const depth = (rz + 1) / 2;
        const [px, py] = proj(rx, ry2, rz);
        const alpha = 0.15 + depth * 0.85;
        const r     = 0.6 + depth * 1.6;

        // Glow halo for bright dots
        if (depth > 0.6) {
          const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 5);
          glow.addColorStop(0, `rgba(0,230,255,${alpha * 0.45})`);
          glow.addColorStop(1, "rgba(0,230,255,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(px, py, r * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core dot — bright cyan/white
        const brightness = Math.floor(180 + depth * 75);
        ctx.fillStyle = `rgba(${brightness},235,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── City beacon pulses ────────────────────────────────────────
      cityPts.forEach((cp, idx) => {
        let [rx, ry2, rz] = rotateX(...rotateY(cp[0], cp[1], cp[2], ry), TILT);
        if (rz < 0.1) return;
        const depth = (rz + 1) / 2;
        const [px, py] = proj(rx, ry2, rz);
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.04 + idx * 1.3);

        // Outer pulse ring
        ctx.strokeStyle = `rgba(0,200,255,${0.15 + pulse * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, 3 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Inner core
        ctx.fillStyle = `rgba(200,240,255,${0.7 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Animated great-circle arcs ────────────────────────────────
      if (frame % 70 === 0 && arcs.length < 16) makeArc();

      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.head = Math.min(1, arc.head + arc.speed);
        arc.tail = Math.min(arc.head, arc.tail + arc.speed * 0.6);
        if (arc.tail >= 1) { arcs.splice(i, 1); makeArc(); continue; }

        const SEGS = 80;
        const headS = Math.floor(arc.head * SEGS);
        const tailS = Math.floor(arc.tail * SEGS);

        // Draw glow pass then core pass
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          let started = false;
          for (let s = tailS; s <= headS; s++) {
            const t  = s / SEGS;
            const pt = slerp(arc.from, arc.to, t);
            let [rx, ry2, rz] = rotateX(...rotateY(pt[0], pt[1], pt[2], ry), TILT);
            if (rz < 0) { started = false; continue; }
            const [px, py] = proj(rx, ry2, rz);
            const fadeFraction = (s - tailS) / Math.max(1, headS - tailS);
            const alpha = pass === 0
              ? fadeFraction * 0.3
              : 0.2 + fadeFraction * 0.75;
            if (!started) { ctx.moveTo(px, py); started = true; }
            else { ctx.lineTo(px, py); }
          }
          if (pass === 0) {
            ctx.shadowBlur  = 18;
            ctx.shadowColor = `hsl(${arc.hue},100%,60%)`;
            ctx.strokeStyle = `hsla(${arc.hue},100%,70%,0.4)`;
            ctx.lineWidth   = arc.width * 3;
          } else {
            ctx.shadowBlur  = 6;
            ctx.shadowColor = `hsl(${arc.hue},100%,65%)`;
            ctx.strokeStyle = `hsla(${arc.hue},100%,80%,0.95)`;
            ctx.lineWidth   = arc.width;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

        // Glowing arc head
        const headPt = slerp(arc.from, arc.to, arc.head);
        let [hrx, hry, hrz] = rotateX(...rotateY(headPt[0], headPt[1], headPt[2], ry), TILT);
        if (hrz >= 0) {
          const [hpx, hpy] = proj(hrx, hry, hrz);
          const hg = ctx.createRadialGradient(hpx, hpy, 0, hpx, hpy, 7);
          hg.addColorStop(0, `hsla(${arc.hue},100%,90%,0.9)`);
          hg.addColorStop(1, `hsla(${arc.hue},100%,60%,0)`);
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(hpx, hpy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(hpx, hpy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Specular highlight (light source top-left) ─────────────────
      const specG = ctx.createRadialGradient(
        cx - RADIUS * 0.42, cy - RADIUS * 0.42, 0,
        cx - RADIUS * 0.25, cy - RADIUS * 0.25, RADIUS * 0.85
      );
      specG.addColorStop(0,   "rgba(120,210,255,0.10)");
      specG.addColorStop(0.35,"rgba(40,140,220,0.04)");
      specG.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = specG;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // ── Edge ring ─────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(0,180,255,0.18)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Inner thin ring glow
      ctx.strokeStyle = "rgba(0,220,255,0.07)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS - 2, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ filter: "drop-shadow(0 0 80px rgba(0,140,255,0.3))" }}
    />
  );
}
