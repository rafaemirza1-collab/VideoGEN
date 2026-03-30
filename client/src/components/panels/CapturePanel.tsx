'use client';

import { useState } from 'react';
import { useProjectStore } from '@/stores/project-store';

export default function CapturePanel() {
  const [url, setUrl] = useState('');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { addTrack, addClip } = useProjectStore();

  const handleCapture = async () => {
    if (!url.trim()) {
      setStatus('Enter a URL');
      return;
    }
    setLoading(true);
    setStatus('Capturing website...');
    try {
      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), viewport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // New: capture returns a single video file
      if (data.videoFile) {
        const trackId = addTrack('video', `${new URL(url).hostname}`);
        const projectDuration = useProjectStore.getState().project.duration;
        addClip(trackId, {
          type: 'video',
          startTime: 0,
          duration: projectDuration,
          source: data.videoFile,
          properties: {
            x: 0, y: 0, width: 100, height: 100,
            rotation: 0, opacity: 1,
          },
        });
        setStatus(`Captured! Video ready.`);
      } else {
        // Fallback: old screenshot mode
        const trackId = addTrack('image', `${new URL(url).hostname}`);
        const perClip = useProjectStore.getState().project.duration / data.screenshots.length;
        data.screenshots.forEach((shot: { file: string; index: number }, i: number) => {
          addClip(trackId, {
            type: 'website-capture',
            startTime: i * perClip,
            duration: perClip,
            source: shot.file,
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
          });
        });
        setStatus(`Captured ${data.screenshots.length} shots`);
      }
      setUrl('');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Capture Website
      </h3>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="w-full px-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-white placeholder:text-text-dim focus:outline-none focus:border-border-focus mb-2"
      />
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setViewport('desktop')}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium border ${
            viewport === 'desktop'
              ? 'bg-bg-hover border-border-focus text-white'
              : 'border-border text-text-muted'
          }`}
        >
          Desktop
        </button>
        <button
          onClick={() => setViewport('mobile')}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium border ${
            viewport === 'mobile'
              ? 'bg-bg-hover border-border-focus text-white'
              : 'border-border text-text-muted'
          }`}
        >
          Mobile
        </button>
      </div>
      <button
        onClick={handleCapture}
        disabled={loading}
        className="w-full py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover disabled:bg-border-hover disabled:text-text-dim"
      >
        {loading ? 'Capturing...' : 'Capture'}
      </button>
      {status && (
        <p className={`text-xs mt-2 ${status.startsWith('Error') ? 'text-error' : 'text-success'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
