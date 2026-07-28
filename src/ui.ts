// ================================================================
// UI - MODALES, COOKIES, WHATSAPP, SCROLL, FORMULARIOS
// ================================================================

// ================================================================
// MODAL DETALLE PROPIEDAD
// ================================================================
export function initDetalleModal(): void {
  const closeBtn = document.getElementById('detalleClose');
  const overlay = document.getElementById('detalleOverlay');
  const contactBtn = document.getElementById('detalleContactar');

  closeBtn?.addEventListener('click', cerrarDetalle);
  overlay?.addEventListener('click', (e: Event) => { if (e.target === overlay) cerrarDetalle(); });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') cerrarDetalle();
  });

  contactBtn?.addEventListener('click', async () => {
    // Dynamic import for property data
    try {
      await import('./components/PropertyGrid/PropertyGrid.ts');
      document.getElementById('motivo')!.value = 'comprar';
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    } catch { /* ignore */ }
  });
}

export function cerrarDetalle(): void {
  const overlay = document.getElementById('detalleOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ================================================================
// FILTROS
// ================================================================
export function initFiltros(): void {
  document.getElementById('btnFiltrar')?.addEventListener('click', async () => {
    const { initPropertyGrid } = await import('./components/PropertyGrid/PropertyGrid.ts');
    initPropertyGrid();
  });

  document.getElementById('btnLimpiar')?.addEventListener('click', async () => {
    const selects = document.querySelectorAll<HTMLSelectElement>('#filtrosAvanzados select');
    selects.forEach(s => { s.value = ''; });
  });

  const btnFiltrosAvanzados = document.getElementById('btnFiltrosAvanzados');
  const filtrosAvanzados = document.getElementById('filtrosAvanzados');
  const iconoFiltros = document.getElementById('iconoFiltros');
  
  btnFiltrosAvanzados?.addEventListener('click', () => {
    if (!filtrosAvanzados) return;
    const isHidden = filtrosAvanzados.hidden;
    filtrosAvanzados.hidden = !isHidden;
    btnFiltrosAvanzados.setAttribute('aria-expanded', String(isHidden));
    if (iconoFiltros) iconoFiltros.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  const filterIds = [
    'tipoOperacion', 'tipoPropiedadFiltro', 'precioMin', 'precioMax',
    'habitaciones', 'metrosMin', 'banosMin', 'antiguedadFiltro',
    'filtroCochera', 'filtroBalcon', 'filtroPileta', 'filtroAmueblado',
    'filtroMascotas', 'gastosComunesMax', 'ordenarPor'
  ];

  filterIds.forEach(id => {
    document.getElementById(id)?.addEventListener('change', async () => {
      await import('./components/PropertyGrid/PropertyGrid.ts');
    });
  });
}

// ================================================================
// FORMULARIO CONTACTO
// ================================================================
export function initContactForm(): void {
  const form = document.getElementById('formContacto') as HTMLFormElement | null;
  const btnEnviar = document.getElementById('btnEnviar') as HTMLButtonElement | null;
  const formSuccess = document.getElementById('formSuccess');
  if (!form || !btnEnviar || !formSuccess) return;

  function validarCampo(id: string, cond: boolean): boolean {
    const g = document.getElementById(id);
    if (!g) return false;
    if (cond) { g.classList.remove('error'); g.classList.add('success'); return true; }
    else { g.classList.remove('success'); g.classList.add('error'); return false; }
  }

  function validarForm(): boolean {
    const n = (document.getElementById('nombre') as HTMLInputElement)?.value.trim() || '';
    const e = (document.getElementById('email') as HTMLInputElement)?.value.trim() || '';
    const t = (document.getElementById('telefono') as HTMLInputElement)?.value.trim() || '';
    const m = (document.getElementById('motivo') as HTMLSelectElement)?.value || '';
    return validarCampo('grupo-nombre', n.length >= 2) &&
           validarCampo('grupo-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) &&
           validarCampo('grupo-telefono', t.replace(/\s/g, '').length >= 10) &&
           validarCampo('grupo-motivo', m !== '');
  }

  ['nombre', 'email', 'telefono'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', validarForm)
  );
  document.getElementById('motivo')?.addEventListener('change', validarForm);

  form.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    if (!validarForm()) { alert('Completa todos los campos obligatorios.'); return; }

    const datos = {
      nombre: (document.getElementById('nombre') as HTMLInputElement).value.trim(),
      email: (document.getElementById('email') as HTMLInputElement).value.trim(),
      telefono: (document.getElementById('telefono') as HTMLInputElement).value.trim(),
      motivo: (document.getElementById('motivo') as HTMLSelectElement).value,
      tipo_propiedad: (document.getElementById('tipoPropiedad') as HTMLSelectElement)?.value || null,
      mensaje: (document.getElementById('mensaje') as HTMLTextAreaElement)?.value.trim() || null
    };

    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const { supabase } = await import('./supabase.ts');
      const { error } = await supabase.from('leads').insert([datos]);
      if (error) throw error;

      formSuccess.classList.add('active');
      form.reset();
      document.querySelectorAll('#formContacto .form-group').forEach(g => g.classList.remove('success', 'error'));
      setTimeout(() => formSuccess.classList.remove('active'), 5000);
    } catch (err) {
      console.error(err);
      alert('Error al enviar. Intenta de nuevo.');
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar mensaje';
    }
  });
}

// ================================================================
// BOTON SUBIR (SCROLL)
// ================================================================
export function initScrollButton(): void {
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
export function initWhatsApp(): void {
  const wFloat = document.getElementById('whatsappFloat');
  const wModal = document.getElementById('whatsappModal');
  const wOverlay = document.getElementById('whatsappOverlay');
  const wClose = document.getElementById('whatsappClose');
  const wForm = document.getElementById('whatsappForm') as HTMLFormElement | null;
  if (!wFloat || !wModal || !wOverlay || !wClose || !wForm) return;

  function cerrarW(): void { wModal.classList.remove('active'); wOverlay.classList.remove('active'); }

  wFloat.addEventListener('click', (e: Event) => { e.stopPropagation(); wModal.classList.add('active'); wOverlay.classList.add('active'); });
  wClose.addEventListener('click', cerrarW);
  wOverlay.addEventListener('click', cerrarW);
  document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarW(); });

  wForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    const nombre = (document.getElementById('waNombre') as HTMLInputElement)?.value.trim() || '';
    const telefono = (document.getElementById('waTelefono') as HTMLInputElement)?.value.trim() || '';
    const motivo = (document.getElementById('waMotivo') as HTMLInputElement)?.value.trim() || '';
    if (!nombre || !telefono) { alert('Completa nombre y telefono.'); return; }
    if (telefono.replace(/\s/g, '').length < 10) { alert('Telefono invalido (minimo 10 digitos).'); return; }

    import('./config.ts').then(m => {
      const msg = `Hola Bienenhaus!\n\nMe presento: ${nombre}\nTelefono: ${telefono}${motivo ? '\nMotivo: ' + motivo : ''}\n\nGracias!`;
      window.open(`https://wa.me/${m.CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    });
    alert(`Gracias ${nombre}! Te contactaremos por WhatsApp.`);
    cerrarW();
    wForm.reset();
  });
}

// ================================================================
// COOKIES BANNER (GDPR basico)
// ================================================================
export function initCookies(): void {
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
export function initAdminShortcut(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
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
export function showSpinner(): void {
  document.getElementById('spinnerOverlay')?.classList.add('active');
}
export function hideSpinner(): void {
  document.getElementById('spinnerOverlay')?.classList.remove('active');
}

// ================================================================
// INICIALIZACION COMPLETA DE UI
// ================================================================
export function initAllUI(): void {
  initDetalleModal();
  initFiltros();
  initContactForm();
  initScrollButton();
  initWhatsApp();
  initCookies();
  initAdminShortcut();
}
