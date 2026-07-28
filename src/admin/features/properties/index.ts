// ================================================================
// ADMIN PROPERTIES FEATURE
// ================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from '../../../supabase.ts';
import { CONFIG } from '../../../config.ts';
import { uploadToCloudinary, validateImageFile } from '../../../cloudinary.ts';
import { showToast, formatPrice } from '../../shared/utils.ts';
import { loadMLSyncLog } from '../mercadoLibre/index.ts';
import Cropper from 'cropperjs';

interface Property {
  id: number;
  titulo: string;
  precio: number;
  moneda: string;
  operacion: 'venta' | 'alquiler';
  ubicacion: string;
  tipo: string;
  habitaciones: number;
  banos: number;
  m2: number;
  antiguedad: string;
  destacado: boolean;
  caracteristicas: string[];
  descripcion: string;
  imagenes: Array<{ url: string; cloudinary_public_id: string; orden: number; es_principal: boolean }>;
  imagen_principal: string | null;
  galeria: string[];
  seo_titulo?: string;
  seo_descripcion?: string;
  seo_keywords?: string;
  seo_og_image?: string;
  seo_schema?: object;
  ml_enabled?: boolean;
  ml_item_id?: string;
  ml_status?: string;
  ml_last_sync?: string;
  created_at?: string;
  updated_at?: string;
}

let propertiesCache: Property[] = [];
const agentsCache: any[] = [];
const selectedPropertyIds = new Set<number>();
let editingPropertyId: number | null = null;
let uploadedPropertyImages: File[] = [];
let cropperInstance: any = null;

async function loadProperties(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*, imagenes(url, cloudinary_public_id, orden, es_principal)')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Error de permisos (RLS): Verifica que la service_role key esté configurada en Edge Functions');
      }
      throw error;
    }
    propertiesCache = (data || []).map((p: any) => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find((i: any) => i.es_principal)?.url || null,
      galeria: p.imagenes?.sort((a: any, b: any) => a.orden - b.orden).map((i: any) => i.url) || []
    }));

    updatePropertyStats();
    renderPropertiesTable();
    updateNavBadges();
  } catch (e: unknown) {
    console.error('Error loading properties:', e);
    const msg = e instanceof Error && (e.message.includes('RLS') || e.message.includes('42501'))
      ? 'Error de permisos (RLS): Configura service_role key en Edge Functions'
      : 'Error cargando propiedades';
    showToast(msg, 'error');
  }
}

function updatePropertyStats(): void {
  const total = propertiesCache.length;

  document.getElementById('statProperties')!.textContent = String(total);
  document.getElementById('statAgents')!.textContent = String(agentsCache.filter(a => a.activo).length);
  document.getElementById('propTrend')!.innerHTML = '<i class="fas fa-arrow-up"></i> —';
  document.getElementById('propTrend')!.className = 'stat-trend';
}

function updateNavBadges(): void {
  document.getElementById('propCountBadge')!.textContent = String(propertiesCache.length);
  document.getElementById('agentCountBadge')!.textContent = String(agentsCache.filter(a => a.activo).length);
}

