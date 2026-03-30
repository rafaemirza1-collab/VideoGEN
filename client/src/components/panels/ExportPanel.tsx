'use client';

import { useState } from 'react';
import { useProjectStore } from '@/stores/project-store';

export default function ExportPanel() {
  const project = useProjectStore((s) => s.project);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState('');

  const handleExport = async () => {
    // Collect all image/capture clips in timeline order
    const clips: string[] = [];
    project.tracks
      .filter((t) => t.visible && (t.type === 'image' || t.type === 'video'))
      .forEach((track) => {
        const sorted = [...track.clips].sort((a, b) => a.startTime - b.startTime);
        sorted.forEach((c) => {
          if (c.source) clips.push(c.source);
        });
      });

    if (clips.length === 0) {
      setStatus('No clips to export');
      return;
    }

    setLoading(true);
    setStatus('Generating video...');
    setVideoFile('');

    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips,
          format: project.aspectRatio === '16:9' ? '9:16' : project.aspectRatio,
          style: 'minimal',
          duration: String(Math.round(project.duration / 1000)),
          music: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVideoFile(data.file);
      setStatus('Export complete!');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Export Video
      </h3>
      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover disabled:bg-border-hover disabled:text-text-dim"
      >
        {loading ? 'Rendering...' : 'Export MP4'}
      </button>
      {status && (
        <p className={`text-xs mt-2 ${status.startsWith('Error') ? 'text-error' : 'text-success'}`}>
          {status}
        </p>
      )}
      {videoFile && (
        <a
          href={`/output/${videoFile}`}
          download
          className="block mt-3 w-full py-2 text-center bg-bg-hover border border-border rounded-lg text-sm text-white font-medium hover:border-border-hover"
        >
          Download {videoFile}
        </a>
      )}
    </div>
  );
}
