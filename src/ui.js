// ================================================================
// UI - MODALES, COOKIES, WHATSAPP, SCROLL, FORMULARIOS
// ================================================================

// ================================================================
// MODAL DETALLE PROPIEDAD
// ================================================================
export function initDetalleModal() {
  const closeBtn = document.getElementById('detalleClose');
  const overlay = document.getElementById('detalleOverlay');
  const contactBtn = document.getElementById('detalleContactar');

  closeBtn?.addEventListener('click', cerrarDetalle);
  overlay?.addEventListener('click', e => { if (e.target === overlay) cerrarDetalle(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarDetalle();
  });

  contactBtn?.addEventListener('click', async () => {
    const { propiedadActual, formatearPrecio } = await import('./properties.js');
    if (propiedadActual) {
      document.getElementById('motivo').value = 'comprar';
      document.getElementById('mensaje').value = `Me interesa: ${propiedadActual.titulo} (${propiedadActual.ubicacion}) - ${formatearPrecio(propiedadActual.precio, propiedadActual.moneda || 'ARS', propiedadActual.operacion).texto}`;
      cerrarDetalle();
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

export function cerrarDetalle() {
  const overlay = document.getElementById('detalleOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ================================================================
// FILTROS
// ================================================================
export function initFiltros() {
  document.getElementById('btnFiltrar')?.addEventListener('click', async () => {
    const { aplicarFiltros } = await import('./properties.js');
    await aplicarFiltros();
  });

  document.getElementById('btnLimpiar')?.addEventListener('click', async () => {
    const { limpiarFiltros } = await import('./properties.js');
    limpiarFiltros();
  });
}

// ================================================================
// FORMULARIO CONTACTO
// ================================================================
export function initContactForm() {
  const form = document.getElementById('formContacto');
  const btnEnviar = document.getElementById('btnEnviar');
  const formSuccess = document.getElementById('formSuccess');
  if (!form || !btnEnviar || !formSuccess) return;

  function validarCampo(id, cond) {
    const g = document.getElementById(id);
    if (cond) { g.classList.remove('error'); g.classList.add('success'); return true; }
    else { g.classList.remove('success'); g.classList.add('error'); return false; }
  }

  function validarForm() {
    const n = document.getElementById('nombre').value.trim();
    const e = document.getElementById('email').value.trim();
    const t = document.getElementById('telefono').value.trim();
    const m = document.getElementById('motivo').value;
    return validarCampo('grupo-nombre', n.length >= 2) &&
           validarCampo('grupo-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) &&
           validarCampo('grupo-telefono', t.replace(/\s/g, '').length >= 10) &&
           validarCampo('grupo-motivo', m !== '');
  }

  ['nombre', 'email', 'telefono'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', validarForm)
  );
  document.getElementById('motivo')?.addEventListener('change', validarForm);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validarForm()) { alert('⚠️ Completa todos los campos obligatorios.'); return; }

    const datos = {
      nombre: document.getElementById('nombre').value.trim(),
      email: document.getElementById('email').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      motivo: document.getElementById('motivo').value,
      tipo_propiedad: document.getElementById('tipoPropiedad').value || null,
      mensaje: document.getElementById('mensaje').value.trim() || null
    };

    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const { supabase } = await import('./supabase.js');
      const { error } = await supabase.from('leads').insert([datos]);
      if (error) throw error;

      formSuccess.classList.add('active');
      form.reset();
      document.querySelectorAll('#formContacto .form-group').forEach(g => g.classList.remove('success', 'error'));
      setTimeout(() => formSuccess.classList.remove('active'), 5000);
    } catch (err) {
      console.error(err);
      alert('❌ Error al enviar. Intenta de nuevo.');
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar mensaje';
    }
  });
}

// ================================================================
// BOTÓN SUBIR (SCROLL)
// ================================================================
export function initScrollButton() {
  const btnSubir = document.getElementById('btnSubir');
  const heroSection = document.getElementById('hero');
  if (!btnSubir || !heroSection) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btnSubir.classList.add('visible');
    else btnSubir.classList.remove('visible');
  });

  btnSubir.addEventListener('click', () => {
    heroSection.scrollIntoView({ behavior: 'smooth' });
  });
}

// ================================================================
// WHATSAPP FLOTANTE + MODAL
// ================================================================
export function initWhatsApp() {
  const wFloat = document.getElementById('whatsappFloat');
  const wModal = document.getElementById('whatsappModal');
  const wOverlay = document.getElementById('whatsappOverlay');
  const wClose = document.getElementById('whatsappClose');
  const wForm = document.getElementById('whatsappForm');
  if (!wFloat || !wModal || !wOverlay || !wClose || !wForm) return;

  function cerrarW() { wModal.classList.remove('active'); wOverlay.classList.remove('active'); }

  wFloat.addEventListener('click', e => { e.stopPropagation(); wModal.classList.add('active'); wOverlay.classList.add('active'); });
  wClose.addEventListener('click', cerrarW);
  wOverlay.addEventListener('click', cerrarW);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarW(); });

  wForm.addEventListener('submit', e => {
    e.preventDefault();
    const nombre = document.getElementById('waNombre').value.trim();
    const telefono = document.getElementById('waTelefono').value.trim();
    const motivo = document.getElementById('waMotivo').value.trim();
    if (!nombre || !telefono) { alert('⚠️ Completa nombre y teléfono.'); return; }
    if (telefono.replace(/\s/g, '').length < 10) { alert('⚠️ Teléfono inválido (mínimo 10 dígitos).'); return; }

    const msg = `Hola Bienenhaus! 👋\n\nMe presento: ${nombre}\nTeléfono: ${telefono}${motivo ? '\nMotivo: ' + motivo : ''}\n\n¡Gracias!`;
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    alert(`✅ ¡Gracias ${nombre}! Te contactaremos por WhatsApp.`);
    cerrarW();
    wForm.reset();
  });
}

// CONFIG se importa desde config.js - evitar dependencia circular
let CONFIG = null;
import('./config.js').then(m => { CONFIG = m.CONFIG; });

// ================================================================
// COOKIES BANNER (GDPR básico)
// ================================================================
export function initCookies() {
  const cb = document.getElementById('cookieBanner');
  if (!cb) return;

  if (localStorage.getItem('cookiesAceptadas') === null) cb.classList.add('active');

  document.getElementById('cookieAceptar')?.addEventListener('click', () => {
    localStorage.setItem('cookiesAceptadas', 'true');
    cb.classList.remove('active');
  });
  document.getElementById('cookieRechazar')?.addEventListener('click', () => {
    localStorage.setItem('cookiesAceptadas', 'false');
    cb.classList.remove('active');
  });
}

// ================================================================
// PANEL ADMIN (atajo teclado Ctrl+Shift+A)
// ================================================================
export function initAdminShortcut() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      const btnAdmin = document.getElementById('btnAdmin');
      if (btnAdmin) {
        btnAdmin.style.display = btnAdmin.style.display === 'block' ? 'none' : 'block';
      }
    }
  });
}

// ================================================================
// SPINNER GLOBAL
// ================================================================
export function showSpinner() {
  document.getElementById('spinnerOverlay')?.classList.add('active');
}
export function hideSpinner() {
  document.getElementById('spinnerOverlay')?.classList.remove('active');
}

// ================================================================
// INICIALIZACIÓN COMPLETA DE UI
// ================================================================
export function initAllUI() {
  initDetalleModal();
  initFiltros();
  initContactForm();
  initScrollButton();
  initWhatsApp();
  initCookies();
  initAdminShortcut();
}