import { useEffect, useMemo, useState } from 'react';
import type { Message, ParsedFile } from './types';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ExportGuide } from './components/ExportGuide';
import { Dropzone } from './components/Dropzone';
import { AuthorMapper } from './components/AuthorMapper';
import { LoadingScreen } from './components/LoadingScreen';
import { QuickStats } from './components/QuickStats';
import { TrendsPanel } from './components/TrendsPanel';
import { DistributionPanel } from './components/DistributionPanel';
import { WordEmojiPanel } from './components/WordEmojiPanel';
import { MirroringPanel } from './components/MirroringPanel';
import { SearchPanel } from './components/SearchPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { computeStats } from './lib/stats';
import { toTurns } from './lib/turns';
import { generateSampleMessages } from './lib/sampleData';

type Stage = 'upload' | 'map-authors' | 'loading' | 'dashboard';

function App() {
  const [stage, setStage] = useState<Stage>('upload');
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<{ messages: Message[]; authors: string[] } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  // Shared once here so every panel that needs timestamp-ordered turns
  // (sentiment, distribution, word tracking, mirroring, patterns, search)
  // doesn't each re-sort the full message list on mount.
  const turns = useMemo(() => toTurns(messages), [messages]);
  const stats = useMemo(() => computeStats(messages, authors), [messages, authors]);

  function handleFilesReady(files: ParsedFile[]) {
    setRawMessages(files.flatMap((f) => f.messages));
    setStage('map-authors');
  }

  function handleAuthorsConfirmed(mapped: Message[], selectedAuthors: string[]) {
    setPending({ messages: mapped, authors: selectedAuthors });
    setStage('loading');
  }

  function handleUseSampleData() {
    const sample = generateSampleMessages();
    const authorSet = Array.from(new Set(sample.map((m) => m.author)));
    setPending({ messages: sample, authors: authorSet });
    setStage('loading');
  }

  useEffect(() => {
    if (stage !== 'loading' || !pending) return;
    // Let the loading screen paint before the heavy synchronous work
    // (sorting/aggregating potentially hundreds of thousands of messages)
    // blocks the main thread.
    const id = window.setTimeout(() => {
      setMessages(pending.messages);
      setAuthors(pending.authors);
      setPending(null);
      setStage('dashboard');
    }, 30);
    return () => window.clearTimeout(id);
  }, [stage, pending]);

  function handleReset() {
    setRawMessages([]);
    setMessages([]);
    setAuthors([]);
    setPending(null);
    setStage('upload');
  }

  return (
    <>
      <Header />

      {stage === 'upload' && (
        <>
          <Hero />
          <ExportGuide />
          <Dropzone onReady={handleFilesReady} />
          <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 2rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.75rem' }}>No chats to upload right now?</div>
            <button className="btn btn-ghost" onClick={handleUseSampleData}>
              Try it with sample data →
            </button>
          </section>
        </>
      )}

      {stage === 'map-authors' && <AuthorMapper messages={rawMessages} onConfirm={handleAuthorsConfirmed} />}

      {stage === 'loading' && <LoadingScreen count={pending?.messages.length ?? 0} />}

      {stage === 'dashboard' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-label" style={{ marginBottom: 0 }}>
              Dashboard
            </div>
            <button className="btn btn-ghost" onClick={handleReset}>
              ← Start over
            </button>
          </div>

          <QuickStats stats={stats} authors={authors} />
          <TrendsPanel messages={messages} authors={authors} />
          <DistributionPanel turns={turns} authors={authors} />
          <WordEmojiPanel turns={turns} authors={authors} />
          <SummaryPanel messages={messages} authors={authors} />
          <MirroringPanel turns={turns} authors={authors} />
          <SearchPanel turns={turns} />
        </div>
      )}
    </>
  );
}

export default App;
