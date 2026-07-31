import { h } from 'preact';

const hexagonPath = 'M12 2L3 7v10l9 5 9-5V7l-9-5z';

export function LogoMark({ size = 32, class: className = '' }: { size?: number; class?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      aria-hidden="true"
    >
      <path d={hexagonPath} fill="var(--color-brand, #20B8AB)" opacity="0.15" />
      <path d={hexagonPath} stroke="var(--color-brand, #20B8AB)" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M12 7v10M7 12h10" stroke="var(--color-brand, #20B8AB)" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="12" cy="12" r="2" fill="var(--color-brand, #20B8AB)" />
    </svg>
  );
}

export function LogoLockup({ size = 28, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2, 8px)' }}>
      <LogoMark size={size} />
      {showWordmark && (
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: showWordmark ? '1.125rem' : 0, letterSpacing: '0.05em', color: 'var(--color-text)' }}>
          Bienen<span style={{ color: 'var(--color-brand)' }}>haus</span>
        </span>
      )}
    </span>
  );
}