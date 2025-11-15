import React, { useState, useMemo, useEffect } from 'react';
import DefaultLayout from '../../layouts/DefaultLayout';
import './Trainings.css';
import '../TrainingSession/TrainingSession.css';
import drillsData from '../../constants/drills.json';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';

const SharedTraining = () => {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [imageIdxs, setImageIdxs] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Save modal state
  const [saveModal, setSaveModal] = useState(false);
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
  const showSaveMessage = (msg) => { setSaveMessage(msg); setTimeout(() => setSaveMessage(''), 2200); };

  // PDF modal state (Met / Zonder voorblad)
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const handleDragStart = (e, index) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) { setDraggedIndex(null); return; }
    setSession(prev => {
      if (!prev) return prev;
      const arr = Array.from(prev.drills || []);
      const item = arr.splice(draggedIndex, 1)[0];
      arr.splice(dropIndex, 0, item);
      return { ...prev, drills: arr };
    });
    setDraggedIndex(null);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  useEffect(() => {
    try {
      const sessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
      // id may include a slug (e.g. 163456789-training-name). Extract numeric prefix
      const raw = String(id || '');
      const numPart = raw.split('-')[0];
      const sid = parseInt(numPart, 10);
      const s = sessions.find(x => Number(x.id) === sid);
      if (s) {
        const drills = (s.drills || []).map(i => drillsData.find(d => d.id === i)).filter(Boolean);
        setSession({ ...s, drills });
        // init image indexes for the drills
        const idxs = {};
        drills.forEach(d => { idxs[d.id] = 0; });
        setImageIdxs(idxs);
      } else {
        setSession(null);
      }
    } catch (e) {
      setSession(null);
    }
  }, [id]);

  const placeholderSvg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f0f0f0' /><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏀</text></svg>`;
  const placeholderDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

  const imageMap = useMemo(() => {
    try {
      const req = require.context('../../assets/Images/drills', false, /\.(png|jpe?g|svg)$/i);
      const map = {};
      req.keys().forEach(key => { const fileName = key.replace('./',''); const mod = req(key); map[fileName] = mod && mod.default ? mod.default : mod; });
      return map;
    } catch (e) { return {}; }
  }, []);

  const imgToDataUrl = (src) => new Promise((resolve) => {
    if (!src) return resolve(placeholderDataUrl);
    const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => {
      try { const canvas = document.createElement('canvas'); const maxW = 1600; const scale = img.width > maxW ? (maxW / img.width) : 1; canvas.width = Math.max(1, Math.floor(img.width * scale)); canvas.height = Math.max(1, Math.floor(img.height * scale)); const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/png')); } catch (e) { resolve(placeholderDataUrl); }
    }; img.onerror = () => resolve(placeholderDataUrl); img.src = src;
  });

  const generatePdfForSession = async (sess, includeCover = false) => {
    if (!sess) return;
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210; const pageHeight = 297; const margin = 15;
      const contentWidth = pageWidth - margin * 2; const imageAreaWidth = 38; const contentGap = 8; const rightTextWidth = contentWidth - imageAreaWidth - contentGap;

      // cover
      if (includeCover) {
        let coverSrc = null;
        try {
          const coverCandidates = ['cover.jpg','cover.png','cover.jpeg','basketdesselgem-cover.png','basket-desselgem.png','basketdesselgem.png','basket_logo.png','basket.png'];
          for (const c of coverCandidates) { if (imageMap && imageMap[c]) { coverSrc = imageMap[c]; break; } }
          if (!coverSrc) coverSrc = (process.env.PUBLIC_URL || '') + '/cover.png';
        } catch (e) { coverSrc = (process.env.PUBLIC_URL || '') + '/cover.png'; }
        try {
          const coverData = await imgToDataUrl(coverSrc);
          const coverType = (typeof coverData === 'string' && coverData.indexOf('data:image/png') === 0) ? 'PNG' : 'JPEG';
          doc.addImage(coverData, coverType, 0, 0, pageWidth, pageHeight);
        } catch (e) {
          doc.setFontSize(28); doc.text('Training', pageWidth/2, 80, {align:'center'});
          doc.setFontSize(14); doc.text(`Naam: ${sess.name}`, pageWidth/2, 95, {align:'center'});
        }
        doc.addPage();
      }

      const logoCandidates = ['basketdesselgem.png','basket-desselgem.png','basketdesselgem.svg','basket-desselgem.svg','basket_logo.png','basket.png','logo-basket.png'];
      let logoSrc = null; for (const c of logoCandidates) { if (imageMap && imageMap[c]) { logoSrc = imageMap[c]; break; } }
      if (!logoSrc) logoSrc = (process.env.PUBLIC_URL || '') + '/basket-desselgem.png';
      let logoData = null; try { logoData = await imgToDataUrl(logoSrc); } catch (e) { logoData = null; }

      let cursorY = 28; const pageBottomLimit = pageHeight - margin - 20; const logoHeight = 12; const logoYOffset = 8;

      const drills = sess.drills || [];
      for (let i=0;i<drills.length;i++){
        const drill = drills[i];
        if (i>0) { doc.setDrawColor(230,230,230); doc.setLineWidth(0.3); doc.line(margin, cursorY-6, pageWidth-margin, cursorY-6); }

        const pictures = Array.isArray(drill.picture)?drill.picture:(drill.picture?[drill.picture]:[]);
        const imgSrc = pictures.length>0 && imageMap[pictures[0]] ? imageMap[pictures[0]] : (pictures[0]||placeholderDataUrl);
        const imgData = await imgToDataUrl(imgSrc);
        try { doc.addImage(imgData, (typeof imgData==='string' && imgData.indexOf('data:image/png')===0)?'PNG':'JPEG', margin, cursorY, imageAreaWidth, 30); } catch(e){ }

        doc.setFontSize(14); doc.text(`${i+1}. ${drill.name}`, margin + imageAreaWidth + contentGap, cursorY + 6);
        doc.setFontSize(10); const desc = doc.splitTextToSize(drill.description || '', rightTextWidth); doc.text(desc, margin + imageAreaWidth + contentGap, cursorY + 14);
        cursorY += Math.max(34, desc.length*6 + 16);
        if (cursorY > pageBottomLimit) { if (logoData) { try { const logoW=28; const logoType = (typeof logoData==='string' && logoData.indexOf('data:image/png')===0)?'PNG':'JPEG'; doc.addImage(logoData, logoType, pageWidth-margin-logoW, pageHeight-margin-logoHeight-logoYOffset, logoW, logoHeight); } catch(e){} } doc.addPage(); cursorY=28; }
      }
      if (logoData) { try { const logoType = (typeof logoData==='string' && logoData.indexOf('data:image/png')===0)?'PNG':'JPEG'; doc.addImage(logoData, logoType, pageWidth-margin-28, pageHeight-margin-logoHeight-logoYOffset, 28, logoHeight); } catch(e){} }

      doc.save(`${sess.name || 'training'}.pdf`);
    } catch (err) { console.error('PDF failed', err); alert('Fout bij genereren van PDF'); }
  };

  if (!session) {
    return (
      <DefaultLayout>
        <div style={{padding:40}}>
          <h2>Training niet gevonden</h2>
          <p>De gedeelde training kon niet worden geladen of bestaat niet meer.</p>
        </div>
      </DefaultLayout>
    );
  }
  const totalDuration = (session.drills || []).reduce((s, d) => s + (d.duration || 0), 0);

  return (
    <DefaultLayout>
      <div className="session-container">
        <div className="session-header">
          <h1>{session.name}</h1>
          <div className="session-stats">
            <span className="total-duration">{totalDuration} minuten</span>
            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <button className="save-btn" onClick={() => { setSaveName(defaultSaveName); setSaveModal(true); }}>Opslaan</button>
              <button className="start-session-top start-session-btn" onClick={() => setPdfModalOpen(true)}>Genereer PDF</button>
            </div>
          </div>
        </div>

        <div className="drills-list">
          {session.drills.map((d, index) => {
            const pictures = Array.isArray(d.picture) ? d.picture : (d.picture ? [d.picture] : []);
            const len = pictures.length;
            const idx = imageIdxs[d.id] || 0;
            const filename = len > 0 ? pictures[idx] : null;
            const src = filename && imageMap[filename] ? imageMap[filename] : placeholderDataUrl;
            const hasMultiple = len > 1;

            const prevImg = (e) => { e.stopPropagation(); setImageIdxs(prev => ({ ...prev, [d.id]: ((prev[d.id] || 0) - 1 + len) % len })); };
            const nextImg = (e) => { e.stopPropagation(); setImageIdxs(prev => ({ ...prev, [d.id]: ((prev[d.id] || 0) + 1) % len })); };

            return (
              <div
                key={d.id}
                className={`session-drill ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="drill-order">{index + 1}</div>
                <div className="drill-info">
                  <div className="drill-main">
                    <div className="drill-thumb">
                      <img src={src} alt={d.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderDataUrl; }} />
                      {hasMultiple && (
                        <>
                          <button className="img-nav img-prev" onClick={prevImg} aria-label="Vorige afbeelding">‹</button>
                          <button className="img-nav img-next" onClick={nextImg} aria-label="Volgende afbeelding">›</button>
                          <div className="img-counter">{idx + 1}/{len}</div>
                        </>
                      )}
                    </div>
                    <div className="drill-main-text">
                      <h3>{d.name}</h3>
                      <p>{d.description}</p>
                    </div>
                  </div>
                  <div className="drill-meta">
                    <span>👥 {d.ageGroup}</span>
                    <span>⏱️ {d.duration} min</span>
                    <span>🏀 {(d.equipment || []).join(', ')}</span>
                  </div>
                  <div className="drill-tags">
                    {(d.tags || []).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="drag-handle">⋮⋮</div>
              </div>
            );
          })}
        </div>
        {/* Save modal overlay */}
        {saveModal && (
          <div className="save-modal-overlay" onClick={() => setSaveModal(false)}>
            <div className="save-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Opslaan als</h3>
              <input type="text" placeholder="Naam voor deze training" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button className="btn-secondary" onClick={() => setSaveModal(false)}>Annuleren</button>
                <button className="start-session-btn" onClick={() => {
                  const name = (saveName || '').trim();
                  if (!name) { showSaveMessage('Geef een naam op'); return; }
                  try {
                    const key = 'savedSessions';
                    const existing = JSON.parse(localStorage.getItem(key) || '[]');
                    const payload = {
                      id: Date.now(),
                      name,
                      drills: (session.drills || []).map(d => d.id),
                      createdAt: new Date().toISOString()
                    };
                    existing.push(payload);
                    localStorage.setItem(key, JSON.stringify(existing));
                    setSaveModal(false);
                    showSaveMessage('Training opgeslagen');
                  } catch (e) { console.error(e); showSaveMessage('Fout bij opslaan'); }
                }}>Opslaan</button>
              </div>
            </div>
          </div>
        )}

        {saveMessage && (
          <div className="save-toast">{saveMessage}</div>
        )}
        {/* PDF choice modal (Met / Zonder voorblad) */}
        {pdfModalOpen && (
          <div className="save-modal-overlay" onClick={() => setPdfModalOpen(false)}>
            <div className="save-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Genereer PDF</h3>
              <p>Wil je een voorblad toevoegen aan de PDF?</p>
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button className="start-session-btn" onClick={() => { setPdfModalOpen(false); generatePdfForSession(session, false); }}>Zonder voorblad</button>
                <button className="start-session-btn" onClick={() => { setPdfModalOpen(false); generatePdfForSession(session, true); }}>Met voorblad</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default SharedTraining;
