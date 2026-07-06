import { useEffect, useState } from 'react';

const MESSAGES = [
  'Sorting messages by time…',
  'Counting words…',
  'Scoring sentiment…',
  'Building your dashboard…',
];

interface LoadingScreenProps {
  count: number;
}

export function LoadingScreen({ count }: LoadingScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => (s + 1) % MESSAGES.length), 900);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}
    >
      <div className="spinner" aria-hidden="true" />
      <div>
        <h2 style={{ marginBottom: '0.5rem' }}>Crunching {count.toLocaleString()} messages</h2>
        <p style={{ opacity: 0.65, fontSize: '0.9rem' }}>{MESSAGES[step]}</p>
      </div>
    </div>
  );
}
