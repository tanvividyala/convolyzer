import { useState } from 'react';
import type { ColumnMapping } from '../types';

interface ColumnMapperProps {
  fileName: string;
  columns: string[];
  suggested: ColumnMapping;
  onConfirm: (mapping: ColumnMapping) => void;
}

export function ColumnMapper({ fileName, columns, suggested, onConfirm }: ColumnMapperProps) {
  const [mapping, setMapping] = useState(suggested);

  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.88rem' }}>
        Couldn't auto-detect columns in <strong>{fileName}</strong>. Tell me which is which:
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {(['dateCol', 'authorCol', 'contentCol'] as const).map((field) => (
          <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', opacity: 0.75 }}>
            {field === 'dateCol' ? 'Date/Timestamp' : field === 'authorCol' ? 'Author' : 'Message content'}
            <select value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => onConfirm(mapping)}>
        Use these columns
      </button>
    </div>
  );
}