function renderPropertiesTable(filter = ''): void {
  const tbody = document.getElementById('propertiesTableBody');
  if (!tbody) return;
  let filtered = propertiesCache;

  if (filter) {
    const f = filter.toLowerCase();
    filtered = propertiesCache.filter(p =>
      p.titulo.toLowerCase().includes(f) ||
      p.ubicacion.toLowerCase().includes(f)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay propiedades</td></tr>';
    return;
  }

  renderTableHeader();

  tbody.innerHTML = filtered.map(p => `
    <tr data-id="${p.id}">
      <td>
        <input type="checkbox" class="row-checkbox" value="${p.id}" ${selectedPropertyIds.has(p.id) ? 'checked' : ''}>
      </td>
      <td>
        <img src="${p.imagen_principal || 'https://via.placeholder.com/80x60?text=Sin+imagen'}"
             alt="${p.titulo}" style="width: 60px; height: 45px; object-fit: cover; border-radius: var(--radius);">
      </td>
      <td><strong>${p.titulo}</strong></td>
      <td>${p.ubicacion}</td>
      <td><span class="badge badge-${p.operacion === 'venta' ? 'sale' : 'rent'}">${p.operacion === 'venta' ? 'Venta' : 'Alquiler'}</span></td>
      <td>${formatPrice(p.precio, p.moneda || 'ARS', p.operacion)}</td>
      <td><span class="badge badge-${p.destacado ? 'featured' : 'active'}">${p.destacado ? 'Destacada' : 'Normal'}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="editProperty(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="action-btn" onclick="cloneProperty(${p.id})" title="Clonar"><i class="fas fa-copy"></i></button>
          <button class="action-btn delete" onclick="confirmDelete('property', ${p.id}, '${p.titulo.replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  attachRowCheckboxListeners();
  initColumnResizing();
}

function renderTableHeader(): void {
  const thead = document.querySelector('#section-properties table thead');
  if (!thead) return;

  thead.innerHTML = `
    <tr>
      <th data-col-index="0" style="width: 48px;">
        <input type="checkbox" id="selectAllProperties" aria-label="Seleccionar todas las propiedades">
        <div class="resize-handle" data-col-index="0"></div>
      </th>
      <th data-col-index="1">Imagen <div class="resize-handle" data-col-index="1"></div></th>
      <th data-col-index="2">Título <div class="resize-handle" data-col-index="2"></div></th>
      <th data-col-index="3">Ubicación <div class="resize-handle" data-col-index="3"></div></th>
      <th data-col-index="4">Operación <div class="resize-handle" data-col-index="4"></div></th>
      <th data-col-index="5">Precio <div class="resize-handle" data-col-index="5"></div></th>
      <th data-col-index="6">Estado <div class="resize-handle" data-col-index="6"></div></th>
      <th data-col-index="7" style="width: 120px;">Acciones <div class="resize-handle" data-col-index="7"></div></th>
    </tr>
  `;

  const selectAll = document.getElementById('selectAllProperties');
  if (selectAll) {
    selectAll.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const checked = target.checked;
      document.querySelectorAll('.row-checkbox').forEach(cb => {
        const checkbox = cb as HTMLInputElement;
        checkbox.checked = checked;
        const id = parseInt(checkbox.value, 10);
        if (checked) {
          selectedPropertyIds.add(id);
        } else {
          selectedPropertyIds.delete(id);
        }
      });
      updateBulkActionsBar();
    });
  }
}

function attachRowCheckboxListeners(): void {
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    (cb as HTMLInputElement).addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const id = parseInt(target.value, 10);
      if (target.checked) {
        selectedPropertyIds.add(id);
      } else {
        selectedPropertyIds.delete(id);
      }
      updateSelectAllCheckbox();
      updateBulkActionsBar();
    });
  });
}

function updateSelectAllCheckbox(): void {
  const selectAll = document.getElementById('selectAllProperties') as HTMLInputElement;
  if (!selectAll) return;
  const checkboxes = document.querySelectorAll('.row-checkbox');
  const checkedCount = selectedPropertyIds.size;
  selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
  selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

function filterProperties(): void {
  const search = document.getElementById('searchProperties')!.value;
  const status = document.getElementById('filterPropertyStatus')!.value;

  let filtered = propertiesCache;
  if (search) {
    const f = search.toLowerCase();
    filtered = filtered.filter(p => p.titulo.toLowerCase().includes(f) || p.ubicacion.toLowerCase().includes(f));
  }
  if (status) {
    filtered = filtered.filter(p => status === 'featured' ? p.destacado : !p.destacado);
  }
  renderPropertiesTable(search);
}

const columnWidths: Record<number, number> = {};

function initColumnResizing(): void {
  const ths = document.querySelectorAll('#section-properties table thead th');
  ths.forEach((th) => {
    const handle = th.querySelector('.resize-handle');
    if (!handle) return;

    (handle as HTMLElement).addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = (th as HTMLElement).offsetWidth;

      function onMouseMove(e: MouseEvent) {
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth >= 40) {
          (th as HTMLElement).style.width = newWidth + 'px';
          (th as HTMLElement).style.minWidth = newWidth + 'px';
          (th as HTMLElement).style.maxWidth = newWidth + 'px';
          columnWidths[Array.from((th.parentElement as HTMLElement).children).indexOf(th)] = newWidth;

          const colIndex = Array.from((th.parentElement as HTMLElement).children).indexOf(th);
          document.querySelectorAll(`#propertiesTableBody tr td:nth-child(${colIndex + 1})`).forEach(td => {
            (td as HTMLElement).style.width = newWidth + 'px';
            (td as HTMLElement).style.minWidth = newWidth + 'px';
            (td as HTMLElement).style.maxWidth = newWidth + 'px';
          });
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
  });
}

function initStickyTableHeader(): void {
  const tableContainer = document.querySelector('.table-container');
  if (!tableContainer) return;

  const thead = document.querySelector('#section-properties table thead');
  if (!thead) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        thead.classList.add('sticky-header');
      } else {
        thead.classList.remove('sticky-header');
      }
    }, {
      root: document.querySelector('.table-container'),
      threshold: 0
    });

  observer.observe(document.querySelector('.table-container')!);
}

function initTableEnhancements(): void {
  initStickyTableHeader();
}

export { initTableEnhancements };

