import React, { useState, useMemo } from 'react';
import DefaultLayout from '../../layouts/DefaultLayout';
import './Trainings.css';
import drillsData from '../../constants/drills.json';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
// DrillModal not required here; using simple modal markup
import { jsPDF } from 'jspdf';

const Trainings = () => {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedSessions') || '[]'); } catch (e) { return []; }
  });
  const [viewSession, setViewSession] = useState(null);
  const navigate = useNavigate();
  const { addDrill, clearCart } = useCart();

  const refresh = () => {
    try { setSessions(JSON.parse(localStorage.getItem('savedSessions') || '[]')); } catch (e) { setSessions([]); }
  };

  const handleDelete = (id) => {
    const remaining = sessions.filter(s => s.id !== id);
    localStorage.setItem('savedSessions', JSON.stringify(remaining));
    setSessions(remaining);
  };

  const handleEdit = (session) => {
    // load drills into cart (clear first)
    clearCart();
    const drills = (session.drills || []).map(id => drillsData.find(d => d.id === id)).filter(Boolean);
    drills.forEach(d => addDrill(d));
    navigate('/session');
  };

  const handleView = (session) => {
    const drills = (session.drills || []).map(id => drillsData.find(d => d.id === id)).filter(Boolean);
    setViewSession({ ...session, drills });
  };

  const closeView = () => setViewSession(null);

  // helper image map and placeholder (similar to other pages)
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

  // Simple PDF generator for a saved session (compact): reuses logic from TrainingSession
  const generatePdfForSession = async (session, includeCover = false) => {
    if (!session) return;
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210; const pageHeight = 297; const margin = 15;
      const contentWidth = pageWidth - margin * 2; const imageAreaWidth = 38; const contentGap = 8; const rightTextWidth = contentWidth - imageAreaWidth - contentGap;

      const imgToDataUrl = (src) => new Promise((resolve) => {
        if (!src) return resolve(placeholderDataUrl);
        const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => {
          try { const canvas = document.createElement('canvas'); const maxW = 1600; const scale = img.width > maxW ? (maxW / img.width) : 1; canvas.width = Math.max(1, Math.floor(img.width * scale)); canvas.height = Math.max(1, Math.floor(img.height * scale)); const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/png')); } catch (e) { resolve(placeholderDataUrl); }
        }; img.onerror = () => resolve(placeholderDataUrl); img.src = src;
      });

      if (includeCover) { doc.setFontSize(28); doc.text('Training', pageWidth/2, 80, {align:'center'}); doc.setFontSize(14); doc.text(`Naam: ${session.name}`, pageWidth/2, 95, {align:'center'}); doc.addPage(); }

      const logoCandidates = ['basketdesselgem.png','basket-desselgem.png','basketdesselgem.svg','basket-desselgem.svg','basket_logo.png','basket.png','logo-basket.png'];
      let logoSrc = null; for (const c of logoCandidates) { if (imageMap && imageMap[c]) { logoSrc = imageMap[c]; break; } }
      if (!logoSrc) logoSrc = (process.env.PUBLIC_URL || '') + '/basket-desselgem.png';
      let logoData = null; try { logoData = await imgToDataUrl(logoSrc); } catch (e) { logoData = null; }

      let cursorY = 28; const pageBottomLimit = pageHeight - margin - 20; const logoHeight = 12; const logoYOffset = 8;

      const drills = (session.drills || []).map(id => drillsData.find(d => d.id === id)).filter(Boolean);
      for (let i=0;i<drills.length;i++){
        const drill = drills[i];
        // separator
        if (i>0) { doc.setDrawColor(230,230,230); doc.setLineWidth(0.3); doc.line(margin, cursorY-6, pageWidth-margin, cursorY-6); }

        // images
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
      doc.save(`${session.name || 'training'}.pdf`);
    } catch (err) { console.error('PDF failed', err); alert('Fout bij genereren van PDF'); }
  };

  return (
    <DefaultLayout>
      <div className="trainings-container">
        <div className="trainings-header">
          <h1>Opgeslagen trainingen</h1>
        </div>
        {sessions.length === 0 ? (
          <p>Geen opgeslagen trainingen gevonden</p>
        ) : (
          <div className="sessions-list">
            {sessions.map(s => (
              <div key={s.id} className="session-item">
                <div className="session-main">
                  <div className="session-name">{s.name}</div>
                  <div className="session-meta">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div className="session-actions">
                  <button onClick={() => handleView(s)} className="btn">Bekijk</button>
                  <button onClick={() => handleEdit(s)} className="btn">Bewerk</button>
                  <button onClick={() => generatePdfForSession(s, true)} className="btn">PDF</button>
                  <button onClick={() => handleDelete(s.id)} className="btn danger">Verwijder</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewSession && (
          <div className="view-modal-overlay" onClick={closeView}>
            <div className="view-modal" onClick={e => e.stopPropagation()}>
              <h3>{viewSession.name}</h3>
              <div className="view-list">
                {viewSession.drills.map(d => (
                  <div key={d.id} className="view-drill">
                    <div className="v-left"><img src={ (d.picture && d.picture.length>0 && imageMap[d.picture[0]]) ? imageMap[d.picture[0]] : placeholderDataUrl } alt="" /></div>
                    <div className="v-right"><strong>{d.name}</strong><p>{d.description}</p></div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button className="btn" onClick={() => generatePdfForSession(viewSession, false)}>Genereer PDF</button>
                <button className="btn" onClick={closeView}>Sluiten</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default Trainings;
