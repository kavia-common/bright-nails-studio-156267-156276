import React, { useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * A responsive navigation bar with brand, anchor links, and theme toggle.
 */
export default function NavBar({ onToggleTheme, theme }) {
  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <a href="#top" className="brand" aria-label="Home - Bright Nails Studio">
          <span className="sparkle-dot" aria-hidden="true"></span>
          Bright Nails Studio
        </a>
        <div className="nav-links" role="navigation" aria-label="Primary">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#gallery">Gallery</a>
          <a href="#booking" className="btn btn-primary">Book</a>
          <a href="#payments">Payments</a>
          <a href="#testimonials">Reviews</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
          <button
            className="btn btn-secondary"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            type="button"
          >
            {theme === 'light' ? '🌙' : '☀️'}
            Theme
          </button>
        </div>
        <button className="nav-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  );
}