// ================================================================
// BULK ACTIONS BAR
// ================================================================
function updateBulkActionsBar(): void {
  const bar = document.getElementById('bulkActionsBar');
  const count = selectedPropertyIds.size;

  if (count === 0) {
    if (bar) bar.style.display = 'none';
    return;
  }

  if (!bar) {
    createBulkActionsBar();
  } else {
    bar.style.display = 'flex';
    bar.querySelector('.bulk-count')!.textContent = `${selectedPropertyIds.size} seleccionad${selectedPropertyIds.size === 1 ? 'a' : 'os'}`;
  }
}

function createBulkActionsBar(): void {
  const section = document.getElementById('section-properties');
  if (!section) return;

  const tableContainer = section.querySelector('.table-container');
  if (!tableContainer) return;

  const bar = document.createElement('div');
  bar.id = 'bulkActionsBar';
  bar.className = 'bulk-actions-bar';
  bar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 20px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius) var(--radius) 0 0;
    margin-bottom: -1px;
    z-index: 10;
    box-shadow: var(--shadow-md);
  `;

  bar.innerHTML = `
    <span class="bulk-count">${selectedPropertyIds.size} seleccionad${selectedPropertyIds.size === 1 ? 'a' : 'os'}</span>
    <div class="bulk-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button type="button" class="btn-bulk btn-bulk-primary" onclick="bulkActionProperties('publish')">
        <i class="fas fa-eye"></i> Publicar
      </button>
      <button type="button" class="btn-bulk btn-bulk-secondary" onclick="bulkActionProperties('unpublish')">
        <i class="fas fa-eye-slash"></i> Despublicar
      </button>
      <button type="button" class="btn-bulk btn-bulk-primary" onclick="bulkActionProperties('feature')">
        <i class="fas fa-star"></i> Destacar
      </button>
      <button type="button" class="btn-bulk btn-bulk-secondary" onclick="bulkActionProperties('unfeature')">
        <i class="fas fa-star-o"></i> Quitar Destacado
      </button>
      <button type="button" class="btn-bulk btn-bulk-secondary" onclick="bulkActionProperties('changeOperation')">
        <i class="fas fa-exchange-alt"></i> Cambiar Operación
      </button>
      <button type="button" class="btn-bulk btn-bulk-danger" onclick="bulkActionProperties('delete')">
        <i class="fas fa-trash"></i> Eliminar
      </button>
      <button type="button" class="btn-bulk btn-bulk-secondary" onclick="clearSelection()">
        <i class="fas fa-times"></i> Cancelar
      </button>
    </div>
  `;

  const tableContainer2 = document.querySelector('#section-properties .table-container');
  if (tableContainer2) {
    tableContainer2.parentNode!.insertBefore(bar, tableContainer2);
  }

  if (!document.getElementById('bulk-actions-styles')) {
    const style = document.createElement('style');
    style.id = 'bulk-actions-styles';
    style.textContent = `
      .bulk-btn { padding: 8px 16px; border: none; border-radius: var(--radius); font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: var(--transition); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
      .bulk-btn:not(.btn-bulk-secondary) { background: white; color: var(--primary); }
      .bulk-btn:not(.btn-bulk-secondary):hover { background: var(--gray-100); }
      .bulk-btn.bulk-btn-danger { background: var(--danger); color: white; }
      .bulk-btn.bulk-btn-danger:hover { background: #b91c1c; }
      .bulk-btn.bulk-btn-secondary { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); }
      .bulk-btn.bulk-btn-secondary:hover { background: rgba(255,255,255,0.3); }
      @media (max-width: 768px) {
        #bulkActionsBar { flex-direction: column; align-items: stretch; }
        .bulk-actions { justify-content: center; }
      }
    `;
    document.head.appendChild(style);
  }
}

async function bulkAction(action: string, data = {}): Promise<void> {
  const ids = Array.from(selectedPropertyIds);
  if (ids.length === 0) return;

  try {
    const { error } = await supabase
      .from('propiedades')
      .update({ ...data, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;

    showToast(`${ids.length} propiedad${ids.length === 1 ? '' : 'es'} ${getActionPastTense(action)}`, 'success');
    clearSelection();
    await loadProperties();
  } catch (e: unknown) {
    console.error(`Bulk ${action} error:`, e);
    showToast(`Error al ${getActionInfinitive(action)}: ${e instanceof Error ? e.message : 'Error desconocido'}`, 'error');
  }
}

function getActionPastTense(action: string): string {
  const tenses: Record<string, string> = {
    publish: 'publicada', unpublish: 'despublicada',
    feature: 'destacada', unfeature: 'no destacada',
    changeOperation: 'cambiada de operación', delete: 'eliminada'
  };
  return tenses[action] || 'actualizada';
}

function getActionInfinitive(action: string): string {
  const infinitives: Record<string, string> = {
    publish: 'publicar', unpublish: 'despublicar',
    feature: 'destacar', unfeature: 'quitar destacado',
    changeOperation: 'cambiar operación', delete: 'eliminar'
  };
  return infinitives[action] || 'realizar acción';
}

async function bulkPublish(): Promise<void> {
  const ids = Array.from(selectedPropertyIds);
  if (ids.length === 0) return;

  await bulkAction('publish', { ml_status: 'published', ml_last_sync: new Date().toISOString() });

  for (const id of ids) {
    try {
      await supabase.functions.invoke('ml-publish', { body: { propertyId: id, action: 'publish' } });
    } catch (_e) {
      console.warn(`ML publish failed for property ${id}:`, _e);
    }
  }

  await loadProperties();
  await loadMLSyncLog();
}

async function bulkUnpublish(): Promise<void> {
  const ids = Array.from(selectedPropertyIds);
  if (ids.length === 0) return;

  await bulkAction('unpublish', { ml_status: 'draft', ml_last_sync: new Date().toISOString() });

  for (const id of ids) {
    try {
      await supabase.functions.invoke('ml-publish', { body: { propertyId: id, action: 'unpublish' } });
    } catch (_e) {
      console.warn(`ML unpublish failed for property ${id}:`, _e);
    }
  }

  await loadProperties();
  await loadMLSyncLog();
}

async function bulkFeature(): Promise<void> { await bulkAction('feature', { destacado: true }); }
async function bulkUnfeature(): Promise<void> { await bulkAction('unfeature', { destacado: false }); }
async function bulkChangeOperation(operacion: string): Promise<void> { await bulkAction('changeOperation', { operacion }); }

async function bulkDelete(): Promise<void> {
  if (!confirm(`¿Eliminar ${selectedPropertyIds.size} propiedad${selectedPropertyIds.size === 1 ? '' : 'es'}? Esta acción no se puede deshacer.`)) return;

  const ids = Array.from(selectedPropertyIds);
  try {
    const { data: images } = await supabase
      .from('imagenes')
      .select('cloudinary_public_id')
      .in('propiedad_id', ids);

    if (images?.length) {
      for (const img of images) {
        if (img.cloudinary_public_id) {
          // TODO: Delete from Cloudinary via signed request
        }
      }
    }

    const { error } = await supabase
      .from('propiedades')
      .delete()
      .in('id', ids);

    if (error) throw error;

    showToast(`${ids.length} propiedad${ids.length === 1 ? '' : 'es'} eliminada${ids.length === 1 ? '' : 's'}`, 'success');
    clearSelection();
    await loadProperties();
  } catch (e: unknown) {
    console.error('Bulk delete error:', e);
    showToast(`Error al eliminar: ${e instanceof Error ? e.message : 'Error desconocido'}`, 'error');
  }
}

function clearSelection(): void {
  selectedPropertyIds.clear();
  document.querySelectorAll('.row-checkbox').forEach(cb => (cb as HTMLInputElement).checked = false);
  const selectAll = document.getElementById('selectAllProperties') as HTMLInputElement;
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
  updateBulkActionsBar();
  renderPropertiesTable();
}

// ================================================================
// MODALS - PROPIEDADES
// ================================================================
function openPropertyModal(property: Property | null = null): void {
  editingPropertyId = property?.id || null;
  uploadedPropertyImages = [];

  const modal = document.getElementById('propertyModal');
  const title = document.getElementById('propertyModalTitle');
  const form = document.getElementById('propertyForm') as HTMLFormElement;

  form?.reset();
  document.getElementById('propImagesPreview')!.innerHTML = '';

  modal?.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  modal?.querySelectorAll('.modal-tabpanel').forEach(p => p.classList.remove('active'));
  modal?.querySelector('.modal-tab[data-tab="basic"]')?.classList.add('active');
  modal?.querySelector('#panel-basic')?.classList.add('active');

  if (property) {
    title!.textContent = 'Editar Propiedad';
    document.getElementById('propTitle')!.value = property.titulo || '';
    document.getElementById('propPrice')!.value = String(property.precio || '');
    document.getElementById('propCurrency')!.value = property.moneda || 'ARS';
    document.getElementById('propOperation')!.value = property.operacion || 'venta';
    document.getElementById('propLocation')!.value = property.ubicacion || '';
    document.getElementById('propType')!.value = property.tipo || 'piso';
    document.getElementById('propRooms')!.value = String(property.habitaciones || '');
    document.getElementById('propBaths')!.value = String(property.banos || '');
    document.getElementById('propM2')!.value = String(property.m2 || '');
    document.getElementById('propAge')!.value = property.antiguedad || 'reformado';
    document.getElementById('propFeatured')!.checked = property.destacado || false;
    document.getElementById('propFeatures')!.value = (property.caracteristicas || []).join(', ');
    document.getElementById('propDescription')!.value = property.descripcion || '';

    document.getElementById('propSeoTitle')!.value = property.seo_titulo || '';
    document.getElementById('propSeoDesc')!.value = property.seo_descripcion || '';
    document.getElementById('propSeoKeywords')!.value = property.seo_keywords || '';
    document.getElementById('propSeoOgImage')!.value = property.seo_og_image || '';
    try {
      document.getElementById('propSeoSchema')!.value = property.seo_schema ? JSON.stringify(property.seo_schema, null, 2) : '';
    } catch {}

    document.getElementById('propMlEnabled')!.checked = property.ml_enabled || false;
    document.getElementById('propMlItemId')!.value = property.ml_item_id || '';
    document.getElementById('propMlStatus')!.value = property.ml_status || 'draft';
    document.getElementById('propMlLastSync')!.value = property.ml_last_sync ? new Date(property.ml_last_sync).toLocaleString('es-AR') : 'Nunca sincronizada';

    const mlConnected = document.getElementById('btnConnectML')?.style.display !== 'none';
    document.getElementById('btnSyncPropertyML')!.style.display = mlConnected && property.ml_item_id ? 'inline-flex' : 'none';
    document.getElementById('btnPublishPropertyML')!.style.display = mlConnected && !property.ml_item_id ? 'inline-flex' : 'none';

    if (property.imagenes?.length) {
      const preview = document.getElementById('propImagesPreview')!;
      property.imagenes.sort((a: any, b: any) => a.orden - b.orden).forEach((img: any, i: number) => {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:var(--radius);overflow:hidden;border:2px solid var(--gray-200);' + (i===0?'border-color:var(--accent);':'');
        div.innerHTML = `<img src="${img.url}" style="width:100%;height:100%;object-fit:cover;"><span style="position:absolute;top:2px;right:2px;background:var(--gray-900);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">${i+1}</span>`;
        preview.appendChild(div);
      });
    }
  } else {
    title!.textContent = 'Nueva Propiedad';
    document.getElementById('btnSyncPropertyML')!.style.display = 'none';
    document.getElementById('btnPublishPropertyML')!.style.display = 'none';
  }

  document.getElementById('propertyModal')!.classList.add('active');
}

function closePropertyModal(): void {
  document.getElementById('propertyModal')!.classList.remove('active');
  editingPropertyId = null;
  uploadedPropertyImages = [];
  const preview = document.getElementById('propImagesPreview');
  const fileInput = document.getElementById('propImages') as HTMLInputElement;
  if (preview) preview.innerHTML = '';
  if (fileInput) fileInput.value = '';
}

function setupImageUploads(): void {
  const propUpload = document.getElementById('propImageUpload');
  const propInput = document.getElementById('propImages') as HTMLInputElement;

  if (propUpload && propInput) {
    propInput.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;z-index:10;';
    propUpload.style.position = 'relative';

    propUpload.addEventListener('dragover', e => { e.preventDefault(); propUpload.classList.add('dragover'); });
    propUpload.addEventListener('dragleave', () => propUpload.classList.remove('dragover'));
    propUpload.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      propUpload.classList.remove('dragover');
      if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files, 'property');
    });
    propInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) handleFiles(target.files, 'property');
    });
  }

  const agentUpload = document.getElementById('agentAvatarUpload');
  const agentInput = document.getElementById('agentAvatar') as HTMLInputElement;

  if (agentUpload && agentInput) {
    agentInput.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;z-index:10;';
    agentUpload.style.position = 'relative';

    agentUpload.addEventListener('dragover', e => { e.preventDefault(); agentUpload.classList.add('dragover'); });
    agentUpload.addEventListener('dragleave', () => agentUpload.classList.remove('dragover'));
    agentUpload.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      agentUpload.classList.remove('dragover');
      if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files, 'agent');
    });
    agentInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) handleFiles(target.files, 'agent');
    });
  }
}

function handleFiles(files: FileList, type: 'property' | 'agent'): void {
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) return;

  if (type === 'property') {
    const remaining = 15 - uploadedPropertyImages.length;
    const toAdd = validFiles.slice(0, remaining);
    uploadedPropertyImages.push(...toAdd);
    renderPropertyImagePreviews();
  } else if (type === 'agent') {
    const file = validFiles[0];
    const preview = document.getElementById('agentAvatarPreview');
    const url = URL.createObjectURL(file);
    preview!.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
    preview!.style.background = 'none';
  }
}

function renderPropertyImagePreviews(): void {
  const preview = document.getElementById('propImagesPreview');
  if (!preview) return;
  preview.innerHTML = '';
  uploadedPropertyImages.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.draggable = true;
    div.dataset.index = String(i);
    div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:var(--radius);overflow:hidden;border:2px solid var(--gray-200);cursor:grab;' + (i===0?'border-color:var(--accent);':'');
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" data-index="${i}"><span style="position:absolute;top:2px;right:2px;background:var(--gray-900);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">${i+1}</span><button type="button" class="remove-img" data-index="${i}" style="position:absolute;bottom:2px;right:2px;background:rgba(220,38,38,0.9);color:white;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.7rem;">×</button><button type="button" class="edit-img" data-index="${i}" style="position:absolute;bottom:2px;left:2px;background:rgba(31,110,212,0.9);color:white;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.7rem;" title="Editar"><i class="fas fa-crop"></i></button>`;
    preview.appendChild(div);
  });

  let draggedIndex = -1;
  preview.querySelectorAll('[draggable]').forEach(el => {
    const element = el as HTMLElement;
    element.addEventListener('dragstart', (e: DragEvent) => {
      draggedIndex = parseInt(element.dataset.index!, 10);
      element.style.opacity = '0.5';
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    element.addEventListener('dragend', () => {
      element.style.opacity = '1';
    });
    element.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    element.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      const targetEl = (e.currentTarget as HTMLElement).closest('[draggable]') as HTMLElement | null;
      const targetIndex = parseInt(targetEl?.dataset.index || '-1', 10);
      if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        const [removed] = uploadedPropertyImages.splice(draggedIndex, 1);
        uploadedPropertyImages.splice(targetIndex, 0, removed);
        renderPropertyImagePreviews();
      }
    });

    const removeBtn = element.querySelector('.remove-img') as HTMLElement | null;
    removeBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.index!, 10);
      uploadedPropertyImages.splice(idx, 1);
      renderPropertyImagePreviews();
    });

    const editBtn = element.querySelector('.edit-img') as HTMLElement | null;
    editBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.index!, 10);
      openImageEditor(idx);
    });

    const imgEl = element.querySelector('img') as HTMLElement | null;
    imgEl?.addEventListener('click', (e: MouseEvent) => {
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.index!, 10);
      openImageEditor(idx);
    });
  });
}

