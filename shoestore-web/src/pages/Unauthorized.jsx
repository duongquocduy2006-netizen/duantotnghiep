import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    background: 'linear-gradient(135deg, #f0f4f8, #d9e2ec)',
    fontFamily: "'Inter', sans-serif",
    color: '#333',
    textAlign: 'center',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }}>
    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Unauthorized Access</h1>
    <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
      You do not have permission to view this page.
    </p>
    <Link to="/" style={{
      padding: '0.75rem 1.5rem',
      background: '#ff6b6b',
      color: '#fff',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: 'bold',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
    }}>Go to Home</Link>
  </div>
);

export default Unauthorized;
