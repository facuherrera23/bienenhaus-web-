// ================================================================
// PROPERTY AGENT - Agente asignado a la propiedad
// ================================================================

import './PropertyAgent.css';

export function PropertyAgent({ agent }) {
  if (!agent) {
    return (
      <div className="property-agent">
        <p className="property-agent__empty">
          <i className="fas fa-user-tie" aria-hidden="true"></i>
          Sin agente asignado
        </p>
      </div>
    );
  }

  return (
    <div className="property-agent">
      <div className="property-agent__card">
        <div className="property-agent__avatar">
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={`${agent.nombre} ${agent.apellido}`} />
          ) : (
            <span className="property-agent__avatar-placeholder">
              {agent.nombre?.[0]}{agent.apellido?.[0]}
            </span>
          )}
        </div>
        
        <div className="property-agent__info">
          <h3 className="property-agent__name">
            {agent.nombre} {agent.apellido}
          </h3>
          <p className="property-agent__specialty">{agent.especialidad}</p>
          
          <div className="property-agent__contacts">
            {agent.telefono && (
              <a href={`tel:${agent.telefono}`} className="property-agent__contact">
                <i className="fas fa-phone" aria-hidden="true"></i>
                {agent.telefono}
              </a>
            )}
            
            {agent.email && (
              <a href={`mailto:${agent.email}`} className="property-agent__contact">
                <i className="fas fa-envelope" aria-hidden="true"></i>
                {agent.email}
              </a>
            )}
          </div>
        </div>
        
        <div className="property-agent__actions">
          <button className="btn btn-secondary btn-sm">
            <i className="fas fa-envelope" aria-hidden="true"></i>
            Contactar
          </button>
          <button className="btn btn-primary btn-sm">
            <i className="fab fa-whatsapp" aria-hidden="true"></i>
            WhatsApp
          </button>
        </div>
      </div>
      
      {agent.descripcion && (
        <div className="property-agent__bio">
          <h4>Sobre el agente</h4>
          <p>{agent.descripcion}</p>
        </div>
      )}
    </div>
  );
}

export default PropertyAgent;