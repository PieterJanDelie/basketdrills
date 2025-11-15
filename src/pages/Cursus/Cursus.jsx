import React, { useMemo } from 'react';
import DefaultLayout from '../../layouts/DefaultLayout';
import './Cursus.css';
import cursusses from '../../constants/cursusses.json';

const Cursus = () => {
  // Build a map of available local documents from assets/cursusses
  const docMap = useMemo(() => {
    try {
      const req = require.context('../../assets/cursusses', false, /\.(pdf|txt|docx?)$/i);
      const map = {};
      req.keys().forEach(k => { const file = k.replace('./',''); const mod = req(k); map[file] = mod && mod.default ? mod.default : mod; });
      return map;
    } catch (e) {
      return {};
    }
  }, []);

  const typeLabel = (t) => {
    switch ((t||'').toLowerCase()) {
      case 'link': return 'Extern';
      case 'int-doc': return 'Document (intern)';
      case 'ext-doc': return 'Extern document';
      default: return t;
    }
  };

  return (
    <DefaultLayout>
      <div className="cursus-container">
        <div className="cursus-header">
          <h1>Cursus</h1>
          <p className="cursus-intro">Handige links en documenten voor je trainingen.</p>
        </div>

        <div className="cursus-grid">
          {cursusses.map((item, idx) => {
            const type = (item.type || '').toLowerCase();
            let href = item.data || '';
            let target = '_blank';
            let rel = 'noopener noreferrer';

            if (type === 'int-doc') {
              // local doc: try to resolve from docMap
              if (docMap && docMap[item.data]) href = docMap[item.data];
              else href = (process.env.PUBLIC_URL || '') + `/assets/cursusses/${item.data}`;
            }

            return (
              <article key={idx} className="cursus-card">
                <div className="cursus-card-header">
                  <div className="cursus-type">{typeLabel(type)}</div>
                  <h3 className="cursus-name">{item.name}</h3>
                </div>
                <p className="cursus-desc">{item.description}</p>
                <div className="cursus-actions">
                  {type === 'link' && (
                    <a className="btn" href={href} target={target} rel={rel}>Open site</a>
                  )}
                  {type === 'int-doc' && (
                    <a className="btn" href={href} target={target} rel={rel}>Open document</a>
                  )}
                  {type === 'ext-doc' && (
                    <a className="btn" href={href} target={target} rel={rel}>Open extern document</a>
                  )}
                  {!['link','int-doc','ext-doc'].includes(type) && (
                    <a className="btn" href={href} target={target} rel={rel}>Open</a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Cursus;
