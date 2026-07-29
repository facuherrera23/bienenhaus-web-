/**
 * Nocturne — Materiales Emissive Signal
 * Solo las superficies con este material disparan el bloom (threshold alto).
 */
import { MeshBasicMaterial, Color, MeshStandardMaterial, MeshPhysicalMaterial, DoubleSide } from 'three';

export const signalGlowMaterial = new MeshBasicMaterial({
  color: new Color('#2ee6c5'),
  transparent: true,
  opacity: 1,
  depthWrite: false,
});

export const signalGlowStrongMaterial = new MeshBasicMaterial({
  color: new Color('#2ee6c5'),
  transparent: true,
  opacity: 1,
  depthWrite: false,
});

export const concreteMaterial = new MeshStandardMaterial({
  color: new Color('#1c1f21'),
  roughness: 0.9,
  metalness: 0.05,
});

export const glassMaterial = new MeshPhysicalMaterial({
  color: new Color('#16181a'),
  transparent: true,
  opacity: 0.15,
  roughness: 0,
  metalness: 0.1,
  side: DoubleSide,
  transmission: 0.9,
  thickness: 0.5,
});

export const waterMaterial = new MeshBasicMaterial({
  color: new Color('#2ee6c5'),
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
});

export const gardenLightMaterial = new MeshBasicMaterial({
  color: new Color('#2ee6c5'),
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});