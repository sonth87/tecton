import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  EDGE_VERTEX_SHADER,
  GHOST_EDGE_FRAGMENT_SHADER,
  PLACED_EDGE_FRAGMENT_SHADER,
  SOLID_FRAGMENT_SHADER,
  SOLID_VERTEX_SHADER,
} from '@/engine/shaders/assemblyShaders';
import {
  computeArchitecturalScale,
  evaluateCameraKeyframes,
  evaluateSectionKeyframes,
  fovToFocalLengthMm,
} from '@/core/math/drawingMath';
import type {
  CameraLiveTelemetry,
  CompiledProjectPackage,
  GpuTelemetry,
  RenderStyle,
} from '@/core/types/project';

export interface ProjectedPoint2D {
  x: number;
  y: number;
  visible: boolean;
}

export interface EngineFrameSnapshot {
  gpu: GpuTelemetry;
  camera: CameraLiveTelemetry;
  sectionEnabled: boolean;
  sectionOffset: number;
  sectionAzimuthDeg: number;
  project3D: (world: [number, number, number]) => ProjectedPoint2D;
}

export type CameraPresetKind = 'ISO' | 'SOUTH' | 'EAST' | 'TOP' | 'INTERIOR';

const RENDER_MODE_TO_FLOAT: Record<RenderStyle, number> = {
  INK_PAINT: 0.0,
  INK: 1.0,
  PAINT: 2.0,
  CLAY: 3.0,
  WIRE: 4.0,
};

/**
 * Framework-agnostic Three.js 3–4 Draw Call Architectural Assembly Engine.
 * Zero React overhead inside the 60Hz loop.
 */
