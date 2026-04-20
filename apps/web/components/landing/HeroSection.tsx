"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const words = ["research", "homework", "writing", "coding", "ideas"];

export const HeroSection: React.FC = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{
      padding: 'calc(var(--nav-height) + 80px) 24px 80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      position: 'relative',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(26,115,232,0.15) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '20%',
        width: '35vw',
        height: '35vw',
        background: 'radial-gradient(circle, rgba(155,114,203,0.15) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 16px',
        backgroundColor: '#fff',
        borderRadius: '999px',
        border: '1px solid var(--border-light)',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        ✨ Introducing Flashcard AI Engine with Gemini
      </div>

      <h1 style={{
        fontSize: 'clamp(40px, 8vw, 72px)',
        fontWeight: 600,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
        margin: '0 0 24px 0',
        maxWidth: '900px',
      }}>
        Supercharge your <br />
        study sessions with <br />
        <span className="gradient-text">Gemini</span> for <br />
        
        <span style={{ 
          display: 'inline-block', 
          position: 'relative', 
          minWidth: '240px',
          height: '1.1em',
          verticalAlign: 'bottom',
          overflow: 'hidden'
        }}>
          {words.map((word, index) => (
            <span
              key={word}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: 0,
                color: 'var(--text-primary)',
                opacity: currentWordIndex === index ? 1 : 0,
                translate: currentWordIndex === index ? '0 0' : currentWordIndex > index ? '0 -100%' : '0 100%',
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap',
                fontWeight: 600
              }}
            >
              {word}
            </span>
          ))}
        </span>
      </h1>

      <p style={{
        fontSize: 'clamp(18px, 2vw, 22px)',
        color: 'var(--text-secondary)',
        maxWidth: '700px',
        margin: '0 0 40px 0',
        lineHeight: 1.5,
      }}>
        Upload source material, generate thoughtful flashcards across concepts, definitions,
        relationships, and edge cases. Built with Gemini AI.
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/register" className="btn-primary" style={{ padding: '16px 32px', fontSize: '16px', borderRadius: '999px' }}>
          Get Started
        </Link>
        <Link href="/dashboard" style={{ 
          padding: '16px 32px', 
          fontSize: '16px', 
          borderRadius: '999px',
          background: 'white',
          border: '1px solid var(--border-light)',
          color: 'var(--text-primary)',
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          Open Dashboard
        </Link>
      </div>
    </section>
  );
};
