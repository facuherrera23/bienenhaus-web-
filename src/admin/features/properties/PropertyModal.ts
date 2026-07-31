// ================================================================
// PROPERTY MODAL - Admin Feature Module
// Property CRUD modal with tabs: Basic, Details, ML, Images
// ================================================================

const PROPERTY_MODAL_HTML = `
<div class="modal-overlay" id="propertyModal" role="dialog" aria-modal="true" aria-labelledby="propertyModalTitle" hidden>
  <div class="modal" role="document">
    <header class="modal-header">
      <h3 id="propertyModalTitle">Nueva Propiedad</h3>
      <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
    </header>
    <form class="modal-form" id="propertyForm">
      <input type="hidden" name="id" id="propertyId">
      <div class="form-tabs" role="tablist">
        <button role="tab" class="tab-btn active" data-tab="basic" aria-selected="true">Datos Básicos</button>
        <button role="tab" class="tab-btn" data-tab="details" aria-selected="false">Detalles</button>
        <button role="tab" class="tab-btn" data-tab="ml" aria-selected="false">MercadoLibre</button>
        <button role="tab" class="tab-btn" data-tab="images" aria-selected="false">Imágenes</button>
      </div>
      <div class="tab-panels">
        <div role="tabpanel" class="tab-panel active" id="tab-basic">
          <div class="form-row">
            <div class="form-group">
              <label for="propTitle">Título *</label>
              <input type="text" id="propTitle" name="titulo" required>
            </div>
            <div class="form-group">
              <label for="propType">Tipo *</label>
              <select id="propType" name="tipo" required>
                <option value="casa">Casa</option>
                <option value="departamento">Departamento</option>
                <option value="terreno">Terreno</option>
                <option value="local">Local Comercial</option>
                <option value="oficina">Oficina</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="propOperation">Operación *</label>
              <select id="propOperation" name="operacion" required>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
            </div>
            <div class="form-group">
              <label for="propPrice">Precio *</label>
              <input type="number" id="propPrice" name="precio" step="1000" min="0" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="propCurrency">Moneda</label>
              <select id="propCurrency" name="moneda">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="propDescription">Descripción</label>
            <textarea id="propDescription" name="descripcion" rows="4"></textarea>
          </div>
          <div class="form-group">
            <label for="propLocation">Ubicación *</label>
            <input type="text" id="propLocation" name="ubicacion" required placeholder="Ej: Cerro de las Rosas, Córdoba">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="propLat">Latitud</label>
              <input type="number" id="propLat" name="latitud" step="0.000001">
            </div>
            <div class="form-group">
              <label for="propLng">Longitud</label>
              <input type="number" id="propLng" name="longitud" step="0.000001">
            </div>
          </div>
        </div>
        <div role="tabpanel" class="tab-panel" id="tab-details" hidden>
          <div class="form-row">
            <div class="form-group">
              <label for="propBedrooms">Dormitorios</label>
              <input type="number" id="propBedrooms" name="dormitorios" min="0" value="0">
            </div>
            <div class="form-group">
              <label for="propBathrooms">Baños</label>
              <input type="number" id="propBathrooms" name="banos" min="0" value="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="propGarage">Cocheras</label>
              <input type="number" id="propGarage" name="cochera" min="0" value="0">
            </div>
            <div class="form-group">
              <label for="propSurface">Superficie (m²)</label>
              <input type="number" id="propSurface" name="superficie" min="0" step="0.1">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="propSurfaceCovered">Superficie Cubierta (m²)</label>
              <input type="number" id="propSurfaceCovered" name="superficie_cubierta" min="0" step="0.1">
            </div>
            <div class="form-group">
              <label for="propAntiquity">Antigüedad (años)</label>
              <input type="number" id="propAntiquity" name="antiguedad" min="0">
            </div>
          </div>
          <div class="form-group">
            <label for="propFeatures">Características (separadas por comas)</label>
            <input type="text" id="propFeatures" name="caracteristicas" placeholder="Pileta, Quincho, Aire acondicionado, ...">
          </div>
        </div>
        <div role="tabpanel" class="tab-panel" id="tab-ml" hidden>
          <div class="ml-sync-options">
            <h4>Sincronización con MercadoLibre</h4>
            <div class="checkbox-group">
              <label><input type="checkbox" name="ml_enabled" value="1"> Publicar en MercadoLibre</label>
              <label><input type="checkbox" name="ml_auto_sync" value="1"> Sincronizar automáticamente</label>
            </div>
            <div class="form-group">
              <label for="mlCategory">Categoría ML</label>
              <input type="text" id="mlCategory" name="ml_categoria" placeholder="MLA1459 (ej: Casas en venta)">
            </div>
          </div>
        </div>
        <div role="tabpanel" class="tab-panel" id="tab-images" hidden>
          <div class="image-upload-area" id="imageUploadArea">
            <input type="file" id="propImages" name="images" accept="image/jpeg,image/png,image/webp" multiple hidden>
            <div class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
              <small>Formatos: JPG, PNG, WebP. Máx 10MB cada una.</            </div>
            <div class="image-previews" id="imagePreviews"></div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel-property">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Propiedad</button>
      </div>
    </form>
  </div>
</div>`;

