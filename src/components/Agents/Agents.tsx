import { h, render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { supabase } from '../../supabase.ts';
import { logWarn } from '../../utils/logger.ts';
import { sanitizeText, sanitizeUrl } from '../../utils/sanitize.ts';
import { showToast, getInitials } from '../shared/utils.ts';
import styles from './Agents.module.css';

interface Agent {
  id: number;
  nombre: string;
  apellido: string | null;
  especialidad: string;
  email: string | null;
  telefono: string | null;
  descripcion: string | null;
  activo: boolean;
  avatar_url: string | null;
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const fullName = `${agent.nombre} ${agent.apellido || ''}`;
  const role = agent.especialidad || 'Agente inmobiliario';

  return (
    <>
      <article
        class={styles.card}
        role="listitem"
        data-id={agent.id}
        style={{ '--stagger-delay': `${index * 80}ms` } as h.JSX.CSSProperties}
      >
        <div class={styles.avatar}>
          {agent.avatar_url
            ? <img src={sanitizeUrl(agent.avatar_url)!} alt={sanitizeText(fullName)} loading="lazy" />
            : <span>{getInitials(fullName)}</span>
          }
        </div>
        <div class={styles.info}>
          <h3 class={styles.name}>{sanitizeText(fullName)}</h3>
          <p class={styles.role}>{sanitizeText(role)}</p>
          {agent.telefono && (
            <p class={styles.phone}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.1.31.03.66-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>
              {sanitizeText(agent.telefono)}
            </p>
          )}
          {agent.email && (
            <p class={styles.email}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>
              {sanitizeText(agent.email)}
            </p>
          )}
          {agent.descripcion && <p class={styles.bio}>{sanitizeText(agent.descripcion)}</p>}
        </div>
        <div class={styles.actions}>
          <button
            class={styles.contactBtn}
            onClick={() => setModalOpen(true)}
            aria-label={`Contactar a ${sanitizeText(agent.nombre)}`}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>
            Contactar
          </button>
          <span class={`${styles.badge} ${agent.activo ? styles.badgeActive : styles.badgeInactive}`}>
            {agent.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </article>
      {modalOpen && (
        <AgentContactModal
          agent={agent}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function AgentContactModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const fullName = `${agent.nombre} ${agent.apellido || ''}`;

  const handleSubmit = (e: h.JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    showToast('Mensaje enviado correctamente', 'success');
    onClose();
  };

  return (
    <div
      class={styles.modalOverlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contactAgentTitle"
    >
      <div class={styles.modal}>
        <header class={styles.modalHeader}>
          <h3 id="contactAgentTitle">Contactar a {sanitizeText(fullName)}</h3>
          <button type="button" class={styles.modalClose} onClick={onClose} aria-label="Cerrar">&times;</button>
        </header>
        <form class={styles.modalForm} onSubmit={handleSubmit}>
          <input type="hidden" name="agent_id" value={agent.id} />
          <div class={styles.formGroup}>
            <label for="contactName">Tu nombre *</label>
            <input type="text" id="contactName" name="name" required autocomplete="name" placeholder="Tu nombre" class={styles.formInput} />
          </div>
          <div class={styles.formRow}>
            <div class={styles.formGroup}>
              <label for="contactEmail">Email *</label>
              <input type="email" id="contactEmail" name="email" required autocomplete="email" placeholder="tu@email.com" class={styles.formInput} />
            </div>
            <div class={styles.formGroup}>
              <label for="contactPhone">Teléfono</label>
              <input type="tel" id="contactPhone" name="phone" autocomplete="tel" placeholder="+54 9 351 XXX XXXX" class={styles.formInput} />
            </div>
          </div>
          <div class={styles.formGroup}>
            <label for="contactMessage">Mensaje *</label>
            <textarea id="contactMessage" name="message" required rows={4} placeholder={`Hola ${agent.nombre}, me interesa...`} class={styles.formTextarea} />
          </div>
          <div class={styles.modalActions}>
            <button type="button" class="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" class="btn btn-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="marginRight:6px"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
              Enviar mensaje
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgentsSkeleton() {
  return (
    <div class={styles.grid} aria-busy="true">
      {Array(4).fill(0).map(() => (
        <div class={styles.card}>
          <div class={`${styles.skeleton} ${styles.skeletonAvatar}`} />
          <div class={styles.info}>
            <div class={`${styles.skeleton} ${styles.skeletonName}`} />
            <div class={`${styles.skeleton} ${styles.skeletonRole}`} />
            <div class={`${styles.skeleton} ${styles.skeletonBio}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentsSection() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents().then((data) => {
      if (data) setAgents(data);
    });
  }, []);

  if (error) {
    return (
      <div class={styles.grid}>
        <div class={styles.emptyState}>
          <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" style="color:var(--color-warning);margin:0 auto 1rem;display:block">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
          </svg>
          <h3>Error al cargar el equipo</h3>
          <p>{error}</p>
          <button class="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!agents) return <AgentsSkeleton />;

  if (agents.length === 0) {
    return (
      <div class={styles.grid}>
        <div class={styles.emptyState}>
          <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" style="color:var(--color-text-muted);margin:0 auto 1rem;display:block">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
          </svg>
          <h3>No hay agentes registrados</h3>
          <p>No hay agentes activos para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div class={styles.grid}>
      {agents.map((agent, i) => (
        <AgentCard key={agent.id} agent={agent} index={i} />
      ))}
    </div>
  );
}

async function loadAgents(): Promise<Agent[] | null> {
  try {
    const { data, error } = await supabase
      .from('agentes')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) {
      return [];
    }
    logWarn('Agents load failed', { error: e }, 'agents');
    return null;
  }
}

// Legacy bridge — keeps modules/Agents.ts compatible exports
const agentsCache: Agent[] = [];

function initAgents() {
  const grid = document.getElementById('agentsGrid');
  if (!grid) return;
  render(h(AgentsSection, {}), grid);
}

export { agentsCache, initAgents, loadAgents };
export type { Agent };