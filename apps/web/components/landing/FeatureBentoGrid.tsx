"use client";

import React from 'react';
import { Sparkles, BrainCircuit, Code, Pencil, BookOpen, Clock } from 'lucide-react';

export const FeatureBentoGrid: React.FC = () => {
  const cards = [
    {
      title: 'Analyze long documents in seconds',
      desc: 'Upload PDFs or Word docs and Gemini will summarize the key points, find answers, and explain tricky concepts.',
      icon: <BookOpen size={32} color="#1A73E8" />,
      colSpan: 2,
      rowSpan: 1,
      bg: 'linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)',
    },
    {
      title: 'Code with an expert',
      desc: 'Stuck on a bug? Gemini helps you write, debug, and explain code in Python, Java, C++, and more.',
      icon: <Code size={32} color="#9B72CB" />,
      colSpan: 1,
      rowSpan: 1,
      bg: '#fff',
    },
    {
      title: 'Overcome writer\'s block',
      desc: 'Generate outlines, structure your essays, or brainstorm ideas instantly with powerful AI assistance.',
      icon: <Pencil size={32} color="#E37400" />,
      colSpan: 1,
      rowSpan: 1,
      bg: '#fff',
    },
    {
      title: 'Learn at your own pace',
      desc: 'Ask follow-up questions until you completely understand the material without any judgment.',
      icon: <BrainCircuit size={32} color="#0D652D" />,
      colSpan: 2,
      rowSpan: 1,
      bg: '#fff',
    }
  ];

  return (
    <section id="features" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '80px 24px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '16px'
        }}>
          Study smarter, not harder.
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
          Discover the features that make our AI engine the ultimate tool for students.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
      }} className="lg:grid-cols-3">
        {cards.map((card, idx) => (
          <div key={idx} style={{
            background: card.bg,
            borderRadius: 'var(--card-radius)',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
            gridColumn: `span ${card.colSpan}`
          }}
          className={card.colSpan === 2 ? 'lg:col-span-2' : 'lg:col-span-1'}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.04)';
          }}
          >
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              {card.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {card.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
