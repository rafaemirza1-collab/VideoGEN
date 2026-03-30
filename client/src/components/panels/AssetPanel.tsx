'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';

interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  type: string;
  createdAt: string;
}

export default function AssetPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addTrack, addClip, project } = useProjectStore();
  const { playheadTime } = useTimelineStore();

  const loadAssets = async () => {
    try {
      const url = filter === 'all' ? '/api/assets' : `/api/assets?type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setAssets(data.assets || []);
    } catch {}
  };

  useEffect(() => {
    loadAssets();
  }, [filter]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
        await fetch('/api/assets/upload', { method: 'POST', body: form });
      } catch {}
    }
    setUploading(false);
    loadAssets();
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    loadAssets();
  };

  const addToTimeline = (asset: Asset) => {
    const trackType = asset.type === 'audio' ? 'audio' : 'image';
    let track = project.tracks.find((t) => t.type === trackType);
    let trackId: string;
    if (!track) {
      trackId = addTrack(trackType);
    } else {
      trackId = track.id;
    }
    addClip(trackId, {
      type: asset.type as any,
      startTime: playheadTime,
      duration: asset.type === 'audio' ? 10000 : 5000,
      source: `../uploads/${asset.filename}`,
      properties: {
        x: 0, y: 0, width: 100, height: 100,
        rotation: 0, opacity: 1,
      },
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="p-3 flex flex-col h-full">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Assets
      </h3>

      {/* Upload */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full py-2 mb-3 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover disabled:bg-border-hover disabled:text-text-dim"
      >
        {uploading ? 'Uploading...' : '+ Upload Files'}
      </button>

      {/* Filter */}
      <div className="flex gap-1 mb-3">
        {['all', 'image', 'video', 'audio'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1 rounded text-[11px] font-medium ${
              filter === f ? 'bg-bg-hover text-white' : 'text-text-dim'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {assets.length === 0 && (
          <p className="text-text-dim text-xs text-center mt-4">No assets yet</p>
        )}
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-bg rounded-lg border border-border p-2 group"
          >
            {asset.type === 'image' && (
              <img
                src={`/uploads/${asset.filename}`}
                alt={asset.originalName}
                className="w-full h-20 object-cover rounded mb-1.5"
              />
            )}
            {asset.type === 'video' && (
              <div className="w-full h-20 bg-bg-card rounded mb-1.5 flex items-center justify-center text-text-dim text-xs">
                Video
              </div>
            )}
            {asset.type === 'audio' && (
              <div className="w-full h-10 bg-bg-card rounded mb-1.5 flex items-center justify-center text-timeline-audio text-xs">
                Audio
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-muted truncate flex-1">
                {asset.originalName}
              </span>
              <span className="text-[10px] text-text-dim">{formatSize(asset.size)}</span>
            </div>
            <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => addToTimeline(asset)}
                className="flex-1 py-1 bg-timeline-clip text-white text-[10px] font-medium rounded"
              >
                Add to Timeline
              </button>
              <button
                onClick={() => handleDelete(asset.id)}
                className="px-2 py-1 bg-error/20 text-error text-[10px] font-medium rounded"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
