export const Footer: React.FC = () => {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-light)',
      padding: '40px 24px',
      marginTop: '80px',
      background: 'var(--bg-white)',
    }}>
      <div className="max-w-6xl mx-auto flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '-0.02em', display: 'flex', gap: '4px' }}>
            <span>FlashCard</span>
            <span style={{ color: 'var(--text-primary)' }}>Engine</span>
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '24px',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
          flexWrap: 'wrap'
        }}>
          <a href="#" className="transition-colors hover:text-[var(--text-primary)]">Privacy & Terms</a>
          <a href="#" className="transition-colors hover:text-[var(--text-primary)]">About</a>
        </div>
      </div>
    </footer>
  );
};