let propertyModalContainer: HTMLElement | null = null;

export function initPropertyModal(): void {
  if (document.getElementById('propertyModal')) return;
  
  const container = document.createElement('div');
  container.innerHTML = PROPERTY_MODAL_HTML;
  document.body.appendChild(container.firstElementChild!);
  
  bindPropertyModalEvents();
}

function bindPropertyModalEvents(): void {
  const modal = document.getElementById('propertyModal')!;
  const form = document.getElementById('propertyForm') as HTMLFormElement;
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('[data-action="cancel-property"]') as HTMLButtonElement;
  
  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('hidden', '');
    document.getElementById('propertyForm')?.reset();
    document.getElementById('propertyId')!.value = '';
    document.getElementById('imagePreviews')!.innerHTML = '';
  };
  
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  const cancelBtn = modal.querySelector('[data-action="cancel-property"]') as HTMLButtonElement;
  cancelBtn?.addEventListener('click', closeModal);
  
  // Tab switching
  modal.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.tab-btn').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      modal.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('hidden', '');
      });
      
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      const tab = btn.dataset.tab;
      const panel = document.getElementById(`tab-${tab}`);
      panel?.classList.add('active');
      panel?.removeAttribute('hidden');
    });
  
  // Image upload
  const uploadArea = document.getElementById('imageUploadArea');
  const imageInput = document.getElementById('propImages') as HTMLInputElement;
  const previews = document.getElementById('imagePreviews')!;
  
  uploadArea?.addEventListener('click', () => {
    (document.getElementById('propImages') as HTMLInputElement).click();
  });
  
  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  
  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleImageFiles(files);
  });
  
  const imageInput = document.getElementById('propImages') as HTMLInputElement;
  imageInput.addEventListener('change', (e) => {
    handleImageFiles(e.target.files);
  });
  
  function handleImageFiles(files: FileList): void {
    const previews = document.getElementById('imagePreviews')!;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${url}" alt="Preview">
        <button type="button" class="remove-image" title="Eliminar">
          <i class="fas fa-times"></i>
        </button>
      `;
      previews.appendChild(preview);
      preview.querySelector('.remove-image')?.addEventListener('click', () => {
        preview.remove();
      });
    });
  }
  
  // Form submission - will be handled by properties module
  const form = document.getElementById('propertyForm') as HTMLFormElement;
  form?.addEventListener('submit', handlePropertyFormSubmit);
  
  function handlePropertyFormSubmit(e: Event) {
    e.preventDefault();
    // Handled by properties module
  }
  
  // Tab switching
  modal.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.tab-btn').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      modal.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('hidden', '');
      });
      
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      const tab = btn.dataset.tab;
      const panel = document.getElementById(`tab-${tab}`);
      panel?.classList.add('active');
      panel?.removeAttribute('hidden');
    });
  });
  
  // Image upload drag & drop
  const uploadArea = document.getElementById('imageUploadArea');
  const imageInput = document.getElementById('propImages') as HTMLInputElement;
  const previews = document.getElementById('imagePreviews')!;
  
  uploadArea?.addEventListener('click', () => {
    imageInput.click();
  });
  
  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  
  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleImageFiles(e.dataTransfer.files);
  });
  
  const imageInput = document.getElementById('propImages') as HTMLInputElement;
  imageInput.addEventListener('change', (e) => {
    handleImageFiles(e.target.files);
  });
  
  function handleImageFiles(files: FileList): void {
    const previews = document.getElementById('imagePreviews')!;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${url}" alt="Preview">
        <button type="button" class="remove-image" title="Eliminar">
          <i class="fas fa-times"></i>
        </button>
      `;
      previews.appendChild(preview);
      preview.querySelector('.remove-image')?.addEventListener('click', () => {
        preview.remove();
      });
    });
  }
  
  // Close buttons
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  const cancelBtn = modal.querySelector('[data-action="cancel-property"]') as HTMLButtonElement;
  cancelBtn?.addEventListener('click', closeModal);
}

