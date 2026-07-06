import { useRef, useState, type DragEvent } from 'react';
import type { ColumnMapping, Message, ParsedFile } from '../types';
import { parseFile, type ParseResult } from '../parsers';
import { parseGenericJsonArray } from '../parsers/genericCsvJson';
import { ColumnMapper } from './ColumnMapper';

interface Entry {
  id: string;
  result: ParseResult;
}

interface DropzoneProps {
  onReady: (files: ParsedFile[]) => void;
}

let nextId = 0;

export function Dropzone({ onReady }: DropzoneProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const parsedResults = await Promise.all(files.map((f) => parseFile(f)));
    setEntries((prev) => [...prev, ...parsedResults.map((result) => ({ id: `f${nextId++}`, result }))]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function resolveMapping(id: string, fileName: string, rows: Record<string, unknown>[], mapping: ColumnMapping) {
    const messages: Message[] = parseGenericJsonArray(rows, mapping, fileName);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { id, result: { status: 'ok', parsed: { fileName, platform: 'Generic', messages } } } : e))
    );
  }

  const okFiles = entries.filter((e): e is Entry & { result: Extract<ParseResult, { status: 'ok' }> } => e.result.status === 'ok');
  const pendingMapping = entries.some((e) => e.result.status === 'needs-mapping');
  const totalMessages = okFiles.reduce((sum, e) => sum + e.result.parsed.messages.length, 0);

  return (
    <section className="section-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '0 2rem 2rem' }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--peach)' : 'var(--sage-light)'}`,
          borderRadius: 16,
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--peach-light)' : 'var(--cream-dark)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drag in conversation exports</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
          CSV, JSON, or TXT from iMessage, Instagram, Discord, Google Chat. Drop as many files as you want.
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.json,.txt"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map((entry) => {
            const { result } = entry;
            if (result.status === 'ok') {
              return (
                <div key={entry.id} className="chip" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <span>
                    {result.parsed.fileName} · <strong>{result.parsed.platform}</strong> · {result.parsed.messages.length} messages
                  </span>
                  <button onClick={() => removeEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
                    ✕
                  </button>
                </div>
              );
            }
            if (result.status === 'needs-mapping') {
              return (
                <ColumnMapper
                  key={entry.id}
                  fileName={result.fileName}
                  columns={result.columns}
                  suggested={result.suggested}
                  onConfirm={(mapping) => resolveMapping(entry.id, result.fileName, result.rows, mapping)}
                />
              );
            }
            return (
              <div key={entry.id} className="chip" style={{ justifyContent: 'space-between', width: '100%', background: 'var(--peach-light)' }}>
                <span>
                  {result.fileName}: {result.error}
                </span>
                <button onClick={() => removeEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {okFiles.length > 0 && (
        <button
          className="btn"
          disabled={pendingMapping}
          style={{ marginTop: '1.25rem', width: '100%' }}
          onClick={() => onReady(okFiles.map((e) => e.result.parsed))}
        >
          Analyze {totalMessages} messages from {okFiles.length} file{okFiles.length === 1 ? '' : 's'} →
        </button>
      )}
    </section>
  );
}
