"use client";

import React from 'react';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export const GeminiNavbar: React.FC = () => {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--nav-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 100,
    }} className="glass-panel">
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" fill="url(#paint0_linear)"/>
          <defs>
            <linearGradient id="paint0_linear" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1A73E8"/>
              <stop offset="1" stopColor="#9B72CB"/>
            </linearGradient>
          </defs>
        </svg>
        <span style={{ 
          fontSize: '20px', 
          fontWeight: 500, 
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginLeft: '4px'
        }}>
          Gemini
        </span>
      </div>

      <div style={{ 
        display: 'none', 
        '@media (min-width: 768px)': { display: 'flex' },
        alignItems: 'center',
        gap: '24px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        fontSize: '15px'
      }} className="desktop-links hidden md:flex items-center gap-6 font-medium text-[var(--text-secondary)] text-[15px]">
        <Link href="#features" className="transition-colors hover:text-[var(--text-primary)] p-2">Features</Link>
        <Link href="#faq" className="transition-colors hover:text-[var(--text-primary)] p-2">FAQ</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/login" className="hidden md:block font-medium text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          Sign in
        </Link>
        <Link href="/register" className="btn-gradient">
          Try Gemini
        </Link>
        <button style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }} className="md:hidden">
          <Menu />
        </button>
      </div>
    </nav>
  );
};
