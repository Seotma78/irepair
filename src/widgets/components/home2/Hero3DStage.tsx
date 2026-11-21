import React, { Component, ErrorInfo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Layers, Smartphone } from 'lucide-react';

export type QuoteServiceMode = 'screen' | 'battery' | 'buyback';

interface Hero3DStageProps {
  serviceType: QuoteServiceMode;
  brandId: string;
  modelId: string;
  modelName?: string;
  quoteValue?: string;
  quoteMeta?: string;
  fallbackImage: string;
  enable3D?: boolean;
}

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Graceful static image fallback if WebGL fails
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function detectWebGLCapabilities(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof window === 'undefined') {
    return { supported: false, isSoftwareGl: false };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) {
      return { supported: false, isSoftwareGl: false };
    }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(renderer);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: false };
  }
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getBrandFinish(brandId: string, modelId: string): {
  frameHex: string;
  backHex: string;
} {
  if (brandId === 'samsung') {
    return { frameHex: '#525866', backHex: '#1D212B' };
  }
  if (brandId === 'google') {
    return { frameHex: '#CBD2DC', backHex: '#282E3A' };
  }
  if (brandId === 'apple-laptop' || brandId === 'apple-tablet') {
    return { frameHex: '#DCE2EA', backHex: '#2D3442' };
  }
  if (modelId.includes('14') || modelId.includes('13')) {
    return { frameHex: '#313744', backHex: '#151922' };
  }
  return { frameHex: '#C2BCB0', backHex: '#1E222B' };
}

interface FlagshipPhoneProps {
  serviceType: QuoteServiceMode;
  brandId: string;
  modelId: string;
  modelName: string;
  quoteValue: string;
  quoteMeta: string;
  isExploded: boolean;
  isSoftwareGl: boolean;
}

