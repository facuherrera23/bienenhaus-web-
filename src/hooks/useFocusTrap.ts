import { useEffect, useRef } from 'preact/hooks';

/**
 * Focus trap hook for modals and dialogs (WCAG 2.4.3, 2.4.7)
 * Traps focus within a container, restores focus on unmount
 */
export function useFocusTrap(isActive: boolean, containerRef: { current: HTMLElement | null }) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Save current focus
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 el.offsetWidth > 0 && 
                 el.offsetHeight > 0;
        });
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: going backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Find close button or first button with close action
        const closeBtn = container.querySelector('[aria-label="Cerrar"], [aria-label="Close"], .modal-close, .close-btn') as HTMLElement;
        if (closeBtn) {
          closeBtn.click();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);
      
      // Restore focus to previous element
      if (previousActiveElement.current && 
          typeof (previousActiveElement.current as HTMLElement).focus === 'function') {
        (previousActiveElement.current as HTMLElement).focus();
      }
    };
  }, [isActive, containerRef]);
}