'use client';

import { useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useToastStore } from '@/components/ui/Toast';
import type { AspectRatio, Resolution } from '@/lib/types';

export default function ExportPanel() {
  const project = useProjectStore((s) => s.project);
  const { setAspectRatio, setResolution } = useProjectStore();
  const addToast = useToastStore((s) => s.addToast);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState('');

  const handleExport = async () => {
    const hasClips = project.tracks.some((t) => t.clips.length > 0);
    if (!hasClips) {
      setStatus('No clips to export');
      return;
    }

    setLoading(true);
    setStatus('Rendering video...');
    setVideoFile('');

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVideoFile(data.file);
      setStatus('Export complete!');
      addToast('Video exported successfully!', 'success');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      addToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Export Video
      </h3>

      <label className="text-xs text-text-dim block mb-1">Format</label>
      <select
        value={project.aspectRatio}
        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
        className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus mb-3"
      >
        <option value="9:16">9:16 Vertical (Reels/TikTok)</option>
        <option value="1:1">1:1 Square (Instagram)</option>
        <option value="16:9">16:9 Landscape (YouTube)</option>
      </select>

      <label className="text-xs text-text-dim block mb-1">Resolution</label>
      <select
        value={project.resolution}
        onChange={(e) => setResolution(e.target.value as Resolution)}
        className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus mb-3"
      >
        <option value="720p">720p</option>
        <option value="1080p">1080p (Recommended)</option>
        <option value="4k">4K</option>
      </select>

      <label className="text-xs text-text-dim block mb-1">Duration</label>
      <div className="flex gap-2 mb-4">
        {[15, 30, 60].map((d) => (
          <button
            key={d}
            onClick={() => useProjectStore.getState().setDuration(d * 1000)}
            className={`flex-1 py-1.5 rounded text-xs font-medium border ${
              project.duration === d * 1000
                ? 'bg-bg-hover border-border-focus text-white'
                : 'border-border text-text-muted'
            }`}
          >
            {d}s
          </button>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full py-2.5 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover disabled:bg-border-hover disabled:text-text-dim"
      >
        {loading ? 'Rendering...' : 'Export MP4'}
      </button>

      {status && (
        <p className={`text-xs mt-2 ${status.startsWith('Error') ? 'text-error' : 'text-success'}`}>
          {status}
        </p>
      )}

      {videoFile && (
        <>
          <a
            href={`/output/${videoFile}`}
            download
            className="block mt-3 w-full py-2 text-center bg-bg-hover border border-border rounded-lg text-sm text-white font-medium hover:border-border-hover"
          >
            Download {videoFile}
          </a>
          <div className="mt-3">
            <video
              src={`/output/${videoFile}`}
              controls
              className="w-full rounded-lg"
            />
          </div>
        </>
      )}
    </div>
  );
}