const FlagshipSmartphoneStage: React.FC<FlagshipPhoneProps> = ({
  serviceType,
  brandId,
  modelId,
  modelName,
  quoteValue,
  quoteMeta,
  isExploded,
  isSoftwareGl,
}) => {
  const { gl } = useThree();

  const rootGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);

  // Exploded Precision Layers
  const frontOledGroupRef = useRef<THREE.Group>(null);
  const logicGroupRef = useRef<THREE.Group>(null);
  const batteryGroupRef = useRef<THREE.Group>(null);
  const rearHousingGroupRef = useRef<THREE.Group>(null);
  const scanlineMeshRef = useRef<THREE.Mesh>(null);
  const scanlineMesh2Ref = useRef<THREE.Mesh>(null);
  const orbitRingGroupRef = useRef<THREE.Group>(null);
  const orbitRing1Ref = useRef<THREE.Mesh>(null);
  const orbitRing2Ref = useRef<THREE.Mesh>(null);

  const frameMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const backGlassMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);

  // High-DPI HTML5 Dynamic OLED Canvas Texture
  const hudCanvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    return canvas;
  }, []);

  const hudTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(hudCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [hudCanvas, gl]);

  useEffect(() => {
    return () => {
      hudTexture.dispose();
    };
  }, [hudTexture]);

  // Procedural geometries (disposed cleanly on unmount)
  const geometries = useMemo(() => {
    // 1. Ultra-thin chamfered titanium outer frame ring & chassis
    const bodyShape = createRoundedRectShape(1.52, 3.06, 0.22);
    const rearFrameGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 5,
    });
    rearFrameGeo.center();

    // 2. Front OLED Screen Panel + Glass Shield
    const screenShape = createRoundedRectShape(1.38, 2.92, 0.17);
    const screenPlaneGeo = new THREE.ShapeGeometry(screenShape, 24);
    // Normalize ShapeGeometry UVs cleanly into [0..1] for crisp CanvasTexture mapping
    const posAttr = screenPlaneGeo.attributes.position;
    const uvs = new Float32Array(posAttr.count * 2);
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      uvs[i * 2] = (x + 0.69) / 1.38;
      uvs[i * 2 + 1] = (y + 1.46) / 2.92;
    }
    screenPlaneGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const glassPlateGeo = new THREE.ExtrudeGeometry(screenShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
    });
    glassPlateGeo.center();

    const islandShape = createRoundedRectShape(0.36, 0.095, 0.047);
    const islandGeo = new THREE.ShapeGeometry(islandShape, 14);

    // 3. Precision Logic Board + SoC Chipset + Copper MagSafe Coil
    const pcbShape = createRoundedRectShape(1.22, 1.05, 0.08);
    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    });
    pcbGeo.center();

    const socGeo = new THREE.BoxGeometry(0.34, 0.34, 0.036);
    const magSafeCoilGeo = new THREE.TorusGeometry(0.42, 0.035, 16, 48);
    const magSafeInnerGeo = new THREE.TorusGeometry(0.32, 0.018, 12, 42);

    // 4. L-Shaped Internal Lithium-Ion Battery Pack
    const batteryShape = createRoundedRectShape(0.86, 1.36, 0.07);
    const batteryGeo = new THREE.ExtrudeGeometry(batteryShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
    });
    batteryGeo.center();

    // 5. Rear Camera Island + Sapphire Triple Lenses + Hardware Buttons
    const camBumpShape = createRoundedRectShape(0.58, 0.62, 0.11);
    const camBumpGeo = new THREE.ExtrudeGeometry(camBumpShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    camBumpGeo.center();

    const lensRingGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.032, 28);
    lensRingGeo.rotateX(Math.PI / 2);

    const lensGlassGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.038, 24);
    lensGlassGeo.rotateX(Math.PI / 2);

    const buttonGeo = new THREE.BoxGeometry(0.026, 0.26, 0.042);

    // 6. Laser Diagnostic Scanline Plane
    const scanlineGeo = new THREE.PlaneGeometry(1.78, 0.035);

    // 7. Orbiting Glassmorphic Buyback Valuation Rings
    const orbitRingGeo = new THREE.TorusGeometry(1.78, 0.018, 16, 72);
    const orbitInnerRingGeo = new THREE.TorusGeometry(1.48, 0.012, 14, 64);

    return {
      rearFrameGeo,
      screenPlaneGeo,
      glassPlateGeo,
      islandGeo,
      pcbGeo,
      socGeo,
      magSafeCoilGeo,
      magSafeInnerGeo,
      batteryGeo,
      camBumpGeo,
      lensRingGeo,
      lensGlassGeo,
      buttonGeo,
      scanlineGeo,
      orbitRingGeo,
      orbitInnerRingGeo,
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [geometries]);

  // Pre-allocated animation targets (zero allocations in useFrame)
  const targetFrameColor = useRef(new THREE.Color('#C2BCB0'));
  const targetBackColor = useRef(new THREE.Color('#1E222B'));
  const targetAccentColor = useRef(new THREE.Color('#E6007E'));
  const targetSpinAccum = useRef(0);
  const currentSpinRef = useRef(0);
  const currentExplodeRef = useRef(isExploded ? 1 : 0);
  const prevServiceRef = useRef<QuoteServiceMode>(serviceType);
  const lastHudDrawRef = useRef(0);

  useEffect(() => {
    const finish = getBrandFinish(brandId, modelId);
    targetFrameColor.current.set(finish.frameHex);
    targetBackColor.current.set(finish.backHex);
    targetAccentColor.current.set(serviceType === 'buyback' ? '#10B981' : '#E6007E');

    // Trigger signature 360° showcase spin when switching into Instant Buyback
    if (prevServiceRef.current !== serviceType) {
      if (serviceType === 'buyback') {
        targetSpinAccum.current += Math.PI * 2;
      } else {
        targetSpinAccum.current += Math.PI * 0.12;
      }
      prevServiceRef.current = serviceType;
    }
  }, [serviceType, brandId, modelId]);

  const drawHudCanvas = (timeSec: number) => {
    const ctx = hudCanvas.getContext('2d');
    if (!ctx) return;

    const w = hudCanvas.width;
    const h = hudCanvas.height;
    const isBuyback = serviceType === 'buyback';
    const isBattery = serviceType === 'battery';
    const accent = isBuyback ? '#10B981' : '#E6007E';
    const accentSoft = isBuyback ? 'rgba(16, 185, 129, 0.22)' : 'rgba(230, 0, 126, 0.22)';

    // Deep OLED obsidian gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#07090E');
    bgGrad.addColorStop(0.55, '#0D111A');
    bgGrad.addColorStop(1, '#090C12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle radial top glow
    const radGrad = ctx.createRadialGradient(w / 2, h * 0.42, 16, w / 2, h * 0.42, 260);
    radGrad.addColorStop(0, accentSoft);
    radGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle micro-grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 32; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 90);
      ctx.lineTo(x, h - 80);
      ctx.stroke();
    }
    for (let y = 120; y < h - 80; y += 48) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(w - 28, y);
      ctx.stroke();
    }

    // Top Header Status
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('iREPAIR LABS · LIVE HUD', w / 2, 134);

    // Device Name Badge
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText((modelName || 'iPhone 15 Pro').slice(0, 22), w / 2, 182);

    // Active Mode Pill
    const modeLabel = isBuyback
      ? 'VERIFIED INSTANT VALUATION'
      : isBattery
        ? 'CELL HEALTH DIAGNOSTIC'
        : 'OLED DIAGNOSTIC SCAN';
    drawRoundedRectPath(ctx, w / 2 - 178, 206, 356, 38, 19);
    ctx.fillStyle = accentSoft;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isBuyback ? '#6EE7B7' : '#F9A8D4';
    ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(modeLabel, w / 2, 231);

    // Center Concentric Signal Rings & Live Progress Arc
    const cx = w / 2;
    const cy = 445;
    const baseRadius = 118;

    // Outer subtle dashed telemetry ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(timeSec * 0.35);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner track ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Animated Progress Arc
    const progressPct = isBuyback ? 0.94 : isBattery ? 0.78 : 0.86;
    const startAngle = -Math.PI / 2 + Math.sin(timeSec * 0.9) * 0.08;
    const endAngle = startAngle + Math.PI * 2 * progressPct;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, startAngle, endAngle);
    ctx.stroke();

    // Center Quote Value inside Arc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.font = '700 17px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(isBuyback ? 'INSTANT PAYOUT' : 'FIXED UK ESTIMATE', cx, cy - 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 44px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(quoteValue || (isBuyback ? 'Up to £620' : 'From £149'), cx, cy + 24);

    ctx.fillStyle = isBuyback ? '#34D399' : '#F472B6';
    ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(quoteMeta || '45 mins express', cx, cy + 56);

    // Animated Telemetry Waveform
    const waveY = 665;
    const waveLeft = 56;
    const waveWidth = w - 112;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const px = waveLeft + t * waveWidth;
      const env = Math.sin(t * Math.PI);
      const py =
        waveY +
        Math.sin(t * 14 - timeSec * 4.2) * 24 * env +
        Math.cos(t * 7 + timeSec * 2.5) * 10 * env;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Bottom 3 Diagnostic Spec Cards
    const specs = isBuyback
      ? [
          ['GRADE', 'A+'],
          ['DATA', 'BLANCCO'],
          ['PAYOUT', 'SAME-DAY'],
        ]
      : isBattery
        ? [
            ['CELL', '100%'],
            ['CYCLES', '0'],
            ['WARRANTY', '12 MO'],
          ]
        : [
            ['PANEL', 'OEM OLED'],
            ['TRUE TONE', 'SYNCED'],
            ['WARRANTY', '12 MO'],
          ];

    const cardW = 132;
    const gap = 16;
    const startX = (w - (cardW * 3 + gap * 2)) / 2;
    specs.forEach(([k, v], idx) => {
      const rx = startX + idx * (cardW + gap);
      const ry = 765;
      drawRoundedRectPath(ctx, rx, ry, cardW, 92, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(k, rx + cardW / 2, ry + 34);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(v, rx + cardW / 2, ry + 66);
    });

    // Bottom Dock Pill
    drawRoundedRectPath(ctx, w / 2 - 76, h - 54, 152, 8, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fill();

    hudTexture.needsUpdate = true;
  };

  // Force immediate crisp draw when props update
  useEffect(() => {
    drawHudCanvas(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, modelName, quoteValue, quoteMeta]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.getElapsedTime();

    // Update Canvas HUD gently at ~18fps (or ~6fps on software WebGL)
    const hudInterval = isSoftwareGl ? 0.18 : 0.055;
    if (elapsed - lastHudDrawRef.current >= hudInterval) {
      drawHudCanvas(elapsed);
      lastHudDrawRef.current = elapsed;
    }

    // Smoothly lerp PBR metallic & accent colors
    if (frameMatRef.current) {
      frameMatRef.current.color.lerp(targetFrameColor.current, 1 - Math.exp(-5.5 * dt));
    }
    if (backGlassMatRef.current) {
      backGlassMatRef.current.color.lerp(targetBackColor.current, 1 - Math.exp(-5.5 * dt));
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.lerp(targetAccentColor.current, 1 - Math.exp(-5.5 * dt));
    }

    // Smooth cursor-follow tilt + idle showcase angle
    const targetTiltY = state.pointer.x * 0.24 + (isExploded ? -0.44 : -0.18);
    const targetTiltX = -state.pointer.y * 0.15 + (isExploded ? 0.14 : 0.06);

    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.y,
        targetTiltY + Math.sin(elapsed * 0.55) * 0.08,
        1 - Math.exp(-5 * dt)
      );
      rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.x,
        targetTiltX,
        1 - Math.exp(-5 * dt)
      );
    }

    // Smooth 360° Buyback Spin
    currentSpinRef.current = THREE.MathUtils.lerp(
      currentSpinRef.current,
      targetSpinAccum.current,
      1 - Math.exp(-4.5 * dt)
    );
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.y = currentSpinRef.current;
    }

    // Exploded View Layer Separation
    const targetExplode = isExploded ? 1 : 0;
    currentExplodeRef.current = THREE.MathUtils.lerp(
      currentExplodeRef.current,
      targetExplode,
      1 - Math.exp(-6 * dt)
    );
    const exp = currentExplodeRef.current;

    if (frontOledGroupRef.current) {
      frontOledGroupRef.current.position.z = exp * 0.52;
    }
    if (logicGroupRef.current) {
      logicGroupRef.current.position.z = exp * 0.16;
    }
    if (batteryGroupRef.current) {
      batteryGroupRef.current.position.z = -exp * 0.16;
    }
    if (rearHousingGroupRef.current) {
      rearHousingGroupRef.current.position.z = -exp * 0.52;
    }

    // Laser Diagnostic Scanlines sweep when exploded
    if (scanlineMeshRef.current && scanlineMesh2Ref.current) {
      const scanActive = exp > 0.08 && serviceType !== 'buyback';
      scanlineMeshRef.current.visible = scanActive;
      scanlineMesh2Ref.current.visible = scanActive;
      if (scanActive) {
        const ySweep = Math.sin(elapsed * 2.4) * 1.25;
        scanlineMeshRef.current.position.y = ySweep;
        scanlineMeshRef.current.position.z = exp * 0.58;
        scanlineMesh2Ref.current.position.y = -ySweep * 0.8;
        scanlineMesh2Ref.current.position.z = -exp * 0.14;
      }
    }

    // Orbiting Emerald Glassmorphic Valuation Rings (Buyback Mode)
    if (orbitRingGroupRef.current && orbitRing1Ref.current && orbitRing2Ref.current) {
      const ringScale = THREE.MathUtils.lerp(
        orbitRingGroupRef.current.scale.x,
        serviceType === 'buyback' ? 1.0 : 0.001,
        1 - Math.exp(-6 * dt)
      );
      orbitRingGroupRef.current.scale.setScalar(ringScale);
      orbitRingGroupRef.current.visible = ringScale > 0.02;
      if (orbitRingGroupRef.current.visible) {
        orbitRing1Ref.current.rotation.z = elapsed * 0.45;
        orbitRing1Ref.current.rotation.x = Math.PI * 0.38 + Math.sin(elapsed * 0.8) * 0.08;
        orbitRing2Ref.current.rotation.z = -elapsed * 0.6;
        orbitRing2Ref.current.rotation.y = Math.PI * 0.25;
      }
    }
  });

  return (
    <Float speed={1.6} rotationIntensity={0.14} floatIntensity={0.28}>
      <group ref={rootGroupRef} position={[0, 0.04, 0]}>
        <group ref={spinGroupRef}>
          {/* LAYER 1: FRONT OLED DISPLAY & CLEARCOAT SAPPHIRE GLASS */}
          <group ref={frontOledGroupRef}>
            {/* High-DPI Dynamic Canvas OLED Display */}
            <mesh geometry={geometries.screenPlaneGeo} position={[0, 0, 0.068]} renderOrder={1}>
              <meshStandardMaterial
                map={hudTexture}
                emissiveMap={hudTexture}
                emissive="#FFFFFF"
                emissiveIntensity={0.42}
                roughness={0.22}
                metalness={0.05}
              />
            </mesh>

            {/* Clearcoat Protective Front Glass */}
            <mesh geometry={geometries.glassPlateGeo} position={[0, 0, 0.078]} renderOrder={2}>
              <meshPhysicalMaterial
                color="#FFFFFF"
                transparent
                opacity={isSoftwareGl ? 0.18 : 0.12}
                roughness={0.04}
                metalness={0.0}
                clearcoat={1}
                clearcoatRoughness={0.04}
                depthWrite={false}
              />
            </mesh>

            {/* Dynamic Island Sensor Capsule */}
            <mesh geometry={geometries.islandGeo} position={[0, 1.24, 0.088]} renderOrder={3}>
              <meshStandardMaterial color="#050608" roughness={0.2} metalness={0.1} />
            </mesh>
          </group>

          {/* LAYER 2: PRECISION LOGIC BOARD + SOC + COPPER MAGSAFE COIL */}
          <group ref={logicGroupRef}>
            <mesh geometry={geometries.pcbGeo} position={[0, 0.72, 0.015]}>
              <meshStandardMaterial color="#112A24" roughness={0.38} metalness={0.42} />
            </mesh>
            {/* Silicon Processor Shield */}
            <mesh geometry={geometries.socGeo} position={[-0.14, 0.75, 0.03]}>
              <meshPhysicalMaterial
                color="#D4AF37"
                metalness={0.92}
                roughness={0.18}
                clearcoat={0.8}
              />
            </mesh>
            {/* Copper Wireless Charging MagSafe Ring */}
            <mesh geometry={geometries.magSafeCoilGeo} position={[0, -0.04, 0.024]}>
              <meshPhysicalMaterial
                color="#D97742"
                metalness={0.95}
                roughness={0.2}
                clearcoat={0.7}
              />
            </mesh>
            <mesh geometry={geometries.magSafeInnerGeo} position={[0, -0.04, 0.024]}>
              <meshStandardMaterial color="#B45309" metalness={0.9} roughness={0.25} />
            </mesh>
          </group>

          {/* LAYER 3: INTERNAL HIGH-DENSITY LITHIUM BATTERY PACK */}
          <group ref={batteryGroupRef}>
            <mesh geometry={geometries.batteryGeo} position={[-0.12, -0.58, -0.01]}>
              <meshStandardMaterial color="#181C24" roughness={0.5} metalness={0.25} />
            </mesh>
            {/* Cell Diagnostic Accent Label */}
            <mesh position={[-0.12, -0.56, 0.019]}>
              <planeGeometry args={[0.52, 0.24]} />
              <meshStandardMaterial
                color={serviceType === 'battery' ? '#E6007E' : '#10B981'}
                emissive={serviceType === 'battery' ? '#E6007E' : '#10B981'}
                emissiveIntensity={0.45}
                roughness={0.3}
              />
            </mesh>
          </group>

          {/* LAYER 4: CHAMFERED TITANIUM UNIBODY FRAME & TRIPLE CAMERA HOUSING */}
          <group ref={rearHousingGroupRef}>
            <mesh geometry={geometries.rearFrameGeo} castShadow receiveShadow>
              <meshPhysicalMaterial
                ref={frameMatRef}
                color="#C2BCB0"
                metalness={0.9}
                roughness={0.15}
                clearcoat={1}
                clearcoatRoughness={0.12}
              />
            </mesh>

            {/* Matte Rear Glass Plate */}
            <mesh
              geometry={geometries.screenPlaneGeo}
              position={[0, 0, -0.079]}
              rotation={[0, Math.PI, 0]}
            >
              <meshPhysicalMaterial
                ref={backGlassMatRef}
                color="#1E222B"
                metalness={0.22}
                roughness={0.28}
                clearcoat={0.85}
                clearcoatRoughness={0.12}
              />
            </mesh>

            {/* Side Titanium Hardware Buttons */}
            <mesh geometry={geometries.buttonGeo} position={[0.78, 0.36, 0]} scale={[1, 1.35, 1]}>
              <meshPhysicalMaterial color="#A3A9B4" metalness={0.92} roughness={0.18} clearcoat={1} />
            </mesh>
            <mesh geometry={geometries.buttonGeo} position={[-0.78, 0.52, 0]}>
              <meshPhysicalMaterial color="#A3A9B4" metalness={0.92} roughness={0.18} clearcoat={1} />
            </mesh>
            <mesh geometry={geometries.buttonGeo} position={[-0.78, 0.16, 0]}>
              <meshPhysicalMaterial color="#A3A9B4" metalness={0.92} roughness={0.18} clearcoat={1} />
            </mesh>

            {/* Raised Pro Triple-Lens Camera Module */}
            <group position={[0.34, 0.98, -0.1]}>
              <mesh geometry={geometries.camBumpGeo}>
                <meshPhysicalMaterial
                  color="#1E222B"
                  metalness={0.4}
                  roughness={0.24}
                  clearcoat={0.9}
                />
              </mesh>
              {[
                [-0.14, 0.15],
                [-0.14, -0.15],
                [0.14, 0.0],
              ].map(([lx, ly], idx) => (
                <group key={idx} position={[lx, ly, -0.025]}>
                  <mesh geometry={geometries.lensRingGeo}>
                    <meshPhysicalMaterial
                      color="#9CA3AF"
                      metalness={0.94}
                      roughness={0.14}
                      clearcoat={1}
                    />
                  </mesh>
                  <mesh geometry={geometries.lensGlassGeo} position={[0, 0, -0.005]}>
                    <meshPhysicalMaterial
                      color="#090D16"
                      metalness={0.15}
                      roughness={0.04}
                      clearcoat={1}
                      clearcoatRoughness={0.04}
                    />
                  </mesh>
                </group>
              ))}
            </group>
          </group>

          {/* LASER DIAGNOSTIC SCANLINES (Active in Exploded Repair Modes) */}
          <mesh ref={scanlineMeshRef} geometry={geometries.scanlineGeo} visible={false}>
            <meshBasicMaterial color="#E6007E" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={scanlineMesh2Ref} geometry={geometries.scanlineGeo} visible={false}>
            <meshBasicMaterial color="#10B981" transparent opacity={0.78} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* ORBITING GLASSMORPHIC BUYBACK RINGS (Emerald Mode) */}
        <group ref={orbitRingGroupRef} visible={false}>
          <mesh ref={orbitRing1Ref} geometry={geometries.orbitRingGeo}>
            <meshPhysicalMaterial
              color="#10B981"
              emissive="#10B981"
              emissiveIntensity={0.45}
              transparent
              opacity={0.72}
              roughness={0.1}
              clearcoat={1}
            />
          </mesh>
          <mesh ref={orbitRing2Ref} geometry={geometries.orbitInnerRingGeo}>
            <meshPhysicalMaterial
              color="#6EE7B7"
              emissive="#10B981"
              emissiveIntensity={0.35}
              transparent
              opacity={0.55}
              roughness={0.15}
              clearcoat={1}
            />
          </mesh>
        </group>

        {/* Reactive Accent Rim Light */}
        <pointLight
          ref={rimLightRef}
          position={[2.1, 1.3, 1.9]}
          intensity={1.7}
          distance={8}
          color="#E6007E"
        />
      </group>
    </Float>
  );
};

