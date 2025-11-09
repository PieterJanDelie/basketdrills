import React from "react";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import './DefaultLayout.css';

const DefaultLayout = ({ children, header = true, footer = false }) => {
  return (
    <div>
      {header && <Header />}
      <main className="app-main">
        <div className="main-container">{children}</div>
      </main>
      {footer && <Footer />}
    </div>
  );
};

export default DefaultLayout;
