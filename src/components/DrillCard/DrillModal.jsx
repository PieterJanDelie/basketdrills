import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';

const DrillModal = ({ drill, onClose, imageMap, placeholderDataUrl, tagColors, getTextColor, showToast, drillUsage }) => {
  const [idx, setIdx] = useState(0);
  const { addDrill, removeDrill, isInCart } = useCart();

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  React.useEffect(() => { setIdx(0); }, [drill]);

  if (!drill) return null;

  const pictures = Array.isArray(drill.picture) ? drill.picture : (drill.picture ? [drill.picture] : []);
  const src = pictures.length > 0 && imageMap[pictures[idx]] ? imageMap[pictures[idx]] : placeholderDataUrl;
  const intensityVal = Number(drill.intensity) || 0;
  const intensityColorClass = intensityVal === 1 ? 'intensity-green' : intensityVal === 2 ? 'intensity-orange' : intensityVal === 3 ? 'intensity-red' : '';

  return (
    <div className="drill-modal-overlay" onClick={onClose}>
      <div className="drill-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Sluit">×</button>
        <div className="modal-body">
          <div className="modal-images">
            <img src={src} alt={drill.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderDataUrl; }} />
            {pictures.length > 1 && (
              <>
                <button className="img-nav img-prev" onClick={() => setIdx(i => (i - 1 + pictures.length) % pictures.length)}>‹</button>
                <button className="img-nav img-next" onClick={() => setIdx(i => (i + 1) % pictures.length)}>›</button>
                <div className="img-counter">{idx + 1}/{pictures.length}</div>
              </>
            )}
          </div>

          <div className="modal-details">
            <div className="modal-header">
              <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',width:'100%'}}>
                <h2 className="modal-title">{drill.name}</h2>
                <div className="modal-usage" title={`Voorkomst in opgeslagen trainingen: ${drillUsage && drillUsage[drill.id] ? drillUsage[drill.id] : 0}`}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                  </svg>
                  <span style={{fontWeight:700}}>{drillUsage && drillUsage[drill.id] ? drillUsage[drill.id] : 0}</span>
                </div>
              </div>
              <div className="modal-tags">
                {drill.tags.map(tag => (
                  <span key={tag} className="drill-tag-pill" style={{ backgroundColor: tagColors[tag], color: getTextColor(tagColors[tag]) }}>{tag}</span>
                ))}
              </div>
            </div>

            <section className="modal-section">
              <h3 className="section-title">Beschrijving</h3>
              <p className="modal-desc">{drill.description}</p>
            </section>

            <section className="modal-section">
              <h3 className="section-title">Details</h3>
              <div className="details-cards">
                <div className="detail-card">
                  <div className="detail-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3z" fill="#43669e"/>
                      <path d="M8 13c-2.67 0-8 1.337-8 4v2h16v-2c0-2.663-5.33-4-8-4zm8 0c-.29 0-.577.02-.86.058 1.135.678 1.86 1.747 1.86 2.942v2H24v-2c0-2.663-5.33-4-8-4z" fill="#6b8bb3"/>
                    </svg>
                  </div>
                  <div className="detail-body">
                    <div className="detail-label">Leeftijd</div>
                    <div className="detail-value">{drill.ageGroup || '—'}</div>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="#43669e" strokeWidth="1.5" fill="rgba(67,102,158,0.06)" />
                      <path d="M12 7v6l4 2" stroke="#43669e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="detail-body">
                    <div className="detail-label">Duur</div>
                    <div className="detail-value">{drill.duration ? `${drill.duration} min` : '—'}</div>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3v18h18" stroke="#43669e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 13l4-4 4 6 4-8" stroke="#6b8bb3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="detail-body">
                    <div className="detail-label">Intensiteit</div>
                    <div className="detail-value">
                      <div className="intensity">
                        {([1,2,3]).map(i => (
                          <span key={i} className={`intensity-dot ${i <= intensityVal ? 'active ' + intensityColorClass : ''}`} />
                        ))}
                        <div className="intensity-label">{Number(drill.intensity) === 1 ? 'Licht' : Number(drill.intensity) === 2 ? 'Gemiddeld' : Number(drill.intensity) === 3 ? 'Zwaar' : '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="modal-section">
              <h3 className="section-title">Materiaal</h3>
              <ul className="equipment-list">
                {Array.isArray(drill.equipment) && drill.equipment.length > 0 ? (
                  drill.equipment.map((eq, i) => (
                    <li key={i}><span className="equip-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="#43669e" strokeWidth="1.3" fill="rgba(67,102,158,0.04)"/>
                        <path d="M4 12h16M12 4v16M6 6l12 12M6 18L18 6" stroke="#6b8bb3" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span> {eq}</li>
                  ))
                ) : (
                  <li>Geen speciale uitrusting nodig</li>
                )}
              </ul>
            </section>

            <div className="modal-actions">
              <button
                className={`add-btn ${isInCart(drill.id) ? 'in-cart' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInCart(drill.id)) {
                    removeDrill(drill.id);
                    showToast && showToast('Verwijderd uit training');
                  } else {
                    addDrill(drill);
                    showToast && showToast('Toegevoegd aan training');
                  }
                }}
              >
                {isInCart(drill.id) ? 'Verwijder uit training' : 'Voeg toe aan training'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillModal;
