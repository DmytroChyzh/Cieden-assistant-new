"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type WelcomeRobotProps = {
  modelUrl: string;
  className?: string;
};

export function WelcomeRobot({ modelUrl, className }: WelcomeRobotProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setLoadError(false);
    setRenderError(false);
    setModelReady(false);

    let frameId = 0;
    let disposed = false;
    let robotRoot: THREE.Object3D | null = null;
    let baseScale = 1;
    let normalizedModelSize = new THREE.Vector3(1, 1, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.18, 4.8);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("WelcomeRobot renderer init failed", error);
      setRenderError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x9fb6ff, 0x120a24, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xd8e4ff, 1.8);
    keyLight.position.set(2.5, 3.5, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6f7dff, 1.1);
    rimLight.position.set(-3, 1.5, -2);
    scene.add(rimLight);

    const updateSize = () => {
      const width = mount.clientWidth || 360;
      const height = mount.clientHeight || 240;
      // Keep CSS canvas size and drawing buffer in sync across HiDPI browsers.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, true);
      camera.aspect = width / height;

      if (robotRoot) {
        // Keep scaling continuous (no breakpoint jumps) for more consistent
        // cross-platform framing (Windows/macOS/iOS).
        const widthScale = THREE.MathUtils.clamp(width / 340, 0.84, 1);
        const finalScale = baseScale * widthScale;
        robotRoot.scale.setScalar(finalScale);

        const scaledWidth = Math.max(0.0001, normalizedModelSize.x * finalScale);
        const scaledHeight = Math.max(0.0001, normalizedModelSize.y * finalScale);

        // Device-independent camera fitting by object bounds + viewport aspect.
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const fillY = 0.6;
        const fillX = 0.72;
        const distByHeight = scaledHeight / (2 * Math.tan(vFov / 2) * fillY);
        const distByWidth = scaledWidth / (2 * Math.tan(hFov / 2) * fillX);
        const cameraZ = Math.max(distByHeight, distByWidth) + 0.68;
        const cameraY = scaledHeight * 0.055;
        camera.position.set(0, cameraY, cameraZ);

        // Keep deterministic center on all platforms and preserve visual baseline.
        robotRoot.position.x = 0;
        robotRoot.position.y = -(scaledHeight * 0.078);
      }
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    updateSize();

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        robotRoot = gltf.scene;
        robotRoot.updateMatrixWorld(true);
        robotRoot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).castShadow = false;
            (obj as THREE.Mesh).receiveShadow = false;
          }
        });

        // Use mesh-only bounds for stable visual centering across browsers/devices.
        const meshBounds = new THREE.Box3();
        let hasMeshBounds = false;
        robotRoot.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh || !mesh.geometry) return;
          if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox();
          }
          const bb = mesh.geometry.boundingBox;
          if (!bb) return;
          const worldBB = bb.clone().applyMatrix4(mesh.matrixWorld);
          if (!hasMeshBounds) {
            meshBounds.copy(worldBB);
            hasMeshBounds = true;
          } else {
            meshBounds.union(worldBB);
          }
        });

        const bounds = hasMeshBounds
          ? meshBounds
          : new THREE.Box3().setFromObject(robotRoot);
        const center = bounds.getCenter(new THREE.Vector3());
        robotRoot.position.sub(center);

        const size = bounds.getSize(new THREE.Vector3());
        normalizedModelSize = size.clone();
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const containerWidth = mount.clientWidth || 360;
        const target = 2.0;
        baseScale = target / maxDim;
        robotRoot.scale.setScalar(baseScale);
        robotRoot.position.set(0, 0, 0);

        scene.add(robotRoot);
        setModelReady(true);
        updateSize();
      },
      undefined,
      () => {
        if (!disposed) {
          setLoadError(true);
        }
      },
    );

    const animate = () => {
      if (disposed) return;
      frameId = window.requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(mount);
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);
    window.visualViewport?.addEventListener("resize", updateSize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
      window.visualViewport?.removeEventListener("resize", updateSize);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [modelUrl]);

  return (
    <div
      className={className ?? "w-full max-w-[900px] mx-auto"}
      aria-label="Welcome robot preview"
    >
      <div className="relative mx-auto w-full max-w-[340px] aspect-[16/10]">
        <div
          ref={mountRef}
          className="h-full w-full bg-transparent"
        />
        {(renderError || loadError || !modelReady) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-white/70">
              {renderError
                ? "Robot preview unavailable on this device"
                : loadError
                  ? "Robot model failed to load"
                  : "Loading robot preview..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
