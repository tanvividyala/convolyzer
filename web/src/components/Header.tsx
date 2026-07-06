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
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--green-dark)',
          color: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'DM Mono, monospace',
          fontSize: '0.78rem',
          fontWeight: 500,
        }}
      >
        cv
      </div>
      <span style={{ fontFamily: "'Cooper Md BT', serif", fontSize: '1.15rem' }}>convolyzer.</span>
    </header>
  );
}
