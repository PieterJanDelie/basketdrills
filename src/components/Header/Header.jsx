import React, { useState } from "react";
import { NavLink } from 'react-router-dom';
import "./Header.css";

const Header = () => {
  const logoSrc = (process.env.PUBLIC_URL || '') + '/basket-desselgem.png';
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo-wrap">
          <NavLink to="/" onClick={() => setOpen(false)}>
            <img src={logoSrc} alt="Basket Desselgem" className="site-logo" />
          </NavLink>
        </div>

        <button className={`hamburger ${open ? 'is-open' : ''}`} aria-label="Open navigatie" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          <span />
          <span />
          <span />
        </button>

        <nav className={`main-nav ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
          <NavLink to="/sessie" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Mijn sessie</NavLink>
          <NavLink to="/trainingen" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Opgeslagen trainingen</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
