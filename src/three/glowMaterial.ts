/**
 * Nocturne — Materiales Signal
 *
 * Materials are now returned by factory functions so each scene mount owns its
 * own material instances. Module-level singletons caused disposed materials to
 * be reused on remount (black geometry after toggling reducedMotion / saveData).
 */
import { MeshBasicMaterial, Color, MeshStandardMaterial, MeshPhysicalMaterial, DoubleSide } from 'three';

export function createSignalGlowMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color('#20B8AB'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
}

export function createSignalGlowStrongMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color('#5FD7CD'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
}

export function createConcreteMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color('#1c1f21'),
    roughness: 0.9,
    metalness: 0.05,
  });
}

export function createGlassMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color('#16181a'),
    transparent: true,
    opacity: 0.15,
    roughness: 0,
    metalness: 0.1,
    side: DoubleSide,
    transmission: 0.9,
    thickness: 0.5,
  });
}

export function createWaterMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color('#20B8AB'),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
}

export function createGardenLightMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color('#20B8AB'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
}