async function saveProperty(e: Event): Promise<void> {
  e.preventDefault();

  const btn = document.getElementById('savePropertyBtn') as HTMLButtonElement;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  try {
    const titulo = (document.getElementById('propTitle') as HTMLInputElement).value.trim();
    const precio = parseFloat((document.getElementById('propPrice') as HTMLInputElement).value);
    const moneda = (document.getElementById('propCurrency') as HTMLSelectElement).value;
    const operacion = (document.getElementById('propOperation') as HTMLSelectElement).value;
    const ubicacion = (document.getElementById('propLocation') as HTMLInputElement).value.trim();
    const tipo = (document.getElementById('propType') as HTMLSelectElement).value;
    const habitaciones = parseInt((document.getElementById('propRooms') as HTMLInputElement).value, 10) || 0;
    const banos = parseInt((document.getElementById('propBaths') as HTMLInputElement).value, 10) || 0;
    const m2 = parseInt((document.getElementById('propM2') as HTMLInputElement).value, 10) || 0;
    const antiguedad = (document.getElementById('propAge') as HTMLSelectElement).value;
    const destacado = (document.getElementById('propFeatured') as HTMLInputElement).checked;
    const caracteristicas = (document.getElementById('propFeatures') as HTMLTextAreaElement).value.split(',').map(c => c.trim()).filter(c => c);
    const descripcion = (document.getElementById('propDescription') as HTMLTextAreaElement).value.trim();
    const files = (document.getElementById('propImages') as HTMLInputElement).files || new FileList();

    const seoTitle = (document.getElementById('propSeoTitle') as HTMLInputElement)?.value.trim() || '';
    const seoDescription = (document.getElementById('propSeoDesc') as HTMLTextAreaElement)?.value.trim() || '';
    const seoKeywords = (document.getElementById('propSeoKeywords') as HTMLInputElement)?.value.trim() || '';
    const seoOgImage = (document.getElementById('propSeoOgImage') as HTMLInputElement)?.value.trim() || '';
    let seoSchema = null;
    try {
      const schemaVal = (document.getElementById('propSeoSchema') as HTMLTextAreaElement)?.value.trim();
      if (schemaVal) seoSchema = JSON.parse(schemaVal);
    } catch {}

    const mlEnabled = (document.getElementById('propMlEnabled') as HTMLInputElement)?.checked || false;
    const mlItemId = (document.getElementById('propMlItemId') as HTMLInputElement)?.value.trim() || null;
    const mlStatus = (document.getElementById('propMlStatus') as HTMLSelectElement)?.value || 'draft';

    const errors = [];
    if (!titulo) errors.push('Título es requerido');
    if (!precio || precio <= 0) errors.push('Precio debe ser un número mayor a 0');
    if (!ubicacion) errors.push('Ubicación es requerida');
    if (!['ARS', 'USD'].includes(moneda)) errors.push('Moneda inválida');
    if (!['venta', 'alquiler'].includes(operacion)) errors.push('Operación inválida');
    if (!['piso', 'chalet', 'atico', 'local', 'terreno'].includes(tipo)) errors.push('Tipo de propiedad inválido');
    if (habitaciones < 0 || habitaciones > 20) errors.push('Habitaciones debe estar entre 0 y 20');
    if (banos < 0 || banos > 20) errors.push('Baños debe estar entre 0 y 20');
    if (m2 < 0 || m2 > 10000) errors.push('Metros cuadrados debe estar entre 0 y 10000');
    if (!['nuevo', 'reformado', 'viejo'].includes(antiguedad)) errors.push('Antigüedad inválida');
    if (files.length > 15) errors.push('Máximo 15 imágenes permitidas');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
        errors.push(`Archivo ${file.name}: solo JPG, PNG, WebP permitidos`);
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`Archivo ${file.name}: máximo 10MB`);
      }
    }

    if (errors.length > 0) {
      showToast(errors.join('\n'), 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      return;
    }

    const datos = {
      titulo, precio, moneda, operacion, ubicacion, tipo, habitaciones, banos, m2, antiguedad, destacado, caracteristicas, descripcion,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
      seo_og_image: seoOgImage,
      seo_schema: seoSchema,
      ml_enabled: mlEnabled,
      ml_item_id: mlItemId,
      ml_status: mlStatus
    };

    if (editingPropertyId) {
      const { error } = await supabase.from('propiedades').update(datos).eq('id', editingPropertyId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('propiedades').insert([datos]).select();
      if (error) throw error;
      editingPropertyId = data[0].id;
    }

    if (mlEnabled && mlStatus === 'publish') {
      try {
        const { error: mlError } = await supabase.functions.invoke('ml-publish', { body: { propertyId: editingPropertyId, action: 'publish' } });
        if (!mlError) {
          showToast('Propiedad publicada en MercadoLibre', 'success');
        }
      } catch (mlErr) {
        console.warn('ML auto-publish failed:', mlErr);
      }
    }

    if (files.length > 0) {
      const imagenesData = [];
      const maxImagenes = Math.min(files.length, 15);
      for (let i = 0; i < maxImagenes; i++) {
        validateImageFile(files[i]);
        const folder = `inmoconecta/propiedades/${editingPropertyId}`;
        const img = await uploadToCloudinary(files[i], folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_PROPS);
        imagenesData.push({
          propiedad_id: editingPropertyId,
          url: img.url,
          cloudinary_public_id: img.public_id,
          orden: i,
          es_principal: i === 0
        });
      }
      if (imagenesData.length > 0) {
        const { error: imgError } = await supabase.from('imagenes').insert(imagenesData);
        if (imgError) throw imgError;
      }
    }

    showToast(`Propiedad ${editingPropertyId ? 'actualizada' : 'creada'} correctamente`, 'success');
    closePropertyModal();
    await loadProperties();
  } catch (e: unknown) {
    console.error('saveProperty error:', e);
    showToast(`Error: ${e instanceof Error ? e.message : 'Error al guardar propiedad'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  }
}

// ================================================================
// IMAGE EDITOR (CROPPER)
// ================================================================
function openImageEditor(index: number): void {
  const file = uploadedPropertyImages[index];
  if (!file) return;

  const url = URL.createObjectURL(file);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;z-index:2000;';
  modal.innerHTML = `
    <div class="modal" style="max-width:90vw;max-height:90vh;width:800px;">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--gray-200);">
        <h3 class="modal-title" style="margin:0;">Editar Imagen</h3>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-secondary" id="cropRotateLeft"><i class="fas fa-undo"></i> Rotar izq</button>
          <button type="button" class="btn-secondary" id="cropRotateRight"><i class="fas fa-redo"></i> Rotar der</button>
          <button type="button" class="btn-secondary" id="cropFlipH"><i class="fas fa-arrows-alt-h"></i> Voltear H</button>
          <button type="button" class="btn-secondary" id="cropFlipV"><i class="fas fa-arrows-alt-v"></i> Voltear V</button>
          <button type="button" class="btn-secondary" id="cropReset"><i class="fas fa-history"></i> Reset</button>
          <button type="button" class="modal-close" style="margin-left:8px;">&times;</button>
        </div>
      </div>
      <div class="modal-body" style="padding:24px;max-height:60vh;overflow:auto;text-align:center;">
        <div style="max-width:100%;max-height:50vh;margin:0 auto;">
          <img id="cropperImage" src="${url}" alt="Editor de imagen" style="max-width:100%;max-height:50vh;">
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--gray-200);display:flex;justify-content:flex-end;gap:12px;">
        <button type="button" class="btn-secondary" id="cropCancel">Cancelar</button>
        <button type="button" class="btn-primary" id="cropApply"><i class="fas fa-check"></i> Aplicar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const image = modal.querySelector('#cropperImage') as HTMLImageElement;
  cropperInstance = new Cropper(image, {
    aspectRatio: NaN,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    responsive: true,
    restore: true,
    guides: true,
    center: true,
    highlight: true,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: true,
  });

  modal.querySelector('#cropRotateLeft')?.addEventListener('click', () => cropperInstance?.rotate(-90));
  modal.querySelector('#cropRotateRight')?.addEventListener('click', () => cropperInstance?.rotate(90));
  modal.querySelector('#cropFlipH')?.addEventListener('click', () => {
    const data = cropperInstance!.getData();
    cropperInstance!.scaleX(-data.scaleX);
  });
  modal.querySelector('#cropFlipV')?.addEventListener('click', () => {
    const data = cropperInstance!.getData();
    cropperInstance!.scaleY(-data.scaleY);
  });
  modal.querySelector('#cropReset')?.addEventListener('click', () => cropperInstance?.reset());

  const closeModal = () => {
    cropperInstance?.destroy();
    cropperInstance = null;
    modal.remove();
  };

  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cropCancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  modal.querySelector('#cropApply')?.addEventListener('click', async () => {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: 1920,
      maxHeight: 1080,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) return;

      let finalBlob = blob;
      if (blob.size > 1024 * 1024) {
        canvas.toBlob((compressed: Blob | null) => {
          finalBlob = compressed || blob;
          replaceImage(index, finalBlob);
        }, 'image/jpeg', 0.85);
      } else {
        replaceImage(index, blob);
      }

      closeModal();
    }, 'image/jpeg', 0.92);
  });
}