export function openPropertyModal(property: any = null): void {
  const modal = document.getElementById('propertyModal')!;
  const form = document.getElementById('propertyForm') as HTMLFormElement;
  const title = document.getElementById('propertyModalTitle')!;
  
  form?.reset();
  document.getElementById('propertyId')!.value = '';
  document.getElementById('imagePreviews')!.innerHTML = '';
  
  // Reset tabs
  modal.querySelectorAll('.tab-btn').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  modal.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('hidden', '');
  });
  modal.querySelector('.tab-btn[data-tab="basic"]')?.classList.add('active');
  modal.querySelector('.tab-btn[data-tab="basic"]')?.setAttribute('aria-selected', 'true');
  document.getElementById('tab-basic')?.classList.add('active');
  document.getElementById('tab-basic')?.removeAttribute('hidden');
  
  if (property) {
    title.textContent = 'Editar Propiedad';
    (document.getElementById('propertyId') as HTMLInputElement).value = String(property.id);
    (document.getElementById('propTitle') as HTMLInputElement).value = property.titulo || '';
    (document.getElementById('propType') as HTMLSelectElement).value = property.tipo || 'casa';
    (document.getElementById('propOperation') as HTMLSelectElement).value = property.operacion || 'venta';
    (document.getElementById('propPrice') as HTMLInputElement).value = String(property.precio || '');
    (document.getElementById('propCurrency') as HTMLSelectElement).value = property.moneda || 'ARS';
    (document.getElementById('propDescription') as HTMLTextAreaElement).value = property.descripcion || '';
    (document.getElementById('propLocation') as HTMLInputElement).value = property.ubicacion || '';
    (document.getElementById('propLat') as HTMLInputElement).value = String(property.latitud || '');
    (document.getElementById('propLng') as HTMLInputElement).value = String(property.longitud || '');
    (document.getElementById('propBedrooms') as HTMLInputElement).value = String(property.dormitorios || 0);
    (document.getElementById('propBathrooms') as HTMLInputElement).value = String(property.banos || 0);
    (document.getElementById('propGarage') as HTMLInputElement).value = String(property.cochera || 0);
    (document.getElementById('propSurface') as HTMLInputElement).value = String(property.superficie || '');
    (document.getElementById('propSurfaceCovered') as HTMLInputElement).value = String(property.superficie_cubierta || '');
    (document.getElementById('propAntiquity') as HTMLInputElement).value = String(property.antiguedad || '');
    (document.getElementById('propFeatures') as HTMLInputElement).value = property.caracteristicas || '';
    (document.getElementById('propCurrency') as HTMLSelectElement).value = property.moneda || 'ARS';
    (document.getElementById('mlCategory') as HTMLInputElement).value = property.ml_categoria || '';
    (document.getElementById('mlEnabled') as HTMLInputElement).checked = !!property.ml_enabled;
    (document.getElementById('mlAutoSync') as HTMLInputElement).checked = !!property.ml_auto_sync;
    (document.getElementById('propDestacado') as HTMLInputElement).checked = !!property.destacado;
    (document.getElementById('propActivo') as HTMLInputElement).checked = property.activo !== false;
  } else {
    title.textContent = 'Nueva Propiedad';
    (document.getElementById('propertyId') as HTMLInputElement).value = '';
    (document.getElementById('propCurrency') as HTMLSelectElement).value = 'ARS';
    (document.getElementById('propOperation') as HTMLSelectElement).value = 'venta';
    (document.getElementById('mlEnabled') as HTMLInputElement).checked = false;
    (document.getElementById('mlAutoSync') as HTMLInputElement).checked = false;
    (document.getElementById('propDestacado') as HTMLInputElement).checked = false;
    (document.getElementById('propActivo') as HTMLInputElement).checked = true;
  }
  
  const modal = document.getElementById('propertyModal')!;
  modal.classList.add('active');
  modal.removeAttribute('hidden');
}

export function closePropertyModal(): void {
  const modal = document.getElementById('propertyModal');
  modal?.classList.remove('active');
  modal?.setAttribute('hidden', '');
  document.getElementById('propertyForm')?.reset();
  document.getElementById('imagePreviews')!.innerHTML = '';
}

export function initPropertyModalInDOM(): void {
  if (!document.getElementById('propertyModal')) {
    const container = document.createElement('div');
    container.innerHTML = PROPERTY_MODAL_HTML;
    document.body.appendChild(container.firstElementChild!);
    bindPropertyModalEvents();
  }
}

export { openPropertyModal, closePropertyModal };