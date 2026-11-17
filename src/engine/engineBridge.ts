import type { AssemblySceneEngine, CameraPresetKind } from '@/engine/AssemblyEngine';

class EngineControllerBridge {
  private engine: AssemblySceneEngine | null = null;

  public attach(engine: AssemblySceneEngine | null): void {
    this.engine = engine;
  }

  public getEngine(): AssemblySceneEngine | null {
    return this.engine;
  }

  public cycleCameraPreset(preset?: CameraPresetKind): void {
    this.engine?.applyCameraPreset(preset);
  }

  public returnToDirectorCam(): void {
    this.engine?.setManualOrbit(false);
  }
}

export const engineBridge = new EngineControllerBridge();
