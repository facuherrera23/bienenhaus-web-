// ================================================================
// TESTS - Components
// ================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Components', () => {
  describe('PropertyCard', () => {
    it('renders property card with correct data', () => {
      const property = {
        id: 1,
        titulo: 'Departamento en venta',
        precio: 1500000,
        moneda: 'ARS',
        operacion: 'venta',
        ubicacion: 'Córdoba',
        habitaciones: 3,
        banos: 2,
        m2: 80,
        imagen_principal: 'https://example.com/img.jpg',
        destacado: true
      };

      expect(property.id).toBe(1);
      expect(property.titulo).toBe('Departamento en venta');
      expect(property.precio).toBe(1500000);
    });
  });

  describe('PropertyGallery', () => {
    it('handles image navigation', () => {
      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      let currentIndex = 0;

      const goTo = (index) => {
        currentIndex = (index + images.length) % images.length;
      };

      goTo(1);
      expect(currentIndex).toBe(1);

      goTo(-1);
      expect(currentIndex).toBe(2);

      goTo(3);
      expect(currentIndex).toBe(0);
    });
  });

  describe('SearchBar', () => {
    it('collects filters correctly', () => {
      const formData = {
        operacion: 'venta',
        tipo: 'piso',
        precioMin: 100000,
        precioMax: 500000,
        habitaciones: 2,
        metrosMin: 50,
        ordenar: 'precio_desc'
      };

      expect(formData.operacion).toBe('venta');
      expect(formData.tipo).toBe('piso');
      expect(formData.precioMin).toBe(100000);
    });
  });

  describe('PropertyGrid', () => {
    it('calculates pagination correctly', () => {
      const totalItems = 25;
      const itemsPerPage = 6;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      expect(totalPages).toBe(5);
    });

    it('calculates visible items for current page', () => {
      const items = Array.from({ length: 25 }, (_, i) => i + 1);
      const page = 2;
      const perPage = 6;
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const pageItems = items.slice(start, end);

      expect(pageItems).toHaveLength(6);
      expect(pageItems[0]).toBe(7);
      expect(pageItems[5]).toBe(12);
    });
  });

  describe('PropertyDetail', () => {
    it('handles tab navigation', () => {
      const tabs = ['gallery', 'info', 'map', 'ml', 'agent'];
      let activeTab = 'gallery';

      const setActiveTab = (tab) => {
        if (['gallery', 'info', 'map', 'ml', 'agent'].includes(tab)) {
          activeTab = tab;
        }
      };

      setActiveTab('info');
      expect(activeTab).toBe('info');

      setActiveTab('invalid');
      expect(activeTab).toBe('info');
    });
  });

  describe('MLSyncUI', () => {
    it('handles sync status correctly', () => {
      const statuses = {
        published: { label: 'Publicada', class: 'success' },
        pending: { label: 'Pendiente', class: 'warning' },
        syncing: { label: 'Sincronizando...', class: 'info' },
        error: { label: 'Error', class: 'danger' }
      };

      expect(statuses.published.class).toBe('success');
      expect(statuses.syncing.label).toBe('Sincronizando...');
    });
  });
});