import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import NavBar from './components/NavBar.jsx';
import Hero from './components/Hero.jsx';
import Section from './components/Section.jsx';
import Services from './components/Services.jsx';
import Process from './components/Process.jsx';
import Gallery from './components/Gallery.jsx';
import BookingForm from './components/BookingForm.jsx';
import Payments from './components/Payments.jsx';
import Testimonials from './components/Testimonials.jsx';
import FAQ from './components/FAQ.jsx';
import InstagramFeed from './components/InstagramFeed.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import AuthCallback from './components/AuthCallback.jsx';

// Local component that renders the original homepage sections
function Home() {
  return (
    <>
      <Hero />
      <Section id="about" title="About Me" subtitle="Meet the artist">
        <div className="about-grid">
          <div className="about-text">
            <h3>Hi! I’m Marlowe, a 12-year-old nail artist</h3>
            <p>
              I love making nails that sparkle, pop, and feel truly you. I’ve practiced
              for years on friends and family, and now I’m sharing my art with the world.
              From cute characters to glitter glam and minimalist vibes, I’ve got you covered!
            </p>
            <ul className="about-highlights">
              <li>Kid-friendly environment and super clean tools</li>
              <li>Creative designs customized to your style</li>
              <li>Transparent pricing and easy booking</li>
            </ul>
          </div>
          <div className="about-card sparkle-card" aria-hidden="true">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="handdrawn-heart" title="hand-drawn accent">❤</div>
            <p className="quote">
              “Nails are tiny canvases—let’s make mini masterpieces together!”
            </p>
          </div>
        </div>
      </Section>

      <Section id="services" title="Services & Pricing" subtitle="Simple, clear, friendly">
        <Services />
      </Section>

      <Section id="process" title="The Process" subtitle="What to expect">
        <Process />
      </Section>

      <Section id="gallery" title="Gallery" subtitle="Styles and looks I love">
        <Gallery />
      </Section>

      <Section id="booking" title="Book an Appointment" subtitle="Pick a day and time">
        <BookingForm />
      </Section>

      <Section id="payments" title="Payments" subtitle="Easy and flexible">
        <Payments />
      </Section>

      <Section id="testimonials" title="Testimonials" subtitle="What clients are saying">
        <Testimonials />
      </Section>

      <Section id="faq" title="FAQ" subtitle="Answers to common questions">
        <FAQ />
      </Section>

      <Section id="instagram" title="Instagram" subtitle="Follow the sparkle">
        <InstagramFeed />
      </Section>

      <Section id="contact" title="Contact" subtitle="Say hello or ask a question">
        <Contact />
      </Section>
    </>
  );
}

// PUBLIC_INTERFACE
export default function App() {
  /** The main SPA with routing for home, admin, and auth callback. */
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Toggle between light and dark theme (for accessibility and preference). */
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="App" id="top">
      <Router>
        <NavBar onToggleTheme={toggleTheme} theme={theme} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </div>
  );
}