function replaceImage(index: number, blob: Blob): void {
  const newFile = new File([blob], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' });
  uploadedPropertyImages[index] = newFile;
  renderPropertyImagePreviews();
}

// ================================================================
// EXPORTS
// ================================================================
export function editProperty(id: number): void {
  const prop = propertiesCache.find(p => p.id === id);
  if (prop) openPropertyModal(prop);
}

export function cloneProperty(id: number): void {
  const prop = propertiesCache.find(p => p.id === id);
  if (prop) {
    const { id: _, created_at, updated_at, ml_item_id, ml_status, ml_last_sync, ml_enabled, imagenes, ...cloneData } = prop;
    // Remove fields that should not be cloned
    const clone: Partial<Property> = {
      ...cloneData,
      titulo: `${cloneData.titulo} (Copia)`,
      ml_item_id: undefined,
      ml_status: undefined,
      ml_last_sync: undefined,
      ml_enabled: undefined,
      imagenes: [],
      imagen_principal: null,
      galeria: []
    };
    openPropertyModal(clone as Property);
  }
}

(window as any).editProperty = editProperty;
(window as any).cloneProperty = cloneProperty;

(window as any).confirmDelete = (type: string, id: number, name: string) => confirmDelete(type, id, name);

(window as any).filterProperties = filterProperties;
(window as any).filterAgents = filterAgents;

export function bulkActionProperties(action: string, data?: any): void {
  bulkAction(action, data);
}

(window as any).bulkActionProperties = bulkActionProperties;
(window as any).bulkPublish = bulkPublish;
(window as any).bulkUnpublish = bulkUnpublish;
(window as any).bulkFeature = bulkFeature;
(window as any).bulkUnfeature = bulkUnfeature;
(window as any).bulkChangeOperation = bulkChangeOperation;
(window as any).bulkDelete = bulkDelete;
(window as any).clearBulkSelection = clearSelection;

function filterAgents(): void {
  // Will be overridden by agents module
}

function confirmDelete(type: string, _id: number, name: string): void {
  if (confirm(`¿Eliminar ${type === 'property' ? 'propiedad' : 'agente'} "${name}"? Esta acción no se puede deshacer.`)) {
    if (type === 'property') {
      bulkDelete();
    }
  }
}

export {
  propertiesCache,
  loadProperties,
  openPropertyModal,
  closePropertyModal,
  saveProperty,
  filterProperties,
  clearSelection,
  setupImageUploads,
};