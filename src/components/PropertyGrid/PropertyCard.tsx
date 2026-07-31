import { h } from 'preact';
import { useState } from 'preact/hooks';
import { sanitizeText, sanitizeUrl } from '../../utils/sanitize.ts';
import { formatPrice } from '../../utils/format.ts';
import styles from './PropertyCard.module.css';

interface Property {
  id: number | string;
  titulo: string;
  precio: number;
  moneda?: string;
  operacion: string;
  estado?: string;
  destacado?: boolean;
  ubicacion?: string;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  imagen_principal?: string;
  favorito?: boolean;
}

interface PropertyCardProps {
  property: Property;
  onDetail?: (id: number | string) => void;
  onToggleFavorite?: (id: number | string) => void;
  index?: number;
}

export function PropertyCard({ property: p, onDetail, onToggleFavorite, index = 0 }: PropertyCardProps) {
  const [liked, setLiked] = useState(!!p.favorito);
  const [imageLoaded, setImageLoaded] = useState(false);

  const badgeClass = p.operacion === 'venta' ? styles.badgeVenta : styles.badgeAlquiler;
  const badgeLabel = p.operacion === 'venta' ? 'Venta' : 'Alquiler';
  const imageUrl = p.imagen_principal || 'https://via.placeholder.com/400x300?text=Sin+imagen';

  const handleLike = (e: h.JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setLiked(!liked);
    onToggleFavorite?.(p.id);
  };

  const handleDetail = () => {
    onDetail?.(p.id);
  };

  return (
    <article
      class={styles.card}
      role="listitem"
      data-id={p.id}
      tabIndex={0}
      onClick={handleDetail}
      onKeyDown={(e) => { if (e.key === 'Enter') handleDetail(); }}
      style={{ '--stagger-delay': `${index * 60}ms` } as h.JSX.CSSProperties}
    >
      <div class={styles.media}>
        {!imageLoaded && <div class={styles.skeletonImage} />}
        <img
          src={sanitizeUrl(imageUrl)}
          alt={sanitizeText(p.titulo)}
          loading="lazy"
          width="400"
          height="300"
          class={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
        <span class={`${styles.badge} ${badgeClass}`}>{badgeLabel}</span>
        {p.destacado && <span class={`${styles.badge} ${styles.badgeDestacado}`}>Destacada</span>}
        {p.estado && p.estado !== 'activo' && (
          <span class={`${styles.badge} ${p.estado === 'vendido' ? styles.badgeVendido : styles.badgeReservado}`}>
            {p.estado === 'vendido' ? 'Vendido' : 'Reservado'}
          </span>
        )}
        <button
          class={`${styles.fav} ${liked ? styles.favActive : ''}`}
          onClick={handleLike}
          aria-label={liked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={liked}
        >
          <svg viewBox="0 0 24 24" class={styles.favIcon} aria-hidden="true" width="18" height="18">
            <path d="M12 21s-7-4.5-9.5-9C1 8.5 3 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6 3.5 4.5 7C19 16.5 12 21 12 21z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class={styles.body}>
        <div class={styles.priceRow}>
          <span class={styles.price}>{formatPrice(p.precio, p.moneda, p.operacion)}</span>
          {p.operacion === 'alquiler' && <span class={styles.perMonth}>/mes</span>}
        </div>
        <h3 class={styles.title}>{sanitizeText(p.titulo)}</h3>
        {p.ubicacion && (
          <p class={styles.location}>
            <svg viewBox="0 0 24 24" class={styles.locIcon} aria-hidden="true" width="14" height="14">
              <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="currentColor"/>
            </svg>
            {sanitizeText(p.ubicacion)}
          </p>
        )}
        <ul class={styles.features}>
          {p.habitaciones > 0 && (
            <li class={styles.feature}>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d="M4 18v3c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-3H4zm16-7l-1.34-5.36A2.02 2.02 0 0016.72 4H7.28c-.97 0-1.82.68-1.94 1.64L4 11h16zm-3 3h-2v-2h2v2zm-6 0H9v-2h2v2zm10 5H5v-1h16v1z" fill="currentColor"/></svg>
              <span class={styles.featureValue}>{p.habitaciones}</span>
              <span class={styles.featureLabel}>dorm</span>
            </li>
          )}
          {p.banos > 0 && (
            <li class={styles.feature}>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d="M22 7.5C22 5.57 20.43 4 18.5 4S15 5.57 15 7.5V9h-1V5c0-2.21-1.79-4-4-4S6 2.79 6 5v4H2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9h-2V7.5zM18.5 7c.83 0 1.5.67 1.5 1.5V9h-3v-.5c0-.83.67-1.5 1.5-1.5zM10 5c0-1.1.9-2 2-2s2 .9 2 2v4h-4V5z" fill="currentColor"/></svg>
              <span class={styles.featureValue}>{p.banos}</span>
              <span class={styles.featureLabel}>baños</span>
            </li>
          )}
          {p.m2 > 0 && (
            <li class={styles.feature}>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" fill="currentColor"/></svg>
              <span class={styles.featureValue}>{p.m2}</span>
              <span class={styles.featureLabel}>m²</span>
            </li>
          )}
        </ul>
        <button
          class={styles.detailBtn}
          onClick={handleDetail}
          aria-label={`Ver detalles de ${sanitizeText(p.titulo)}`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
          Ver detalles
        </button>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div class={styles.card} aria-busy="true">
      <div class={`${styles.media} ${styles.skeletonMedia}`}>
        <div class={`${styles.skeleton} ${styles.skeletonImagePlaceholder}`} />
      </div>
      <div class={styles.body}>
        <div class={`${styles.skeleton} ${styles.skeletonPrice}`} />
        <div class={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div class={`${styles.skeleton} ${styles.skeletonLocation}`} />
        <div class={styles.features}>
          <div class={`${styles.skeleton} ${styles.skeletonFeature}`} />
          <div class={`${styles.skeleton} ${styles.skeletonFeature}`} />
          <div class={`${styles.skeleton} ${styles.skeletonFeature}`} />
        </div>
        <div class={`${styles.skeleton} ${styles.skeletonBtn}`} />
      </div>
    </div>
  );
}