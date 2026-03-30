'use client';

import { useState, useEffect } from 'react';

const shortcuts = [
  { keys: ['Space'], action: 'Play / Pause' },
  { keys: ['Ctrl', 'Z'], action: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
  { keys: ['Delete'], action: 'Delete selected clip' },
  { keys: ['+'], action: 'Zoom in timeline' },
  { keys: ['-'], action: 'Zoom out timeline' },
  { keys: ['?'], action: 'Toggle this help' },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
      <div
        className="bg-bg-card border border-border rounded-xl p-6 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Keyboard Shortcuts</h3>
          <button onClick={() => setOpen(false)} className="text-text-dim hover:text-white text-lg">
            ×
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-text-muted text-sm">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-1.5 py-0.5 bg-bg border border-border rounded text-xs text-text-dim font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-text-dim text-xs mt-4 text-center">Press ? to toggle • Esc to close</p>
      </div>
    </div>
  );
}
