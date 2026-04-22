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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let frameId = 0;
    let disposed = false;
    let robotRoot: THREE.Object3D | null = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.18, 4.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
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
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep composition stable across small phones and compact laptop widths.
      if (width < 330) {
        camera.position.set(0, 0.12, 5.25);
      } else if (width < 520) {
        camera.position.set(0, 0.15, 5.0);
      } else {
        camera.position.set(0, 0.18, 4.8);
      }
      camera.updateProjectionMatrix();
    };

    updateSize();

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        robotRoot = gltf.scene;
        robotRoot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).castShadow = false;
            (obj as THREE.Mesh).receiveShadow = false;
          }
        });

        const bounds = new THREE.Box3().setFromObject(robotRoot);
        const center = bounds.getCenter(new THREE.Vector3());
        robotRoot.position.sub(center);

        const size = bounds.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const containerWidth = mount.clientWidth || 360;
        const target =
          containerWidth < 330 ? 1.78 : containerWidth < 520 ? 1.95 : 2.25;
        const scale = target / maxDim;
        robotRoot.scale.setScalar(scale);
        robotRoot.position.y = containerWidth < 330 ? -0.13 : -0.18;

        scene.add(robotRoot);
      },
      undefined,
      () => {
        if (!disposed) setLoadError(true);
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

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
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
      <div className="relative mx-auto w-full max-w-[300px] h-[140px] sm:max-w-[340px] sm:h-[180px] md:max-w-[360px] md:h-[220px]">
        <div
          ref={mountRef}
          className="h-full w-full bg-transparent"
        />
        {loadError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/60">
            Robot model failed to load
          </div>
        )}
      </div>
    </div>
  );
}