export class AssemblySceneEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private solidMesh: THREE.Mesh | null = null;
  private placedEdgeLines: THREE.LineSegments | null = null;
  private ghostEdgeLines: THREE.LineSegments | null = null;
  private sectionGroundLine: THREE.Line | null = null;

  private solidMaterial: THREE.ShaderMaterial;
  private placedEdgeMaterial: THREE.ShaderMaterial;
  private ghostEdgeMaterial: THREE.ShaderMaterial;

  private currentPackage: CompiledProjectPackage | null = null;
  private thumbnailCache = new Map<string, string[]>();
  private isManualOrbit = false;
  private autoRotateAngleDeg = 0;
  private resolutionScale = 1.5;

  // Live uniform / controller state
  private currentTime = 0;
  private ghostEnabled = true;
  private renderStyle: RenderStyle = 'INK_PAINT';
  private forceColor = false;
  private autoRotate = true;
  private manualSectionOverride: {
    active: boolean;
    azimuthDeg: number;
    offset: number;
  } | null = null;
  private visibleLayerMask = 0xffff;
  private highlightStep = 0;

  // FPS & GPU telemetry
  private frameCounter = 0;
  private fpsAccumTime = 0;
  private currentFps = 60;
  private fpsHistory: number[] = Array(32).fill(60);
  private PresetIndex = 0;

  private tempVec = new THREE.Vector3();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0); // Transparent over CSS drafting paper grid!
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(30, w / h, 0.25, 600);
    this.camera.position.set(28, 18, 32);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 240;

    // Switch seamlessly into Manual Orbit when user drags or zooms with mouse/trackpad
    this.controls.addEventListener('start', () => {
      this.isManualOrbit = true;
    });

    const sharedUniforms = {
      uTime: { value: 0 },
      uWashHeight: { value: -10 },
      uGhostEnabled: { value: 1.0 },
      uRenderMode: { value: 0.0 },
      uForceColor: { value: 0.0 },
      uSectionEnabled: { value: 0.0 },
      uSectionNormalXZ: { value: new THREE.Vector2(1, 0) },
      uSectionOffset: { value: 25.0 },
      uVisibleMask: { value: 65535.0 },
      uHighlightStep: { value: 0.0 },
    };

    this.solidMaterial = new THREE.ShaderMaterial({
      vertexShader: SOLID_VERTEX_SHADER,
      fragmentShader: SOLID_FRAGMENT_SHADER,
      uniforms: sharedUniforms,
      side: THREE.DoubleSide,
    });

    this.placedEdgeMaterial = new THREE.ShaderMaterial({
      vertexShader: EDGE_VERTEX_SHADER,
      fragmentShader: PLACED_EDGE_FRAGMENT_SHADER,
      uniforms: sharedUniforms,
      transparent: true,
      depthWrite: true,
    });

    this.ghostEdgeMaterial = new THREE.ShaderMaterial({
      vertexShader: EDGE_VERTEX_SHADER,
      fragmentShader: GHOST_EDGE_FRAGMENT_SHADER,
      uniforms: sharedUniforms,
      transparent: true,
      depthWrite: false,
    });

    // Subtle crimson dashed section cut indicator line on ground plane (Draw #4 only when Section active!)
    const secGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-14, 0.03, 0),
      new THREE.Vector3(14, 0.03, 0),
    ]);
    const secMat = new THREE.LineBasicMaterial({
      color: 0xbd312b,
      transparent: true,
      opacity: 0.78,
    });
    this.sectionGroundLine = new THREE.Line(secGeom, secMat);
    this.sectionGroundLine.visible = false;
    this.scene.add(this.sectionGroundLine);

    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.updateSize();

    this.resizeObserver = new ResizeObserver(() => this.updateSize());
    this.resizeObserver.observe(container);
  }

  public loadProject(pkg: CompiledProjectPackage): string[] {
    // Remove previous meshes cleanly (do not dispose cached package geometries so re-selecting built-in models is instant!)
    if (this.solidMesh) this.scene.remove(this.solidMesh);
    if (this.placedEdgeLines) this.scene.remove(this.placedEdgeLines);
    if (this.ghostEdgeLines) this.scene.remove(this.ghostEdgeLines);

    this.currentPackage = pkg;

    // Draw Call 1: Batched Solid Mesh
    this.solidMesh = new THREE.Mesh(pkg.triangleGeometry, this.solidMaterial);
    this.solidMesh.frustumCulled = false;
    this.scene.add(this.solidMesh);

    // Draw Call 2: Batched Placed & Active Crease Edges
    this.placedEdgeLines = new THREE.LineSegments(pkg.edgeGeometry, this.placedEdgeMaterial);
    this.placedEdgeLines.frustumCulled = false;
    this.scene.add(this.placedEdgeLines);

    // Draw Call 3: Batched Ghost Wireframe Edges (reuses identical GPU edge buffer!)
    this.ghostEdgeLines = new THREE.LineSegments(pkg.edgeGeometry, this.ghostEdgeMaterial);
    this.ghostEdgeLines.frustumCulled = false;
    this.ghostEdgeLines.renderOrder = 2;
    this.scene.add(this.ghostEdgeLines);

    this.isManualOrbit = false;
    this.autoRotateAngleDeg = 0;

    return this.generateStageThumbnails(pkg);
  }

  /**
   * Renders 8 genuine, ultra-crisp 3D architectural snapshots (with Ink, crimson Ghost wireframe,
   * full Lacquer Paint, and close-up Section A-A cutaway) for the Bottom Stages Storyboard!
   */
  private generateStageThumbnails(pkg: CompiledProjectPackage): string[] {
    const cached = this.thumbnailCache.get(pkg.manifest.id);
    if (cached) return cached;

    const m = pkg.manifest;
    const H = m.totalHeight;
    const halfW = m.footprintHalfExtent;
    const u = this.solidMaterial.uniforms;

    const thumbW = 340;
    const thumbH = 148;
    const thumbCam = new THREE.PerspectiveCamera(26, thumbW / thumbH, 0.2, 500);

    // Save ground line visibility
    const prevSecLine = this.sectionGroundLine?.visible ?? false;
    if (this.sectionGroundLine) this.sectionGroundLine.visible = false;

    this.renderer.setPixelRatio(2);
    this.renderer.setSize(thumbW, thumbH, false);

    const urls: string[] = [];

    for (let i = 0; i < m.stages.length; i++) {
      const st = m.stages[i];
      u.uVisibleMask.value = 65535.0;
      u.uHighlightStep.value = 0.0;
      u.uRenderMode.value = 0.0;

      let azDeg = 228;
      let elDeg = 22;
      let dist = Math.max(halfW * 2.5, H * 0.5);
      let targetY = H * 0.2;
      let fov = 26;

      if (st.phaseKind === 'ASSEMBLY') {
        u.uTime.value = Math.max(0.1, st.endTime - 0.01);
        const showGhost = i < 5;
        u.uGhostEnabled.value = showGhost ? 1.0 : 0.0;
        if (this.ghostEdgeLines) this.ghostEdgeLines.visible = showGhost;
        u.uForceColor.value = 0.0;
        u.uWashHeight.value = -10.0;
        u.uSectionEnabled.value = 0.0;

        if (i === 0) {
          azDeg = 224;
          elDeg = 25;
          targetY = H * 0.085;
          dist = Math.max(halfW * 2.5, H * 0.42);
        } else if (i < 5) {
          const focusRatios = [0.085, 0.16, 0.29, 0.39, 0.49];
          const distRatios = [0.42, 0.67, 0.76, 0.92, 1.08];
          azDeg = 226 + i * 14;
          elDeg = 21 - i * 1.2;
          targetY = H * focusRatios[i];
          dist = Math.max(halfW * (2.6 + i * 0.12), H * distRatios[i]);
        } else {
          // Stage 06: Completed Ink Tower + Spire
          azDeg = 308;
          elDeg = 15;
          targetY = H * 0.49;
          dist = Math.max(halfW * 3.1, H * 1.34);
        }
      } else if (st.phaseKind === 'LACQUER') {
        // Stage 07: Rich Vermilion / Painted Structure
        u.uTime.value = m.paintEndTime;
        u.uGhostEnabled.value = 0.0;
        if (this.ghostEdgeLines) this.ghostEdgeLines.visible = false;
        u.uForceColor.value = 1.0;
        u.uWashHeight.value = H + 10.0;
        u.uSectionEnabled.value = 0.0;

        azDeg = 334;
        elDeg = 14;
        targetY = H * 0.41;
        dist = Math.max(halfW * 2.9, H * 1.26);
      } else {
        // Stage 08: Dramatic Close-up Section A-A Interior Cutaway
        u.uTime.value = m.sequenceDuration - 3.5;
        u.uGhostEnabled.value = 0.0;
        if (this.ghostEdgeLines) this.ghostEdgeLines.visible = false;
        u.uForceColor.value = 1.0;
        u.uWashHeight.value = H + 10.0;
        u.uSectionEnabled.value = 1.0;
        const secRad = (92 * Math.PI) / 180;
        (u.uSectionNormalXZ.value as THREE.Vector2).set(Math.cos(secRad), Math.sin(secRad));
        u.uSectionOffset.value = 0.42;

        azDeg = 90;
        elDeg = 4;
        fov = 38;
        targetY = H * 0.105;
        dist = Math.max(halfW * 1.58, H * 0.26);
      }

      const az = (azDeg * Math.PI) / 180;
      const el = (elDeg * Math.PI) / 180;
      thumbCam.fov = fov;
      thumbCam.updateProjectionMatrix();
      thumbCam.position.set(
        dist * Math.cos(el) * Math.cos(az),
        targetY + dist * Math.sin(el),
        dist * Math.cos(el) * Math.sin(az)
      );
      thumbCam.lookAt(0, targetY, 0);

      this.renderer.render(this.scene, thumbCam);
      urls.push(this.renderer.domElement.toDataURL('image/png'));
    }

    if (this.sectionGroundLine) this.sectionGroundLine.visible = prevSecLine;
    if (this.ghostEdgeLines) this.ghostEdgeLines.visible = this.ghostEnabled;

    // Immediately restore full Retina viewport size before browser paints!
    this.updateSize();

    this.thumbnailCache.set(pkg.manifest.id, urls);
    return urls;
  }

  public setResolutionScale(scale: number): void {
    this.resolutionScale = scale;
    this.updateSize();
  }

  public setManualOrbit(manual: boolean): void {
    this.isManualOrbit = manual;
  }

  public applyCameraPreset(preset?: CameraPresetKind): void {
    if (!this.currentPackage) return;
    const presets: CameraPresetKind[] = ['ISO', 'SOUTH', 'EAST', 'TOP', 'INTERIOR'];
    const chosen = preset ?? presets[this.PresetIndex++ % presets.length];

    const h = this.currentPackage.manifest.totalHeight;
    const baseDist = Math.max(h * 1.32, this.currentPackage.manifest.footprintHalfExtent * 3.0, 18);

    this.isManualOrbit = true;
    switch (chosen) {
      case 'ISO':
        this.setSphericalCamera(228, 20, baseDist, [0, h * 0.42, 0], 30);
        break;
      case 'SOUTH':
        this.setSphericalCamera(95, 8, baseDist * 1.05, [0, h * 0.46, 0], 28);
        break;
      case 'EAST':
        this.setSphericalCamera(5, 10, baseDist * 1.05, [0, h * 0.46, 0], 28);
        break;
      case 'TOP':
        this.setSphericalCamera(180, 78, baseDist * 1.15, [0, 0, 0], 30);
        break;
      case 'INTERIOR':
        this.setSphericalCamera(96, 5, Math.max(9, baseDist * 0.36), [0, h * 0.16, 0], 40);
        break;
    }
  }

  private setSphericalCamera(
    azDeg: number,
    elDeg: number,
    dist: number,
    target: [number, number, number],
    fov: number
  ): void {
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    const cosEl = Math.cos(el);
    this.controls.target.set(target[0], target[1], target[2]);
    this.camera.position.set(
      target[0] + dist * cosEl * Math.cos(az),
      target[1] + dist * Math.sin(el),
      target[2] + dist * cosEl * Math.sin(az)
    );
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.controls.update();
  }

  public syncParameters(params: {
    time: number;
    ghostEnabled: boolean;
    renderStyle: RenderStyle;
    forceColor: boolean;
    autoRotate: boolean;
    manualSectionOverride: { active: boolean; azimuthDeg: number; offset: number } | null;
    visibleLayerMask: number;
    highlightStep: number;
  }): void {
    this.currentTime = params.time;
    this.ghostEnabled = params.ghostEnabled;
    this.renderStyle = params.renderStyle;
    this.forceColor = params.forceColor;
    this.autoRotate = params.autoRotate;
    this.manualSectionOverride = params.manualSectionOverride;
    this.visibleLayerMask = params.visibleLayerMask;
    this.highlightStep = params.highlightStep;
  }

  /**
   * Executes a single 60Hz render tick and returns live GPU & Camera telemetry + 3D->2D projector
   */
  public renderTick(dtSec: number): EngineFrameSnapshot {
    const pkg = this.currentPackage;
    const u = this.solidMaterial.uniforms;

    u.uTime.value = this.currentTime;
    u.uGhostEnabled.value = this.ghostEnabled ? 1.0 : 0.0;
    u.uRenderMode.value = RENDER_MODE_TO_FLOAT[this.renderStyle];
    u.uForceColor.value = this.forceColor ? 1.0 : 0.0;
    u.uVisibleMask.value = this.visibleLayerMask;
    u.uHighlightStep.value = this.highlightStep;

    let secEnabled = false;
    let secAzimuthDeg = 100;
    let secOffset = 20;

    if (pkg) {
      const m = pkg.manifest;
      // Rising Wash Height calculation during Stage 07 (and full height during Stage 08!)
      if (this.currentTime < m.paintStartTime) {
        u.uWashHeight.value = -5.0;
      } else if (this.currentTime <= m.paintEndTime) {
        const pSpan = Math.max(0.1, m.paintEndTime - m.paintStartTime);
        const washU = (this.currentTime - m.paintStartTime) / pSpan;
        u.uWashHeight.value = washU * (m.totalHeight + 2.5);
      } else if (this.currentTime < m.sequenceDuration - 0.55) {
        u.uWashHeight.value = m.totalHeight + 10.0;
      } else {
        // Graceful dissolve back to Ink/Ghost in the final 0.55s loop tail!
        const tailU = (m.sequenceDuration - this.currentTime) / 0.55;
        u.uWashHeight.value = tailU * m.totalHeight;
      }

      // Section Plane evaluation (manual override or scripted Stage 08)
      if (this.manualSectionOverride) {
        secEnabled = this.manualSectionOverride.active;
        secAzimuthDeg = this.manualSectionOverride.azimuthDeg;
        secOffset = this.manualSectionOverride.offset;
      } else {
        const evalSec = evaluateSectionKeyframes(m.sectionKeyframes, this.currentTime);
        secEnabled = evalSec.enabled;
        secAzimuthDeg = evalSec.azimuthDeg;
        secOffset = evalSec.offset;
      }

      u.uSectionEnabled.value = secEnabled ? 1.0 : 0.0;
      const azRad = (secAzimuthDeg * Math.PI) / 180;
      const nx = Math.cos(azRad);
      const nz = Math.sin(azRad);
      (u.uSectionNormalXZ.value as THREE.Vector2).set(nx, nz);
      u.uSectionOffset.value = secOffset;

      // Update ground section line (Draw #4 when Section A-A is active!)
      if (this.sectionGroundLine) {
        this.sectionGroundLine.visible = secEnabled;
        if (secEnabled) {
          const halfSpan = m.footprintHalfExtent * 1.45;
          const tx = -nz;
          const tz = nx;
          const cx = nx * secOffset;
          const cz = nz * secOffset;
          const posAttr = this.sectionGroundLine.geometry.getAttribute('position') as THREE.BufferAttribute;
          posAttr.setXYZ(0, cx - tx * halfSpan, 0.04, cz - tz * halfSpan);
          posAttr.setXYZ(1, cx + tx * halfSpan, 0.04, cz + tz * halfSpan);
          posAttr.needsUpdate = true;
        }
      }

      // Camera Director vs Manual Orbit
      if (!this.isManualOrbit) {
        const kf = evaluateCameraKeyframes(m.cameraKeyframes, this.currentTime);
        if (this.autoRotate && kf.allowAutoRotate) {
          this.autoRotateAngleDeg = (this.autoRotateAngleDeg + dtSec * 7.5) % 360;
        } else if (!kf.allowAutoRotate) {
          // Shortest-path decay towards 0° (not from 350° down through 180°!) so Section A-A stays dead-center!
          let wrapped = ((this.autoRotateAngleDeg % 360) + 360) % 360;
          if (wrapped > 180) wrapped -= 360;
          wrapped *= Math.max(0, 1 - dtSec * 6.0);
          if (Math.abs(wrapped) < 0.15) wrapped = 0;
          this.autoRotateAngleDeg = wrapped;
        }
        this.setSphericalCamera(
          kf.azimuthDeg + this.autoRotateAngleDeg,
          kf.elevationDeg,
          kf.distance,
          kf.target,
          kf.fov
        );
      } else {
        if (this.autoRotate) {
          this.controls.autoRotate = true;
          this.controls.autoRotateSpeed = 1.0;
        } else {
          this.controls.autoRotate = false;
        }
        this.controls.update();
      }
    }

    // Toggle visibility of Ghost pass to save even the 3rd draw call if Ghost is turned off
    if (this.ghostEdgeLines) {
      this.ghostEdgeLines.visible = this.ghostEnabled;
    }

    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);

    // Update FPS sparkline
    this.frameCounter++;
    this.fpsAccumTime += dtSec;
    if (this.fpsAccumTime >= 0.35) {
      this.currentFps = Math.min(60, Math.round(this.frameCounter / this.fpsAccumTime));
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 32) this.fpsHistory.shift();
      this.frameCounter = 0;
      this.fpsAccumTime = 0;
    }

    // Live camera spherical telemetry
    const offsetVec = this.tempVec.copy(this.camera.position).sub(this.controls.target);
    const dist = Math.max(0.1, offsetVec.length());
    const elRad = Math.asin(Math.max(-1, Math.min(1, offsetVec.y / dist)));
    const azRad = Math.atan2(offsetVec.z, offsetVec.x);
    const azDeg = Math.round((((azRad * 180) / Math.PI) + 360) % 360);
    const elDeg = Math.round((elRad * 180) / Math.PI);
    const focalMm = fovToFocalLengthMm(this.camera.fov);
    const { scaleRatio, scaleBarMeters } = computeArchitecturalScale(dist, this.camera.fov);

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    return {
      gpu: {
        fps: this.currentFps,
        fpsHistory: this.fpsHistory,
        drawCalls: this.renderer.info.render.calls,
        triangles: pkg ? pkg.triangleCount : 0,
        edgeSegments: pkg ? pkg.edgeSegmentCount : 0,
        resolutionScale: this.resolutionScale,
      },
      camera: {
        azimuthDeg: azDeg,
        elevationDeg: elDeg,
        focalLengthMm: focalMm,
        scaleRatio,
        scaleBarMeters,
        isManualOrbit: this.isManualOrbit,
      },
      sectionEnabled: secEnabled,
      sectionOffset: secOffset,
      sectionAzimuthDeg: secAzimuthDeg,
      project3D: (world: [number, number, number]): ProjectedPoint2D => {
        this.tempVec.set(world[0], world[1], world[2]);
        this.tempVec.project(this.camera);
        const visible = this.tempVec.z >= -1 && this.tempVec.z <= 1;
        return {
          x: (this.tempVec.x * 0.5 + 0.5) * w,
          y: (-this.tempVec.y * 0.5 + 0.5) * h,
          visible,
        };
      },
    };
  }

  public updateSize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(Math.min(3, baseDpr * (this.resolutionScale / 1.5)));
    // Pass updateStyle = true so CSS width/height always match container w x h on Retina displays!
    this.renderer.setSize(w, h, true);
  }

  public dispose(): void {
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.solidMaterial.dispose();
    this.placedEdgeMaterial.dispose();
    this.ghostEdgeMaterial.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
