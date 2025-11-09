import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DefaultLayout from "../../layouts/DefaultLayout";
import drillsData from "../../constants/drills.json";
import { useCart } from "../../contexts/CartContext";
import "./Home.css";
import DrillModal from "../../components/DrillCard/DrillModal";

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState(() => {
    // default: select all tags except "populair"
    try {
      const s = new Set();
      drillsData.forEach(d => { (d.tags || []).forEach(t => s.add(t)); });
      return Array.from(s).filter(tag => String(tag).toLowerCase() !== 'populair');
    } catch (e) {
      return [];
    }
  });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [ageGroupFilter, setAgeGroupFilter] = useState([]);
  const [durationFilter, setDurationFilter] = useState({ min: '', max: '' });
  const [equipmentFilter, setEquipmentFilter] = useState([]);
  const [intensityFilter, setIntensityFilter] = useState([]);
  const [sortBy, setSortBy] = useState('name-asc'); // default: alfabetisch A-Z
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
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

  // Collect unique values for filters
  const allAgeGroups = useMemo(() => {
    const groups = new Set();
    drillsData.forEach(drill => { if (drill.ageGroup) groups.add(drill.ageGroup); });
    return Array.from(groups).sort();
  }, []);

  const allEquipment = useMemo(() => {
    const equipment = new Set();
    drillsData.forEach(drill => { 
      if (Array.isArray(drill.equipment)) drill.equipment.forEach(e => equipment.add(e));
    });
    return Array.from(equipment).sort();
  }, []);

  const allIntensities = useMemo(() => {
    const intensities = new Set();
    drillsData.forEach(drill => { if (drill.intensity) intensities.add(drill.intensity); });
    return Array.from(intensities).sort();
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

  // Filter en sorteer drills
  const filteredDrills = useMemo(() => {
    // Eerst filteren
    const filtered = drillsData.filter(drill => {
      // Filter op zoekterm
      const matchesSearch = drill.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter op tags (als er tags geselecteerd zijn, moet de drill minstens één van de tags hebben)
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => drill.tags.includes(tag));
      
      // Filter op leeftijdsgroep
      const matchesAgeGroup = ageGroupFilter.length === 0 || ageGroupFilter.includes(drill.ageGroup);
      
      // Filter op duur
      const matchesDuration = (!durationFilter.min || drill.duration >= parseInt(durationFilter.min)) &&
                             (!durationFilter.max || drill.duration <= parseInt(durationFilter.max));
      
      // Filter op materiaal
      const matchesEquipment = equipmentFilter.length === 0 || 
                              (Array.isArray(drill.equipment) && equipmentFilter.some(e => drill.equipment.includes(e)));
      
      // Filter op intensiteit
      const matchesIntensity = intensityFilter.length === 0 || intensityFilter.includes(drill.intensity);
      
      return matchesSearch && matchesTags && matchesAgeGroup && matchesDuration && matchesEquipment && matchesIntensity;
    });

    // Dan sorteren
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'duration-asc':
          return (a.duration || 0) - (b.duration || 0);
        case 'duration-desc':
          return (b.duration || 0) - (a.duration || 0);
        case 'usage-desc':
          return (drillUsage[b.id] || 0) - (drillUsage[a.id] || 0);
        case 'usage-asc':
          return (drillUsage[a.id] || 0) - (drillUsage[b.id] || 0);
        case 'newest':
          return b.id - a.id; // assume higher ID = newer
        case 'oldest':
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return sorted;
  }, [searchTerm, selectedTags, ageGroupFilter, durationFilter, equipmentFilter, intensityFilter, sortBy, drillUsage]);

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
        
        {/* Zoekbalk met filter icoon */}
        <div className="search-section">
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Zoek oefeningen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className={`sort-btn ${sortPopoverOpen ? 'active' : ''}`}
              onClick={() => setSortPopoverOpen(!sortPopoverOpen)}
              aria-label="Sorteeropties"
              title="Sorteer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className={`filter-icon-btn ${filterPanelOpen ? 'active' : ''}`}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              aria-label="Filters tonen/verbergen"
              title="Filters"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" fill="currentColor"/>
              </svg>
            </button>

            {/* Sort popover (small) */}
            {sortPopoverOpen && (
              <div className="sort-popover" role="dialog" aria-label="Sorteer opties">
                <select 
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); }}
                >
                  <option value="name-asc">Naam (A-Z)</option>
                  <option value="name-desc">Naam (Z-A)</option>
                  <option value="duration-asc">Duur (kort → lang)</option>
                  <option value="duration-desc">Duur (lang → kort)</option>
                  <option value="usage-desc">Meest gebruikt</option>
                  <option value="usage-asc">Minst gebruikt</option>
                  <option value="newest">Nieuwste eerst</option>
                  <option value="oldest">Oudste eerst</option>
                </select>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:8}}>
                  <button className="clear-filters-btn" onClick={() => setSortPopoverOpen(false)}>Klaar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <div className="filter-panel">
            <div className="filter-header">
              <h3>Filters & Sortering</h3>
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setAgeGroupFilter([]);
                  setDurationFilter({ min: '', max: '' });
                  setEquipmentFilter([]);
                  setIntensityFilter([]);
                  setSortBy('name-asc');
                }}
              >
                Reset alles
              </button>
            </div>

            {/* Leeftijdsgroep filter */}
            <div className="filter-group">
              <h4>Leeftijdsgroep</h4>
              <div className="filter-options">
                {allAgeGroups.map(age => (
                  <label key={age} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={ageGroupFilter.includes(age)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAgeGroupFilter([...ageGroupFilter, age]);
                        } else {
                          setAgeGroupFilter(ageGroupFilter.filter(a => a !== age));
                        }
                      }}
                    />
                    <span>{age}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Duur filter */}
            <div className="filter-group">
              <h4>Duur (minuten)</h4>
              <div className="filter-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={durationFilter.min}
                  onChange={(e) => setDurationFilter({ ...durationFilter, min: e.target.value })}
                  className="range-input"
                />
                <span>tot</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={durationFilter.max}
                  onChange={(e) => setDurationFilter({ ...durationFilter, max: e.target.value })}
                  className="range-input"
                />
              </div>
            </div>

            {/* Materiaal filter */}
            <div className="filter-group">
              <h4>Materiaal</h4>
              <div className="filter-options">
                {allEquipment.map(eq => (
                  <label key={eq} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={equipmentFilter.includes(eq)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEquipmentFilter([...equipmentFilter, eq]);
                        } else {
                          setEquipmentFilter(equipmentFilter.filter(e => e !== eq));
                        }
                      }}
                    />
                    <span>{eq}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Intensiteit filter */}
            {allIntensities.length > 0 && (
              <div className="filter-group">
                <h4>Intensiteit</h4>
                <div className="filter-options">
                  {allIntensities.map(intensity => (
                    <label key={intensity} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={intensityFilter.includes(intensity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setIntensityFilter([...intensityFilter, intensity]);
                          } else {
                            setIntensityFilter(intensityFilter.filter(i => i !== intensity));
                          }
                        }}
                      />
                      <span>{intensity}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
          <div className="results-info">
            <span className="results-count">
              {filteredDrills.length} oefening{filteredDrills.length !== 1 ? 'en' : ''} gevonden
            </span>
          </div>
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
