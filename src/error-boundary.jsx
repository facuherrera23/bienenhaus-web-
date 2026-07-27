import * as Sentry from '@sentry/browser';

export class ErrorBoundary extends HTMLElement {
  constructor() {
    super();
    this.state = { hasError: false, error: null };
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['fallback'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'fallback') {
      this.render();
    }
  }

  static handleError(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    if (typeof window !== 'undefined' && window.Sentry) {
      Sentry.captureException(error, {
        extra: errorInfo,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.getAttribute('fallback') || `
        <div style="padding: 40px; text-align: center; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h2 style="margin: 0 0 12px; color: #1e293b;">Algo salió mal</h2>
          <p style="margin: 0 0 24px; color: #64748b;">Ocurrió un error inesperado. El equipo ha sido notificado.</p>
          <button onclick="window.location.reload()" style="background: #1f6ed4; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
            Recargar página
          </button>
        </div>
      `;
      this.innerHTML = fallback;
    } else {
      this.innerHTML = '<slot></slot>';
    }
  }

  componentDidCatch(error, errorInfo) {
    this.state = { hasError: true, error };
    this.render();
    ErrorBoundary.handleError(error, errorInfo);
  }
}

if (!customElements.get('error-boundary')) {
  customElements.define('error-boundary', ErrorBoundary);
}

export { ErrorBoundary };