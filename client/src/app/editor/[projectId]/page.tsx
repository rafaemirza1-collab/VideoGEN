'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import Timeline from '@/components/timeline/Timeline';
import PreviewCanvas from '@/components/canvas/PreviewCanvas';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import CapturePanel from '@/components/panels/CapturePanel';
import ExportPanel from '@/components/panels/ExportPanel';
import AssetPanel from '@/components/panels/AssetPanel';
import AnimationPanel from '@/components/panels/AnimationPanel';
import BrandPanel from '@/components/panels/BrandPanel';
import AIGeneratePanel from '@/components/panels/AIGeneratePanel';

type SideTab = 'ai' | 'capture' | 'assets' | 'brand' | 'export';
type RightTab = 'properties' | 'animation';

export default function EditorPage() {
  const params = useParams();
  const { setProject, project, addTrack, addClip } = useProjectStore();
  const [sideTab, setSideTab] = useState<SideTab>('ai');
  const [rightTab, setRightTab] = useState<RightTab>('properties');
  const selectedClipIds = useTimelineStore((s) => s.selectedClipIds);

  useEffect(() => {
    if (!params.projectId) return;
    // Try to load saved project
    fetch(`/api/projects/${params.projectId}`)
      .then((r) => { if (r.ok) return r.json(); throw new Error('not found'); })
      .then((saved) => {
        if (saved?.data) setProject(saved.data);
      })
      .catch(() => {
        // New project
        if (project.id !== params.projectId) {
          setProject({
            ...project,
            id: params.projectId as string,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });
  }, [params.projectId]);

  const handleAddText = () => {
    const playhead = useTimelineStore.getState().playheadTime;
    let textTrack = project.tracks.find((t) => t.type === 'text');
    let trackId: string;
    if (!textTrack) {
      trackId = addTrack('text', 'Text');
    } else {
      trackId = textTrack.id;
    }
    addClip(trackId, {
      type: 'text',
      startTime: playhead,
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
        animation: {
          entrance: 'none',
          exit: 'none',
          entranceDuration: 500,
          exitDuration: 500,
        },
      },
    });
  };

  // Auto-save project
  useEffect(() => {
    if (!project.id) return;
    const timer = setTimeout(() => {
      fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: project.name, data: project }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [project]);

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
            {(['ai', 'capture', 'assets', 'brand', 'export'] as SideTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize ${
                  sideTab === tab ? 'text-white bg-bg-hover' : 'text-text-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {sideTab === 'ai' && <AIGeneratePanel />}
            {sideTab === 'capture' && <CapturePanel />}
            {sideTab === 'assets' && <AssetPanel />}
            {sideTab === 'brand' && <BrandPanel />}
            {sideTab === 'export' && <ExportPanel />}
          </div>
        </div>

        {/* Center + right */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Preview */}
            <PreviewCanvas />
            {/* Right panel */}
            <div className="w-64 bg-bg-card border-l border-border flex flex-col shrink-0">
              <div className="flex border-b border-border">
                {(['properties', 'animation'] as RightTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium capitalize ${
                      rightTab === tab ? 'text-white bg-bg-hover' : 'text-text-muted'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {rightTab === 'properties' && <PropertiesPanel />}
                {rightTab === 'animation' && <AnimationPanel />}
              </div>
            </div>
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
