'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';
import Timeline from '@/components/timeline/Timeline';
import PreviewCanvas from '@/components/canvas/PreviewCanvas';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import CapturePanel from '@/components/panels/CapturePanel';
import ExportPanel from '@/components/panels/ExportPanel';

type SideTab = 'capture' | 'export';

export default function EditorPage() {
  const params = useParams();
  const { setProject, project, addTrack, addClip } = useProjectStore();
  const [sideTab, setSideTab] = useState<SideTab>('capture');

  useEffect(() => {
    if (params.projectId && project.id !== params.projectId) {
      setProject({
        ...project,
        id: params.projectId as string,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [params.projectId]);

  const handleAddText = () => {
    let textTrack = project.tracks.find((t) => t.type === 'text');
    let trackId: string;
    if (!textTrack) {
      trackId = addTrack('text', 'Text');
    } else {
      trackId = textTrack.id;
    }
    addClip(trackId, {
      type: 'text',
      startTime: 0,
      duration: 5000,
      source: '',
      properties: {
        x: 10,
        y: 40,
        width: 80,
        height: 20,
        rotation: 0,
        opacity: 1,
        text: {
          content: 'Your Text Here',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 700,
          color: '#ffffff',
          backgroundColor: '',
          alignment: 'center',
          lineHeight: 1.2,
        },
      },
    });
  };

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="h-11 bg-bg-card border-b border-border flex items-center px-4 gap-4 shrink-0">
        <a href="/" className="text-sm font-bold text-white hover:text-text-muted">
          QQ VideoGen
        </a>
        <span className="text-text-dim text-xs">/</span>
        <span className="text-sm text-text-muted">{project.name}</span>
        <div className="flex-1" />
        <button
          onClick={handleAddText}
          className="px-3 py-1 bg-bg-hover border border-border rounded text-xs text-text-muted hover:text-white hover:border-border-hover"
        >
          + Add Text
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <div className="w-64 bg-bg-card border-r border-border flex flex-col shrink-0">
          <div className="flex border-b border-border">
            <button
              onClick={() => setSideTab('capture')}
              className={`flex-1 py-2 text-xs font-medium ${
                sideTab === 'capture' ? 'text-white bg-bg-hover' : 'text-text-muted'
              }`}
            >
              Capture
            </button>
            <button
              onClick={() => setSideTab('export')}
              className={`flex-1 py-2 text-xs font-medium ${
                sideTab === 'export' ? 'text-white bg-bg-hover' : 'text-text-muted'
              }`}
            >
              Export
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sideTab === 'capture' && <CapturePanel />}
            {sideTab === 'export' && <ExportPanel />}
          </div>
        </div>

        {/* Center + right */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Preview */}
            <PreviewCanvas />
            {/* Properties */}
            <PropertiesPanel />
          </div>
          {/* Timeline */}
          <div className="h-72 shrink-0">
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}
