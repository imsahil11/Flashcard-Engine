"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqData = [
  {
    q: "Is the AI Flashcard Engine free for students?",
    a: "We offer a generous free tier for students to start transforming their dense study material into teacher-quality flashcards."
  },
  {
    q: "Can the AI help me write essays?",
    a: "Our core focus is transforming materials into an interactive study deck with spaced repetition. However, our integrated Gemini models can help you brainstorm ideas, create outlines, and overcome writer's block during your study sessions."
  },
  {
    q: "How is this different from regular flashcard apps?",
    a: "Instead of you manually copying and pasting definitions, our AI analyzes your documents to generate comprehensive flashcards covering concepts, definitions, relationships, edge cases, and worked examples—similar to a real teacher."
  },
  {
    q: "Is my data safe when I upload documents?",
    a: "Your data privacy is our priority. Uploaded documents are processed securely and your flashcards remain completely private precisely mapped to your account."
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '80px 24px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 40px)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Frequently asked questions
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {faqData.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div 
              key={idx}
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                boxShadow: isOpen ? '0 8px 24px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <button 
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                style={{
                  width: '100%',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--text-primary)'
                }}
              >
                {item.q}
                <ChevronDown 
                  size={24} 
                  color="var(--text-tertiary)"
                  style={{ 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease'
                  }} 
                />
              </button>
              
              <div style={{
                maxHeight: isOpen ? '200px' : '0px',
                opacity: isOpen ? 1 : 0,
                padding: isOpen ? '0 24px 24px 24px' : '0 24px',
                transition: 'all 0.3s ease',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                fontSize: '16px'
              }}>
                {item.a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