export const Hero3DStage: React.FC<Hero3DStageProps> = ({
  serviceType,
  brandId,
  modelId,
  modelName = 'iPhone 15 Pro',
  quoteValue = 'From £149',
  quoteMeta = '45 mins',
  fallbackImage,
  enable3D = true,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isExploded, setIsExploded] = useState<boolean>(serviceType !== 'buyback');

  const webglCaps = useMemo(() => detectWebGLCapabilities(), []);

  // Auto-sync exploded state cleanly whenever Service Type dropdown changes
  useEffect(() => {
    setIsExploded(serviceType === 'screen' || serviceType === 'battery');
  }, [serviceType]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const fallbackNode = (
    <img
      src={fallbackImage}
      alt="Flagship smartphone studio preview"
      className="w-full h-full object-cover object-center"
    />
  );

  if (!enable3D || prefersReducedMotion || !webglCaps.supported) {
    return fallbackNode;
  }

  return (
    <CanvasErrorBoundary fallback={fallbackNode}>
      <div className="relative w-full h-full">
        <div
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          title="Drag to inspect flagship 3D assembly"
        >
          <Canvas
            dpr={webglCaps.isSoftwareGl ? 1 : [1, 2]}
            camera={{ position: [0.35, 0.25, 4.35], fov: 39 }}
            gl={{
              antialias: !webglCaps.isSoftwareGl,
              alpha: true,
              powerPreference: 'high-performance',
            }}
          >
            {/* Zero-network procedural studio environment with Lightformer softboxes */}
            <Environment resolution={256}>
              <group rotation={[-Math.PI / 4, 0, 0]}>
                <Lightformer
                  form="rect"
                  intensity={2.6}
                  color="#FFF9F2"
                  scale={[8, 4, 1]}
                  position={[0, 5, 2]}
                  target={[0, 0, 0]}
                />
                <Lightformer
                  form="rect"
                  intensity={1.9}
                  color="#DCEBFF"
                  scale={[5, 6, 1]}
                  position={[-5, 2, 1]}
                  target={[0, 0, 0]}
                />
                <Lightformer
                  form="rect"
                  intensity={1.6}
                  color={serviceType === 'buyback' ? '#D1FAE5' : '#FCE7F3'}
                  scale={[4, 6, 1]}
                  position={[5, 1, -1]}
                  target={[0, 0, 0]}
                />
              </group>
            </Environment>

            <hemisphereLight args={['#E0EEFF', '#1E293B', 0.9]} />
            <directionalLight position={[3.2, 4.5, 3.8]} intensity={1.5} color="#FFF8EE" />
            <directionalLight position={[-3.2, 2.0, -2.5]} intensity={0.8} color="#DCEBFF" />

            <FlagshipSmartphoneStage
              serviceType={serviceType}
              brandId={brandId}
              modelId={modelId}
              modelName={modelName}
              quoteValue={quoteValue}
              quoteMeta={quoteMeta}
              isExploded={isExploded}
              isSoftwareGl={webglCaps.isSoftwareGl}
            />

            {!webglCaps.isSoftwareGl && (
              <ContactShadows
                position={[0, -1.78, 0]}
                opacity={0.32}
                scale={7.2}
                blur={2.4}
                far={3.6}
                color="#0B0D12"
              />
            )}

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableDamping={!webglCaps.isSoftwareGl}
              dampingFactor={0.07}
              rotateSpeed={0.75}
              minPolarAngle={Math.PI * 0.24}
              maxPolarAngle={Math.PI * 0.68}
            />
          </Canvas>
        </div>

        {/* Sleek Floating Pill Toggle: Exploded View / Assembled View (solid surface, zero backdrop-blur) */}
        <div className="absolute bottom-3 right-3 z-20 inline-flex items-center p-1 rounded-full bg-white border border-slate-200/90 shadow-xs">
          <button
            type="button"
            onClick={() => setIsExploded(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
              isExploded
                ? 'bg-[#E6007E] text-white'
                : 'text-slate-600 hover:text-[#0B0D12]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Exploded</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExploded(false)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
              !isExploded
                ? 'bg-[#0B0D12] text-white'
                : 'text-slate-600 hover:text-[#0B0D12]'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Assembled</span>
          </button>
        </div>
      </div>
    </CanvasErrorBoundary>
  );
};

export default Hero3DStage;
