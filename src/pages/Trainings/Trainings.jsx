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
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pendingPdfSession, setPendingPdfSession] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const toastTimer = React.useRef(null);
  const navigate = useNavigate();
  const { addDrill, clearCart } = useCart();

  

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
    navigate('/sessie');
  };

  const handleShare = (id) => {
    const makeSlug = (name) => {
      if (!name) return '';
      return name.toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    };

    try {
      const sess = sessions.find(s => String(s.id) === String(id));
      const slugPart = sess ? `-${makeSlug(sess.name)}` : '';
      const url = (window.location.origin || '') + `/share/${id}${slugPart}`;

      const showToast = (msg) => {
        setToast({ visible: true, message: msg });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast({ visible: false, message: '' }), 2500);
      };

      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          showToast('Deel-link gekopieerd naar klembord');
        }).catch(() => {
          window.prompt('Kopieer deze link:', url);
          showToast('Kopieer link (zie prompt)');
        });
      } else {
        window.prompt('Kopieer deze link:', url);
        showToast('Kopieer link (zie prompt)');
      }
    } catch (e) {
      console.error('Delen mislukt', e);
      const url = (window.location.origin || '') + `/share/${id}`;
      window.prompt('Kopieer deze link:', url);
    }
  };

  React.useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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

  // compute how often each drill appears across saved sessions
  const drillUsage = useMemo(() => {
    try {
      const sessionsAll = JSON.parse(localStorage.getItem('savedSessions') || '[]');
      const map = {};
      sessionsAll.forEach(s => { (s.drills || []).forEach(id => { map[id] = (map[id] || 0) + 1; }); });
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

      // Cover page with full-bleed image (matching TrainingSession logic)
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
          // fallback to text cover
          doc.setFontSize(28); doc.text('Training', pageWidth/2, 80, {align:'center'}); 
          doc.setFontSize(14); doc.text(`Naam: ${session.name}`, pageWidth/2, 95, {align:'center'});
        }
        doc.addPage();
      }

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
              <div key={s.id} className="session-item" onClick={() => handleView(s)} style={{cursor:'pointer'}}>
                <div className="session-main">
                  <div className="session-name">{s.name}</div>
                  <div className="session-meta">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(s)} className="btn" title="Bewerk training" aria-label="Bewerk training">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button onClick={() => { setPendingPdfSession(s); setPdfModalOpen(true); }} className="btn" title="Genereer PDF" aria-label="Genereer PDF">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button onClick={() => handleShare(s.id)} className="btn" title="Deel training" aria-label="Deel training">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.02-4.11c.54.5 1.25.81 2.05.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.09 9.81C7.55 9.3 6.84 9 6.04 9 4.38 9 3.04 10.34 3.04 12s1.34 3 3 3c.8 0 1.51-.3 2.05-.81l7.12 4.18c-.05.21-.08.43-.08.64 0 1.53 1.24 2.77 2.77 2.77S21 17.61 21 16.08 19.53 13.31 18 13.31z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="btn danger" title="Verwijder training" aria-label="Verwijder training">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                    </svg>
                  </button>
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
                    <div className="v-right">
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <strong>{d.name}</strong>
                        <span className="view-usage" title={`Voorkomst in opgeslagen trainingen: ${drillUsage[d.id] || 0}`}>
                          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{width:16,height:16,fill:'#43669e'}}>
                            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                          </svg>
                          <span style={{fontWeight:700, marginLeft:4}}>{drillUsage[d.id] || 0}</span>
                        </span>
                      </div>
                      <p>{d.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button className="btn" onClick={() => { setPendingPdfSession(viewSession); setPdfModalOpen(true); }}>Genereer PDF</button>
                <button className="btn" onClick={closeView}>Sluiten</button>
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
                <button className="start-session-btn" onClick={() => { setPdfModalOpen(false); generatePdfForSession(pendingPdfSession, false); }}>Zonder voorblad</button>
                <button className="start-session-btn" onClick={() => { setPdfModalOpen(false); generatePdfForSession(pendingPdfSession, true); }}>Met voorblad</button>
              </div>
            </div>
          </div>
        )}
        {/* Toast notification (copy confirmation) */}
        <div className={`toast ${toast.visible ? 'toast-visible' : ''}`} role="status" aria-live="polite">
          <div className="toast-message">{toast.message}</div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Trainings;
