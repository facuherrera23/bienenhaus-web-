// @ts-nocheck
// ================================================================
// ACCESSIBILITY AUDIT - Automated a11y checks
// ================================================================

/**
 * Run automated accessibility audit
 * @returns {Object} Audit results
 */
export function runAccessibilityAudit() {
  if (typeof document === 'undefined') return { errors: [], warnings: [], passed: [] };

  const results = {
    errors: [],
    warnings: [],
    passed: []
  };

  // 1. Check for missing alt attributes on images
  document.querySelectorAll('img:not([alt])').forEach(img => {
    results.errors.push({
      rule: 'image-alt',
      element: img,
      message: 'Imagen sin atributo alt',
      impact: 'critical'
    });
  });

  // 2. Check for empty alt on non-decorative images
  document.querySelectorAll('img[alt=""]').forEach(img => {
    const isDecorative = img.hasAttribute('role') && img.getAttribute('role') === 'presentation';
    if (!isDecorative && !img.closest('[aria-hidden="true"]')) {
      results.warnings.push({
        rule: 'image-alt-empty',
        element: img,
        message: 'Imagen con alt vacío (posiblemente decorativa sin role="presentation")',
        impact: 'moderate'
      });
    }
  });

  // 3. Check for missing labels on form inputs
  document.querySelectorAll('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])').forEach(input => {
    const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                     input.closest('label');
    if (!hasLabel && !input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
      results.errors.push({
        rule: 'label',
        element: input,
        message: `Input sin label asociado (type: ${input.type})`,
        impact: 'critical'
      });
    }
  });

  // 4. Check for missing lang attribute
  if (!document.documentElement.lang) {
    results.errors.push({
      rule: 'html-has-lang',
      element: document.documentElement,
      message: 'Documento sin atributo lang',
      impact: 'critical'
    });
  }

  // 5. Check for sufficient color contrast (basic check)
  document.querySelectorAll('button, a, [role="button"]').forEach(el => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;
    // Basic check - would need more sophisticated contrast calculation
    if (color === bgColor) {
      results.warnings.push({
        rule: 'color-contrast',
        element: el,
        message: 'Color de texto igual al fondo (posible problema de contraste)',
        impact: 'moderate'
      });
    }
  });

  // 6. Check for focus visible styles
  const hasFocusStyles = Array.from(document.styleSheets).some(sheet => {
    try {
      return Array.from(sheet.cssRules || []).some(rule => 
        rule.selectorText && rule.selectorText.includes(':focus-visible')
      );
    } catch (e) {
      return false;
    }
  });

  if (!hasFocusStyles) {
    results.warnings.push({
      rule: 'focus-visible',
      element: document.body,
      message: 'No se detectaron estilos :focus-visible en CSS',
      impact: 'moderate'
    });
  }

  // 7. Check for skip link
  const skipLink = document.querySelector('.skip-link, a[href="#main"], a[href="#content"], a[href="#main-content"]');
  if (!skipLink) {
    results.warnings.push({
      rule: 'skip-link',
      element: document.body,
      message: 'Falta enlace "Saltar al contenido principal"',
      impact: 'moderate'
    });
  }

  // 8. Check for proper heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(h => {
    const level = parseInt(h.tagName.charAt(1));
    if (level > lastLevel + 1) {
      results.warnings.push({
        rule: 'heading-order',
        element: h,
        message: `Salto de nivel de heading: h${lastLevel} a h${level}`,
        impact: 'moderate'
      });
    }
    lastLevel = level;
  });

  // 8b. Check for multiple h1
  const h1Count = document.querySelectorAll('h1').length;
  if (h1Count > 1) {
    results.warnings.push({
      rule: 'single-h1',
      element: document.body,
      message: `Múltiples elementos h1 (${h1Count})`,
      impact: 'moderate'
    });
  }

  // 9. Check for ARIA attributes on interactive elements
  document.querySelectorAll('[role="button"], [role="link"], [role="menuitem"], [role="tab"]').forEach(el => {
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !el.textContent.trim()) {
      results.warnings.push({
        rule: 'aria-label',
        element: el,
        message: `Elemento interactivo sin label accesible (role: ${el.getAttribute('role')})`,
        impact: 'moderate'
      });
    }
  });

  // 10. Check for redundant alt text
  document.querySelectorAll('img[alt]').forEach(img => {
    const alt = img.getAttribute('alt').toLowerCase();
    const redundant = ['image', 'img', 'photo', 'picture', 'foto', 'imagen', 'icon', 'icono'];
    if (redundant.some(r => alt.startsWith(r + ' ') || alt === r)) {
      results.warnings.push({
        rule: 'redundant-alt',
        element: img,
        message: `Texto alt redundante: "${img.getAttribute('alt')}"`,
        impact: 'minor'
      });
    }
  });

  // 11. Check for empty buttons/links
  document.querySelectorAll('button:not(:has(*)), a:not(:has(*)').forEach(el => {
    if (!el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      results.errors.push({
        rule: 'empty-interactive',
        element: el,
        message: 'Botón/enlace sin contenido de texto ni aria-label',
        impact: 'critical'
      });
    }
  });

  // 12. Check for viewport meta
  if (!document.querySelector('meta[name="viewport"]')) {
    results.errors.push({
      rule: 'viewport',
      element: document.head,
      message: 'Falta meta viewport',
      impact: 'critical'
    });
  }

  return results;
}

/**
 * Run audit and log results
 */
export function auditAndLog() {
  const results = runAccessibilityAudit();
  
  console.group('🔍 Accessibility Audit Results');
  
  if (results.errors.length > 0) {
    console.error(`❌ ${results.errors.length} Errores críticos:`, results.errors);
  } else {
    console.log('✅ Sin errores críticos');
  }
  
  if (results.warnings.length > 0) {
    console.warn(`⚠️ ${results.warnings.length} Advertencias:`, results.warnings);
  } else {
    console.log('✅ Sin advertencias');
  }
  
  console.log(`✅ ${results.passed.length} Checks pasados`);
  console.groupEnd();

  return results;
}

/**
 * Fix common issues automatically (where safe)
 */
export function autoFixAccessibility() {
  let fixed = 0;

  // Add role="presentation" to decorative images with empty alt
  document.querySelectorAll('img[alt=""]:not([role])').forEach(img => {
    img.setAttribute('role', 'presentation');
    fixed++;
  });

  // Add aria-hidden to decorative icons
  document.querySelectorAll('i[class*="fa-"]:not([aria-hidden])').forEach(icon => {
    if (!icon.textContent.trim()) {
      icon.setAttribute('aria-hidden', 'true');
      fixed++;
    }
  });

  // Add role="button" to button-like divs
  document.querySelectorAll('div[onclick]:not([role])').forEach(div => {
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    fixed++;
  });

  console.log(`🔧 Auto-fix aplicado: ${fixed} correcciones`);
  return fixed;
}

export default {
  runAccessibilityAudit,
  auditAndLog,
  autoFixAccessibility
};