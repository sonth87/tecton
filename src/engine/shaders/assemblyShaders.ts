/**
 * Custom 3-Pass Architectural GLSL Shaders:
 * Pass 1: Batched Solid Mesh (Ink & Paper AO, Lowering Coral Wash, Rising Paint Brush Wave, Section A-A Poché Hatch)
 * Pass 2: Batched Placed & Active Crease Edges (Sumi Ink #2B241E + Active Crimson #D6362E)
 * Pass 3: Batched Ghost Wireframe Silhouette (depthWrite: false, Cinnabar Red alpha 0.20)
 */

export const SOLID_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aBaseColor;
  attribute vec4 aAnimParams; // x: startTime, y: duration, z: dropHeight, w: stepIndex
  attribute vec2 aMetaParams; // x: layerBit, y: matType

  uniform float uTime;
  uniform float uVisibleMask;

  varying vec3 vWorldPos;
  varying vec3 vRestWorldPos;
  varying vec3 vNormal;
  varying vec3 vBaseColor;
  varying float vProgress;
  varying float vStepIndex;
  varying float vMatType;
  varying float vLayerVisible;

  float easeOutCubic(float x) {
    float t = clamp(x, 0.0, 1.0);
    return 1.0 - pow(1.0 - t, 3.0);
  }

  void main() {
    float startTime = aAnimParams.x;
    float duration = max(aAnimParams.y, 0.001);
    float dropHeight = aAnimParams.z;
    vStepIndex = aAnimParams.w;

    float layerIdx = floor(aMetaParams.x + 0.5);
    float bitVal = pow(2.0, layerIdx);
    vLayerVisible = mod(floor(uVisibleMask / bitVal), 2.0);

    float rawP = (uTime - startTime) / duration;
    vProgress = clamp(rawP, 0.0, 1.0);

    vec3 restPos = position;
    vRestWorldPos = (modelMatrix * vec4(restPos, 1.0)).xyz;

    float lift = 0.0;
    if (rawP > 0.0 && rawP < 1.0) {
      lift = (1.0 - easeOutCubic(vProgress)) * dropHeight;
    }

    vec3 displaced = restPos + vec3(0.0, lift, 0.0);
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);

    vWorldPos = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vBaseColor = aBaseColor;
    vMatType = aMetaParams.y;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const SOLID_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uWashHeight;
  uniform float uRenderMode;       // 0: INK_PAINT, 1: INK, 2: PAINT, 3: CLAY, 4: WIRE
  uniform float uForceColor;       // 1.0 when user toggles COLOUR [C]
  uniform float uSectionEnabled;   // 1.0 when Section A-A is active
  uniform vec2 uSectionNormalXZ;   // Normalized XZ cut normal
  uniform float uSectionOffset;    // Signed offset in meters
  uniform float uHighlightStep;    // >0 when user hovers/selects a step in BOM Explorer

  varying vec3 vWorldPos;
  varying vec3 vRestWorldPos;
  varying vec3 vNormal;
  varying vec3 vBaseColor;
  varying float vProgress;
  varying float vStepIndex;
  varying float vMatType;
  varying float vLayerVisible;

  // Lightweight spatial hash noise for organic watercolor/lacquer brush wave edge
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    if (vLayerVisible < 0.5) discard;
    if (uRenderMode > 3.5) discard; // Pure Wireframe mode hides solid triangles
    if (vProgress <= 0.0001) discard; // Unplaced parts handled cleanly by Ghost Edge Pass

    // Live 3D Section A-A Clipping Plane
    if (uSectionEnabled > 0.5) {
      float cutDist = dot(vWorldPos.xz, uSectionNormalXZ) - uSectionOffset;
      if (cutDist > 0.0) discard;
    }

    // Cross-section interior backface poché hatch when Section A-A slices through solids!
    if (uSectionEnabled > 0.5 && !gl_FrontFacing) {
      float hatch = mod(gl_FragCoord.x + gl_FragCoord.y, 7.0);
      vec3 pocheBase = vec3(0.34, 0.11, 0.09);
      vec3 pocheLine = vec3(0.58, 0.22, 0.18);
      vec3 pocheCol = hatch < 1.6 ? pocheLine : pocheBase;
      gl_FragColor = vec4(pocheCol, 1.0);
      return;
    }

    // Active Lowering Member (< 1.0): Coral/Vermilion Translucent Highlight
    if (vProgress < 0.999) {
      vec3 activeTint = vec3(0.86, 0.24, 0.20);
      vec3 paperMix = mix(vec3(0.98, 0.94, 0.92), activeTint, 0.52);
      gl_FragColor = vec4(paperMix, 1.0);
      return;
    }

    // Selected/Hovered Step in BOM Explorer
    if (uHighlightStep > 0.5 && abs(vStepIndex - uHighlightStep) < 0.25) {
      float pulse = 0.78 + 0.22 * sin(uTime * 10.0);
      gl_FragColor = vec4(vec3(0.84, 0.20, 0.17) * pulse + vec3(0.15, 0.03, 0.02), 1.0);
      return;
    }

    // Directional Architectural Sun + Warm Ground Bounce Lighting
    vec3 n = normalize(vNormal);
    vec3 sunDir = normalize(vec3(0.58, 0.76, 0.30));
    vec3 fillDir = normalize(vec3(-0.45, 0.35, -0.65));
    float ndl = max(dot(n, sunDir), 0.0);
    float fill = max(dot(n, fillDir), 0.0);
    float upOcclusion = 0.5 + 0.5 * n.y;

    // Ink & Paper Surface Color (warm vellum paper with subtle architectural shading)
    vec3 inkPaperColor = vec3(0.982, 0.965, 0.940) * (0.86 + 0.14 * ndl + 0.04 * upOcclusion);

    // Clay Mode
    if (uRenderMode > 2.5 && uRenderMode < 3.5) {
      vec3 clay = vec3(0.93, 0.90, 0.85) * (0.62 + 0.34 * ndl + 0.12 * fill);
      gl_FragColor = vec4(clay, 1.0);
      return;
    }

    // Painted Material Surface Color
    float lightTerm = 0.50 + 0.44 * ndl + 0.14 * fill;
    if (vMatType > 4.5) {
      // Gilt gold / glass accent sheen
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfVec = normalize(sunDir + viewDir);
      float spec = pow(max(dot(n, halfVec), 0.0), 24.0);
      lightTerm += spec * 0.45;
    }
    vec3 paintedColor = vBaseColor * lightTerm;

    // Determine Ink vs Paint blend
    float paintFactor = 0.0;
    if (uForceColor > 0.5 || (uRenderMode > 1.5 && uRenderMode < 2.5)) {
      paintFactor = 1.0;
    } else if (uRenderMode < 0.5) {
      // INK_PAINT mode: Rising wash wave along Y!
      float brushNoise = (hash21(floor(vRestWorldPos.xz * 6.0)) - 0.5) * 0.45;
      float waveY = vRestWorldPos.y + brushNoise;
      paintFactor = 1.0 - smoothstep(uWashHeight - 0.55, uWashHeight + 0.25, waveY);

      // Subtle glowing cinnabar brush rim right at the rising wash front!
      float rimBand = smoothstep(uWashHeight - 0.75, uWashHeight - 0.15, waveY) *
                      (1.0 - smoothstep(uWashHeight - 0.15, uWashHeight + 0.35, waveY));
      if (uWashHeight > 0.05 && uWashHeight < 999.0) {
        paintedColor = mix(paintedColor, vec3(0.82, 0.19, 0.16), rimBand * 0.55);
      }
    }

    vec3 finalCol = mix(inkPaperColor, paintedColor, paintFactor);
    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export const EDGE_VERTEX_SHADER = /* glsl */ `
  attribute vec4 aAnimParams; // x: startTime, y: duration, z: dropHeight, w: stepIndex
  attribute vec2 aMetaParams; // x: layerBit, y: matType

  uniform float uTime;
  uniform float uVisibleMask;

  varying vec3 vWorldPos;
  varying vec3 vRestWorldPos;
  varying float vRawProgress;
  varying float vProgress;
  varying float vStepIndex;
  varying float vLayerVisible;

  float easeOutCubic(float x) {
    float t = clamp(x, 0.0, 1.0);
    return 1.0 - pow(1.0 - t, 3.0);
  }

  void main() {
    float startTime = aAnimParams.x;
    float duration = max(aAnimParams.y, 0.001);
    float dropHeight = aAnimParams.z;
    vStepIndex = aAnimParams.w;

    float layerIdx = floor(aMetaParams.x + 0.5);
    float bitVal = pow(2.0, layerIdx);
    vLayerVisible = mod(floor(uVisibleMask / bitVal), 2.0);

    vRawProgress = (uTime - startTime) / duration;
    vProgress = clamp(vRawProgress, 0.0, 1.0);

    vRestWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    float lift = 0.0;
    if (vRawProgress > 0.0 && vRawProgress < 1.0) {
      lift = (1.0 - easeOutCubic(vProgress)) * dropHeight;
    }

    vec4 worldPosition = modelMatrix * vec4(position + vec3(0.0, lift, 0.0), 1.0);
    vWorldPos = worldPosition.xyz;

    // Slight depth bias towards camera so crisp ink edges never z-fight with coplanar polygons
    vec4 mvPos = viewMatrix * worldPosition;
    mvPos.z += 0.015;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const PLACED_EDGE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uWashHeight;
  uniform float uRenderMode;
  uniform float uForceColor;
  uniform float uSectionEnabled;
  uniform vec2 uSectionNormalXZ;
  uniform float uSectionOffset;
  uniform float uHighlightStep;

  varying vec3 vWorldPos;
  varying vec3 vRestWorldPos;
  varying float vRawProgress;
  varying float vProgress;
  varying float vStepIndex;
  varying float vLayerVisible;

  void main() {
    if (vLayerVisible < 0.5) discard;
    if (vRawProgress <= 0.0) discard;

    if (uSectionEnabled > 0.5) {
      float cutDist = dot(vWorldPos.xz, uSectionNormalXZ) - uSectionOffset;
      if (cutDist > 0.0) discard;
    }

    // Active Lowering Edge: Bright Crimson #D6362E
    if (vProgress < 0.999) {
      gl_FragColor = vec4(0.839, 0.212, 0.180, 0.95);
      return;
    }

    if (uHighlightStep > 0.5 && abs(vStepIndex - uHighlightStep) < 0.25) {
      gl_FragColor = vec4(0.95, 0.25, 0.20, 1.0);
      return;
    }

    // Sumi Ink Edge (#261E18), slightly softened when painted so painted materials look rich
    float painted = 0.0;
    if (uForceColor > 0.5 || (uRenderMode > 1.5 && uRenderMode < 2.5)) {
      painted = 1.0;
    } else if (uRenderMode < 0.5) {
      painted = 1.0 - smoothstep(uWashHeight - 0.3, uWashHeight + 0.2, vRestWorldPos.y);
    }

    vec3 sumiInk = vec3(0.15, 0.115, 0.09);
    vec3 paintedEdge = vec3(0.12, 0.06, 0.05);
    float alpha = mix(0.86, 0.42, painted);
    gl_FragColor = vec4(mix(sumiInk, paintedEdge, painted), alpha);
  }
`;

export const GHOST_EDGE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uGhostEnabled;
  uniform float uSectionEnabled;
  uniform vec2 uSectionNormalXZ;
  uniform float uSectionOffset;

  varying vec3 vWorldPos;
  varying float vRawProgress;
  varying float vLayerVisible;

  void main() {
    if (vLayerVisible < 0.5) discard;
    if (uGhostEnabled < 0.5) discard;
    if (vRawProgress > 0.0) discard; // Only future unplaced parts!

    if (uSectionEnabled > 0.5) {
      float cutDist = dot(vWorldPos.xz, uSectionNormalXZ) - uSectionOffset;
      if (cutDist > 0.0) discard;
    }

    // Delicate Cinnabar Blueprint Ghost Wireframe
    gl_FragColor = vec4(0.776, 0.204, 0.180, 0.20);
  }
`;
