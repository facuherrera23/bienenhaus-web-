import * as Sentry from '@sentry/browser';
import { CONFIG } from './config.js';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error && error.message?.includes('Network Error')) {
        return null;
      }
      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
    ],
  });

  console.log('Sentry initialized');
}

export function captureError(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message, level = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUserContext(user) {
  Sentry.setUser(user);
}

export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}