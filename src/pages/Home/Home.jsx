import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DefaultLayout from "../../layouts/DefaultLayout";
import drillsData from "../../constants/drills.json";
import { useCart } from "../../contexts/CartContext";
import "./Home.css";
import DrillModal from "../../components/DrillCard/DrillModal";

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const { addDrill, removeDrill, isInCart, count, getTotalDuration } = useCart();

  // Toast state for small confirmations (supports optional undo callback)
  const [toast, setToast] = useState({ visible: false, message: '', undo: null });
  const toastTimer = React.useRef(null);
  const showToast = (message, undo = null) => {
    setToast({ visible: true, message, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ visible: false, message: '', undo: null }), 2000);
  };
  React.useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Verzamel alle unieke tags uit de drills
  const allTags = useMemo(() => {
    const tags = new Set();
    drillsData.forEach(drill => {
      drill.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Assign a color to each tag from a small palette (deterministic)
  const tagColors = useMemo(() => {
    const palette = ['#43669e', '#c05b4b', '#3c3841', '#6b8bb3', '#d47968', '#5a5762', '#7fa2c7', '#e89782'];
    const map = {};
    allTags.forEach((tag, idx) => {
      map[tag] = palette[idx % palette.length];
    });
    return map;
  }, [allTags]);

  // helper to pick readable text color for a given hex bg
  const getTextColor = (hex) => {
    if (!hex) return '#000';
    const c = hex.substring(1); // strip #
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    const yiq = (r*299 + g*587 + b*114)/1000;
    return yiq >= 128 ? '#000' : '#fff';
  };


  // Toggle tag selectie
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Helper: truncate text to a given length with ellipsis
  const truncate = (text, max = 120) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trim() + '…' : text;
  };

  // Small inline SVG placeholder (data URL). Used when an image is missing/broken.
  const placeholderSvg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <rect width='100%' height='100%' fill='%23f0f0f0' />
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏀</text>
  </svg>`;
  const placeholderDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

  // Build a map of available images from the drills assets folder so we can reference them by filename
  const imageMap = useMemo(() => {
    // require.context will be handled by webpack and bundle images from this folder
    try {
      const req = require.context("../../assets/Images/drills", false, /\.(png|jpe?g|svg)$/i);
      const map = {};
      req.keys().forEach(key => {
        const fileName = key.replace("./", "");
        const mod = req(key);
        map[fileName] = mod && mod.default ? mod.default : mod;
      });
      return map;
    } catch (e) {
      return {};
    }
  }, []);

  // Count how many times each drill ID appears in savedSessions and refresh on storage events
  const [drillUsage, setDrillUsage] = useState({});
  React.useEffect(() => {
    const compute = () => {
      try {
        const sessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
        const map = {};
        sessions.forEach(s => { (s.drills || []).forEach(id => { map[id] = (map[id] || 0) + 1; }); });
        setDrillUsage(map);
      } catch (e) { setDrillUsage({}); }
    };
    compute();
    const onStorage = (e) => { if (!e || e.key === 'savedSessions') compute(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

      // Filter drills op basis van zoekterm (naam alleen) en geselecteerde tags
  const filteredDrills = useMemo(() => {
    return drillsData.filter(drill => {
      // Filter op zoekterm
      const matchesSearch = drill.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter op tags (als er tags geselecteerd zijn, moet de drill minstens één van de tags hebben)
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => drill.tags.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  }, [searchTerm, selectedTags]);

  // DrillCard als losse component zodat elke kaart zijn eigen state kan hebben
  const DrillCard = ({ drill }) => {
    const pictures = Array.isArray(drill.picture) ? drill.picture : (drill.picture ? [drill.picture] : []);
    const [imgIndex, setImgIndex] = useState(0);

    const hasMultiple = pictures.length > 1;
    const prevImg = (e) => { e.stopPropagation(); setImgIndex(i => (i - 1 + pictures.length) % pictures.length); };
    const nextImg = (e) => { e.stopPropagation(); setImgIndex(i => (i + 1) % pictures.length); };

  const currentFilename = pictures.length > 0 ? pictures[imgIndex] : null;
  const currentSrc = currentFilename && imageMap[currentFilename] ? imageMap[currentFilename] : placeholderDataUrl;

    const firstTag = drill.tags && drill.tags.length > 0 ? drill.tags[0] : null;
    const cardColor = firstTag ? tagColors[firstTag] : 'transparent';

    const inCart = isInCart(drill.id);
    
    const handleCartClick = (e) => {
      e.stopPropagation();
      if (inCart) {
        removeDrill(drill.id);
        showToast && showToast('Verwijderd uit training', () => addDrill(drill));
      } else {
        addDrill(drill);
        showToast && showToast('Toegevoegd aan training', () => removeDrill(drill.id));
      }
    };

    return (
      <div className="drill-card" style={{ '--card-color': cardColor }} onClick={() => openModal(drill)}>
        <div className="drill-image">
          <img
            src={currentSrc}
            alt={drill.name}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderDataUrl; }}
          />
          {hasMultiple && (
            <>
              <button className="img-nav img-prev" onClick={prevImg} aria-label="Vorige afbeelding">‹</button>
              <button className="img-nav img-next" onClick={nextImg} aria-label="Volgende afbeelding">›</button>
              <div className="img-counter">{imgIndex + 1}/{pictures.length}</div>
            </>
          )}
          <button 
            className={`cart-btn ${inCart ? 'in-cart' : ''}`}
            onClick={handleCartClick}
            aria-label={inCart ? 'Verwijder uit training' : 'Voeg toe aan training'}
          >
            {inCart ? '✓' : '+'}
          </button>
          {/* usage badge: history icon + count */}
          <div className="drill-usage" title={`Voorkomst in opgeslagen trainingen: ${drillUsage[drill.id] || 0}`}>
            <span className="history-icon" aria-hidden>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
            </span>
            <span className="usage-count">{drillUsage[drill.id] || 0}</span>
          </div>
        </div>
        <div className="drill-content">
          <h4>{drill.name}</h4>
          <p className="drill-description">{truncate(drill.description, 80)}</p>
          <div className="drill-info">
            <span className="drill-age">👥 {drill.ageGroup}</span>
            <span className="drill-duration">⏱️ {drill.duration} min</span>
          </div>
          <div className="drill-tags">
            {drill.tags.map(tag => (
              <span
                key={tag}
                className="drill-tag"
                style={{ backgroundColor: tagColors[tag], color: getTextColor(tagColors[tag]) }}
              >{tag}</span>
            ))}
          </div>
          {drill.video && (
            <a
              href={drill.video}
              target="_blank"
              rel="noopener noreferrer"
              className="drill-video-link"
            >
              📹 Bekijk video
            </a>
          )}
        </div>
      </div>
    );
  };

  // Modal state: we only need the selected drill (null = closed)
  const [modalDrill, setModalDrill] = useState(null);

  const openModal = (drill) => setModalDrill(drill);
  const closeModal = () => setModalDrill(null);

  return (
    <DefaultLayout>
      <div className="home-container">
        <div className="header-section">
          <h1>Basketbal Oefeningen</h1>
          {count > 0 && (
            <Link to="/sessie" className="cart-indicator">
              🏀 Training ({count}) - {getTotalDuration()} min
            </Link>
          )}
        </div>
        
        {/* Zoekbalk */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Zoek oefeningen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tags Filter */}
        <div className="tags-section">
          <div className="tags-container">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-pill ${selectedTags.includes(tag) ? 'pill-active' : ''}`}
                onClick={() => toggleTag(tag)}
                style={{ backgroundColor: selectedTags.includes(tag) ? tagColors[tag] : '#fff', color: selectedTags.includes(tag) ? getTextColor(tagColors[tag]) : '#333', borderColor: tagColors[tag] }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Oefeningen Lijst */}
        <div className="drills-section">
          <div className="drills-grid">
            {filteredDrills.map(drill => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>
          {filteredDrills.length === 0 && (
            <p className="no-results">Geen oefeningen gevonden. Probeer andere zoektermen of tags.</p>
          )}
        </div>
        {/* Modal for drill details */}
        {modalDrill && (
          <DrillModal
            drill={modalDrill}
            onClose={closeModal}
            imageMap={imageMap}
            placeholderDataUrl={placeholderDataUrl}
            tagColors={tagColors}
            getTextColor={getTextColor}
            showToast={showToast}
            drillUsage={drillUsage}
          />
        )}

        {/* Toast notification (always in DOM to allow CSS fade-in/out) */}
        <div className={`toast ${toast.visible ? 'toast-visible' : ''}`} role="status" aria-live="polite">
          <div className="toast-message">{toast.message}</div>
          {toast.undo && (
            <button className="toast-undo" onClick={(e) => { e.stopPropagation(); if (toast.undo) { toast.undo(); showToast && showToast('Ongedaan gemaakt'); } }}>Ongedaan</button>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Home;
