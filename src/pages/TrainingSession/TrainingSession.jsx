import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import DefaultLayout from '../../layouts/DefaultLayout';
import './TrainingSession.css';
import drillsData from '../../constants/drills.json';
import DrillModal from '../../components/DrillCard/DrillModal';

const TrainingSession = () => {
  const { selectedDrills, removeDrill, getTotalDuration, reorderDrills } = useCart();
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderDrills(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Modal state for viewing a drill
  const [modalDrill, setModalDrill] = useState(null);
  const openModal = (drill) => setModalDrill(drill);
  const closeModal = () => setModalDrill(null);

  // Save training modal & persistence
  const [saveModal, setSaveModal] = useState(false);
  // default save name: "Training - DD/MM/YY" for tomorrow
  const defaultSaveName = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `Training - ${dd}/${mm}/${yy}`;
  }, []);
  const [saveName, setSaveName] = useState(defaultSaveName);
  const [saveMessage, setSaveMessage] = useState('');

  const showSaveMessage = (msg) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 2200);
  };

  const handleSave = () => {
    const name = (saveName || '').trim();
    if (!name) { showSaveMessage('Geef een naam op'); return; }
    try {
      const key = 'savedSessions';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const payload = {
        id: Date.now(),
        name,
        drills: selectedDrills.map(d => d.id),
        createdAt: new Date().toISOString()
      };
      existing.push(payload);
      localStorage.setItem(key, JSON.stringify(existing));
      setSaveModal(false);
      setSaveName('');
      showSaveMessage('Training opgeslagen');
    } catch (e) {
      console.error(e);
      showSaveMessage('Fout bij opslaan');
    }
  };

  // per-drill image indexes for thumbnail carousel in the session list
  const [imgIndexes, setImgIndexes] = useState({});
  const prevThumb = (e, drillId, len) => {
    e.stopPropagation();
    e.preventDefault();
    setImgIndexes(prev => {
      const cur = prev[drillId] || 0;
      return { ...prev, [drillId]: (cur - 1 + len) % len };
    });
  };
  const nextThumb = (e, drillId, len) => {
    e.stopPropagation();
    e.preventDefault();
    setImgIndexes(prev => {
      const cur = prev[drillId] || 0;
      return { ...prev, [drillId]: (cur + 1) % len };
    });
  };

  // small placeholder svg data URL (same logic as Home)
  const placeholderSvg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <rect width='100%' height='100%' fill='%23f0f0f0' />
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏀</text>
  </svg>`;
  const placeholderDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

  // Build image map from assets (webpack require.context)
  const imageMap = useMemo(() => {
    try {
      const req = require.context('../../assets/Images/drills', false, /\.(png|jpe?g|svg)$/i);
      const map = {};
      req.keys().forEach(key => {
        const fileName = key.replace('./', '');
        const mod = req(key);
        map[fileName] = mod && mod.default ? mod.default : mod;
      });
      return map;
    } catch (e) {
      return {};
    }
  }, []);

  // tag color mapping (deterministic)
  const tagColors = useMemo(() => {
    const tags = new Set();
    drillsData.forEach(d => d.tags.forEach(t => tags.add(t)));
    const palette = ['#43669e', '#c05b4b', '#3c3841', '#6b8bb3', '#d47968', '#5a5762'];
    const map = {};
    Array.from(tags).sort().forEach((tag, i) => map[tag] = palette[i % palette.length]);
    return map;
  }, []);

  const getTextColor = (hex) => {
    if (!hex) return '#000';
    const c = hex.substring(1);
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    const yiq = (r*299 + g*587 + b*114)/1000;
    return yiq >= 128 ? '#000' : '#fff';
  };

  if (selectedDrills.length === 0) {
    return (
      <DefaultLayout>
        <div className="session-container">
          <div className="session-header">
            <Link to="/" className="back-link">Terug naar oefeningen</Link>
            <h1>Mijn Training</h1>
          </div>
          <div className="empty-session">
            <h2>Geen oefeningen geselecteerd</h2>
            <p>Ga terug naar de oefeningen pagina om oefeningen toe te voegen aan je training.</p>
            <Link to="/" className="btn-primary">Oefeningen bekijken</Link>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="session-container">
        <div className="session-header">
          <h1>Mijn Training</h1>
          <div className="session-stats">
            <span className="total-duration">{getTotalDuration()} minuten</span>
            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <button className="save-btn" onClick={() => { setSaveName(defaultSaveName); setSaveModal(true); }} disabled={selectedDrills.length === 0}>Opslaan</button>
              <button className="start-session-top start-session-btn" onClick={() => {/* start session action can go here */}}>Start Training</button>
            </div>
          </div>
        </div>

        {/* Start training button moved to the header (replaces previous instructions) */}

        <div className="drills-list">
          {selectedDrills.map((drill, index) => (
            <div
              key={drill.id}
              className={`session-drill ${draggedIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => openModal(drill)}
            >
              <div className="drill-order">{index + 1}</div>
              <div className="drill-info">
                <div className="drill-main">
                  <div className="drill-thumb">
                    {/* thumbnail image with optional local carousel controls */}
                    {(() => {
                      const pictures = Array.isArray(drill.picture) ? drill.picture : (drill.picture ? [drill.picture] : []);
                      const len = pictures.length;
                      const idx = imgIndexes[drill.id] || 0;
                      const filename = len > 0 ? pictures[idx] : null;
                      const src = filename && imageMap[filename] ? imageMap[filename] : placeholderDataUrl;
                      return (
                        <>
                          <img src={src} alt={drill.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderDataUrl; }} />
                          {len > 1 && (
                            <>
                              <button className="img-nav img-prev" onClick={(e) => prevThumb(e, drill.id, len)} aria-label="Vorige afbeelding">‹</button>
                              <button className="img-nav img-next" onClick={(e) => nextThumb(e, drill.id, len)} aria-label="Volgende afbeelding">›</button>
                              <div className="img-counter">{idx + 1}/{len}</div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="drill-main-text">
                    <h3>{drill.name}</h3>
                    <p>{drill.description}</p>
                  </div>
                </div>
                <div className="drill-meta">
                  <span>👥 {drill.ageGroup}</span>
                  <span>⏱️ {drill.duration} min</span>
                  <span>🏀 {drill.equipment.join(', ')}</span>
                </div>
                <div className="drill-tags">
                  {drill.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              <button
                className="remove-drill-btn"
                onClick={(e) => { e.stopPropagation(); removeDrill(drill.id); }}
                aria-label="Verwijder oefening"
              >
                ✕
              </button>
              <div className="drag-handle">⋮⋮</div>
            </div>
          ))}
        </div>

        {modalDrill && (
          <DrillModal
            drill={modalDrill}
            onClose={closeModal}
            imageMap={imageMap}
            placeholderDataUrl={placeholderDataUrl}
            tagColors={tagColors}
            getTextColor={getTextColor}
          />
        )}

        {/* Save modal overlay */}
        {saveModal && (
          <div className="save-modal-overlay" onClick={() => setSaveModal(false)}>
            <div className="save-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Opslaan als</h3>
              <input type="text" placeholder="Naam voor deze training" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button className="btn-secondary" onClick={() => setSaveModal(false)}>Annuleren</button>
                <button className="start-session-btn" onClick={handleSave}>Opslaan</button>
              </div>
            </div>
          </div>
        )}

        {/* Small transient message shown top-right */}
        {saveMessage && (
          <div className="save-toast">{saveMessage}</div>
        )}

        {/* session actions moved to header; bottom start button removed */}
      </div>
    </DefaultLayout>
  );
};

export default TrainingSession;