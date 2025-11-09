import React, { useState, useMemo } from 'react';
import DefaultLayout from '../../layouts/DefaultLayout';
import drillsData from '../../constants/drills.json';
import './DataEntry.css';

const DataEntry = () => {
  const nextId = useMemo(() => {
    const maxId = drillsData.reduce((max, drill) => Math.max(max, drill.id), 0);
    return maxId + 1;
  }, []);

  // Extract unique values from existing drills
  const existingAgeGroups = useMemo(() => {
    const groups = new Set();
    drillsData.forEach(d => d.ageGroup && groups.add(d.ageGroup));
    return Array.from(groups).sort();
  }, []);

  const existingEquipment = useMemo(() => {
    const items = new Set();
    drillsData.forEach(d => {
      if (Array.isArray(d.equipment)) {
        d.equipment.forEach(e => items.add(e));
      }
    });
    return Array.from(items).sort();
  }, []);

  const existingTags = useMemo(() => {
    const tags = new Set();
    drillsData.forEach(d => {
      if (Array.isArray(d.tags)) {
        d.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ageGroup: '',
    duration: '',
    equipment: [],
    picture: [],
    tags: [],
    intensity: 1,
  });

  const [newEquipment, setNewEquipment] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newPicture, setNewPicture] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleEquipment = (item) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(e => e !== item)
        : [...prev.equipment, item]
    }));
  };

  const addCustomEquipment = () => {
    if (newEquipment.trim()) {
      setFormData(prev => ({
        ...prev,
        equipment: [...prev.equipment, newEquipment.trim()]
      }));
      setNewEquipment('');
    }
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const addCustomTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const addPicture = () => {
    if (newPicture.trim()) {
      setFormData(prev => ({
        ...prev,
        picture: [...prev.picture, newPicture.trim()]
      }));
      setNewPicture('');
    }
  };

  const removePicture = (pic) => {
    setFormData(prev => ({
      ...prev,
      picture: prev.picture.filter(p => p !== pic)
    }));
  };

  const generateJSON = () => {
    const drill = {
      id: nextId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      ageGroup: formData.ageGroup.trim(),
      duration: parseInt(formData.duration) || 0,
      equipment: formData.equipment,
      picture: formData.picture,
      tags: formData.tags,
      intensity: parseInt(formData.intensity) || 1,
    };

    const jsonString = JSON.stringify(drill, null, 4);
    setJsonOutput(jsonString);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    alert('JSON gekopieerd naar klembord!');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ageGroup: '',
      duration: '',
      equipment: [],
      picture: [],
      tags: [],
      intensity: 1,
    });
    setJsonOutput('');
  };

  return (
    <DefaultLayout>
      <div className="data-entry-container">
        <h1>Oefening Toevoegen</h1>
        <p className="subtitle">Vul het formulier in en kopieer de JSON om toe te voegen aan drills.json</p>

        <form className="drill-form" onSubmit={(e) => { e.preventDefault(); generateJSON(); }}>
          <div className="form-section">
            <label className="form-label">
              Naam *
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">
              Beschrijving * <small>(gebruik \n voor nieuwe regel)</small>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
                rows="6"
                required
              />
            </label>
          </div>

          <div className="form-row">
            <div className="form-section">
              <label className="form-label">
                Leeftijdsgroep *
                <select
                  name="ageGroup"
                  value={formData.ageGroup}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Selecteer of typ...</option>
                  {existingAgeGroups.map(ag => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
              </label>
              <input
                type="text"
                placeholder="Of typ een nieuwe leeftijdsgroep"
                value={formData.ageGroup}
                onChange={handleChange}
                name="ageGroup"
                className="form-input"
                style={{ marginTop: 8 }}
              />
            </div>

            <div className="form-section">
              <label className="form-label">
                Duur (minuten) *
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  required
                />
              </label>
            </div>

            <div className="form-section">
              <label className="form-label">
                Intensiteit *
                <select
                  name="intensity"
                  value={formData.intensity}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="1">1 - Licht</option>
                  <option value="2">2 - Gemiddeld</option>
                  <option value="3">3 - Zwaar</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Materiaal</label>
            <div className="chips-container">
              {existingEquipment.map(eq => (
                <button
                  key={eq}
                  type="button"
                  className={`chip ${formData.equipment.includes(eq) ? 'chip-active' : ''}`}
                  onClick={() => toggleEquipment(eq)}
                >
                  {eq}
                </button>
              ))}
            </div>
            <div className="add-item">
              <input
                type="text"
                placeholder="Nieuw materiaal toevoegen"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                className="form-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomEquipment())}
              />
              <button type="button" onClick={addCustomEquipment} className="btn-add">Toevoegen</button>
            </div>
            {formData.equipment.length > 0 && (
              <div className="selected-items">
                <strong>Geselecteerd:</strong> {formData.equipment.join(', ')}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Afbeeldingen (bestandsnamen)</label>
            <div className="add-item">
              <input
                type="text"
                placeholder="Bestandsnaam (bv: oefening.jpg)"
                value={newPicture}
                onChange={(e) => setNewPicture(e.target.value)}
                className="form-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPicture())}
              />
              <button type="button" onClick={addPicture} className="btn-add">Toevoegen</button>
            </div>
            {formData.picture.length > 0 && (
              <div className="picture-list">
                {formData.picture.map((pic, i) => (
                  <div key={i} className="picture-item">
                    <span>{pic}</span>
                    <button type="button" onClick={() => removePicture(pic)} className="btn-remove">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Tags *</label>
            <div className="chips-container">
              {existingTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`chip ${formData.tags.includes(tag) ? 'chip-active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="add-item">
              <input
                type="text"
                placeholder="Nieuwe tag toevoegen"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="form-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
              />
              <button type="button" onClick={addCustomTag} className="btn-add">Toevoegen</button>
            </div>
            {formData.tags.length > 0 && (
              <div className="selected-items">
                <strong>Geselecteerd:</strong> {formData.tags.join(', ')}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Genereer JSON</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Reset</button>
          </div>
        </form>

        {jsonOutput && (
          <div className="json-output">
            <div className="output-header">
              <h3>JSON Output (ID: {nextId})</h3>
              <button onClick={copyToClipboard} className="btn-copy">📋 Kopieer</button>
            </div>
            <pre className="json-display">{jsonOutput}</pre>
            <p className="output-instructions">
              Kopieer deze JSON en voeg toe aan <code>src/constants/drills.json</code> in de array.
            </p>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default DataEntry;
