// Global type augmentations for the Bienenhaus project

declare global {
  interface HTMLElement {
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    dataset: DOMStringMap;
  }

  interface Element {
    href?: string;
    closest(selector: string): Element | null;
    offsetWidth?: number;
  }

  interface Window {
    propiedadesData: any[];
    paginaActual: number;
    itemsPorPagina: number;
    propiedadActual: any;
    loadProperties: (...args: any[]) => any;
    loadAgents: () => Promise<void>;
    cargarContenidoSitio: (...args: any[]) => any;
    showToast: (message: string, type?: string, duration?: number, persistent?: boolean) => number;
    abrirAdmin: () => void;
    initHero: () => void;
    updateHeroContent: (content: any) => void;
    initFooter: () => void;
    updateFooterContent: (content: any) => void;
    initMapaPropiedades: (...args: any[]) => any;
    getCurrentFilters: (...args: any[]) => any;
    abrirDetalle: (...args: any[]) => any;
    currentPage: number;
    itemsPerPage: number;
    Autocomplete: { init: (config: any) => void; clear: () => void; getValue?: () => string; setValue?: (value: string) => void; destroy?: () => void };
    gtag: (...args: any[]) => void;
    ga: any;
    dataLayer: any[];
    openPropertyModal: (property: any) => void;
    closePropertyModal: () => void;
    editProperty: (id: number) => void;
    cloneProperty: (id: number) => void;
    confirmDelete: (type: string, id: number, name: string) => void;
    filterProperties: (...args: any[]) => void;
    filterAgents: () => void;
    showSpinner: () => void;
    hideSpinner: () => void;
    recargarContenido: () => Promise<void>;
    fbq: ((...args: any[]) => void) & { callMethod?: any; queue?: any[] };
    __lighthouse?: boolean;
  }
}

export {};
