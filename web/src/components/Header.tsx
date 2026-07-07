export function Header() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '1.1rem 2rem',
        borderBottom: '1px solid var(--sage-light)',
        background: 'rgba(251,246,233,0.96)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="3" width="18" height="14" rx="6" fill="var(--sage)" />
        <polygon points="7,17 14,17 8,22" fill="var(--sage)" />
        <rect x="12" y="13" width="18" height="14" rx="6" fill="var(--green-dark)" />
        <polygon points="19,27 26,27 24,31" fill="var(--green-dark)" />
      </svg>
      <span style={{ fontFamily: "'Cooper Md BT', serif", fontSize: '1.15rem' }}>convolyzer.</span>
    </header>
  );
}
