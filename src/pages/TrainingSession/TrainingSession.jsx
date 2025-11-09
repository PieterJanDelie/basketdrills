import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import DefaultLayout from '../../layouts/DefaultLayout';
import './TrainingSession.css';
import drillsData from '../../constants/drills.json';
import DrillModal from '../../components/DrillCard/DrillModal';
import { jsPDF } from 'jspdf';

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

  // Small inline SVG placeholder (data URL). Used when an image is missing/broken.
  const placeholderSvg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <rect width='100%' height='100%' fill='%23f0f0f0' />
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏀</text>
  </svg>`;
  const placeholderDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

  // Build a map of available images from the drills assets folder so we can reference them by filename
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

  // Local small state for thumbnail indexes in the session list (one index per drill id)
  const [imgIndexes, setImgIndexes] = useState({});
  const prevThumb = (e, id, len) => { e.stopPropagation(); setImgIndexes(prev => ({ ...prev, [id]: ((prev[id] || 0) - 1 + len) % len })); };
  const nextThumb = (e, id, len) => { e.stopPropagation(); setImgIndexes(prev => ({ ...prev, [id]: ((prev[id] || 0) + 1) % len })); };

  // Save training modal & persistence
  const [saveModal, setSaveModal] = useState(false);
  // PDF choice modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
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

  // PDF generation: prompt for cover page then build a PDF with drills in order
  const handleGeneratePdf = async (includeCover = false) => {
    if (!selectedDrills || selectedDrills.length === 0) {
      setPdfModalOpen(false);
      return;
    }
    // close modal when starting generation
    setPdfModalOpen(false);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210; // mm for A4
  const pageHeight = 297; // mm for A4
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const imageAreaWidth = 40; // mm reserved for the image on the left (smaller for multiple images)
  const contentGap = 8; // gap between image and text
  const rightTextWidth = contentWidth - imageAreaWidth - contentGap;

      // helper: convert an image src to a base64 data URL via canvas (fallback to placeholder)
      const imgToDataUrl = (src) => new Promise((resolve) => {
        if (!src) return resolve(placeholderDataUrl);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            // limit canvas size for performance
            const maxW = 1600;
            const scale = img.width > maxW ? (maxW / img.width) : 1;
            canvas.width = Math.max(1, Math.floor(img.width * scale));
            canvas.height = Math.max(1, Math.floor(img.height * scale));
            const ctx = canvas.getContext('2d');
            // draw with transparency preserved
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // use PNG to preserve transparency (avoids black background)
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (err) {
            resolve(placeholderDataUrl);
          }
        };
        img.onerror = () => resolve(placeholderDataUrl);
        img.src = src;
      });

      if (includeCover) {
        // cover page
        doc.setFontSize(28);
        doc.text('Training', pageWidth / 2, 80, { align: 'center' });
        doc.setFontSize(14);
        const date = new Date();
        doc.text(`Gemaakt op: ${date.toLocaleDateString()}`, pageWidth / 2, 95, { align: 'center' });
        doc.addPage();
      }
      // attempt to find a small BasketDesselgem logo; check imageMap first, then a public fallback
      let logoSrc = null;
      try {
        const candidates = ['basketdesselgem.png','basket-desselgem.png','basketdesselgem.svg','basket-desselgem.svg','basket_logo.png','basket.png','logo-basket.png'];
        for (const c of candidates) {
          if (imageMap && imageMap[c]) { logoSrc = imageMap[c]; break; }
        }
        if (!logoSrc) logoSrc = (process.env.PUBLIC_URL || '') + '/basket-desselgem.png';
      } catch (e) {
        logoSrc = null;
      }

      let logoData = null;
      if (logoSrc) {
        try { logoData = await imgToDataUrl(logoSrc); } catch (e) { logoData = null; }
      }

      const topStart = 28;
      let cursorY = topStart;
      const pageBottomLimit = pageHeight - margin - 16; // reserve for logo
      const logoHeight = 12;
  const logoYOffset = 8; // raise logo by this many mm from bottom margin

      for (let i = 0; i < selectedDrills.length; i++) {
        const drill = selectedDrills[i];

        // images
        const pics = Array.isArray(drill.picture) ? drill.picture : (drill.picture ? [drill.picture] : []);
        const maxPics = 4;
        const usedPics = pics.slice(0, maxPics);
        const spacing = 4;
        const perImgMaxHeight = Math.min(60, Math.max(18, Math.floor((90 - (usedPics.length - 1) * spacing) / Math.max(1, usedPics.length))));
        const imageStackHeight = usedPics.length > 0 ? (usedPics.length * perImgMaxHeight + (usedPics.length - 1) * spacing) : perImgMaxHeight;

        // estimate text height
        doc.setFontSize(11);
        const titleHeight = 8;
        const metaHeight = 6;
        const descLines = doc.splitTextToSize(drill.description || '', rightTextWidth);
        const descHeight = descLines.length * 6;
        const tagsHeight = (drill.tags && drill.tags.length > 0) ? 8 : 0;
        const estimatedHeight = Math.max(imageStackHeight, titleHeight + metaHeight + descHeight + tagsHeight) + 12;

        // draw separator before this drill (except first)
        if (i > 0) {
          try {
            const lineY = cursorY - 6; // small offset above drill
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.3);
            doc.line(margin, lineY, pageWidth - margin, lineY);
          } catch (e) { /* ignore drawing errors */ }
        }

        // paginate if needed
        if (cursorY + estimatedHeight > pageBottomLimit) {
          if (logoData) {
            try {
              // draw logo as PNG if possible to preserve transparency
              const logoWidth = 28;
              const logoType = (typeof logoData === 'string' && logoData.indexOf('data:image/png') === 0) ? 'PNG' : 'JPEG';
              const logoY = pageHeight - margin - logoHeight - logoYOffset;
              doc.addImage(logoData, logoType, pageWidth - margin - logoWidth, logoY, logoWidth, logoHeight);
            } catch (e) { /* ignore */ }
          }
          doc.addPage();
          cursorY = topStart;
        }

        // render images column (stacked)
        const imgX = margin;
        for (let p = 0; p < usedPics.length; p++) {
          const picName = usedPics[p];
          const src = (imageMap && imageMap[picName]) ? imageMap[picName] : picName || placeholderDataUrl;
          const imgData = await imgToDataUrl(src);
          const imgObj = await new Promise((res) => {
            const im = new Image(); im.onload = () => res({ w: im.width, h: im.height }); im.onerror = () => res({ w: 1, h: 1 }); im.src = imgData;
          });
          const wmm = imageAreaWidth;
          const hmm = Math.min(perImgMaxHeight, (imgObj.h / Math.max(1, imgObj.w)) * wmm);
          const y = cursorY + p * (perImgMaxHeight + spacing);
          try {
            const imgType = (typeof imgData === 'string' && imgData.indexOf('data:image/png') === 0) ? 'PNG' : 'JPEG';
            doc.addImage(imgData, imgType, imgX, y, wmm, hmm);
          } catch (e) { /* ignore image errors */ }
        }

        // right column text
        const rightX = margin + imageAreaWidth + contentGap;
        doc.setFontSize(18);
        doc.text(`${i + 1}. ${drill.name}`, rightX, cursorY + 6);
        doc.setFontSize(11);
        const meta = `Duur: ${drill.duration || '-'} min    Leeftijd: ${drill.ageGroup || '-'}    Materiaal: ${(drill.equipment || []).join(', ')}`;
        doc.text(meta, rightX, cursorY + 12);
        doc.text(descLines, rightX, cursorY + 18);
        if (drill.tags && drill.tags.length > 0) {
          doc.setFontSize(10);
          doc.text('Tags: ' + drill.tags.join(', '), rightX, cursorY + 18 + descLines.length * 6 + 4);
        }

        cursorY += estimatedHeight;
      }

      // draw logo on final page
      if (logoData) {
        try {
          const logoWidth = 28;
          const logoType = (typeof logoData === 'string' && logoData.indexOf('data:image/png') === 0) ? 'PNG' : 'JPEG';
          const logoY = pageHeight - margin - logoHeight - logoYOffset;
          doc.addImage(logoData, logoType, pageWidth - margin - logoWidth, logoY, logoWidth, logoHeight);
        } catch (e) { /* ignore */ }
      }

      const fileName = `training_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Fout bij het genereren van de PDF');
    }

  };
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
              <button className="start-session-top start-session-btn" onClick={() => setPdfModalOpen(true)} disabled={selectedDrills.length === 0}>Genereer PDF</button>
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

        {/* PDF choice modal (Met / Zonder voorblad) */}
        {pdfModalOpen && (
          <div className="save-modal-overlay" onClick={() => setPdfModalOpen(false)}>
            <div className="save-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Genereer PDF</h3>
              <p>Wil je een voorblad toevoegen aan de PDF?</p>
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button className="start-session-btn" onClick={() => handleGeneratePdf(false)}>Zonder voorblad</button>
                <button className="start-session-btn" onClick={() => handleGeneratePdf(true)}>Met voorblad</button>
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