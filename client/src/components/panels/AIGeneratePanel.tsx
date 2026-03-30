'use client';

import { useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useToastStore } from '@/components/ui/Toast';

type Step = 'info' | 'generating' | 'preview';

interface ScenePreview {
  narration: string;
  textOverlay: string;
  visualDescription: string;
  duration: number;
  visual?: { path: string; source: string; color?: string };
}

export default function AIGeneratePanel() {
  const { setProject, project } = useProjectStore();
  const addToast = useToastStore((s) => s.addToast);
  const [step, setStep] = useState<Step>('info');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('general');
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [duration, setDuration] = useState('15');
  const [error, setError] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [scenes, setScenes] = useState<ScenePreview[]>([]);
  const [generatedProject, setGeneratedProject] = useState<any>(null);

  const handleGenerate = async () => {
    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }
    setError('');
    setStep('generating');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          businessType,
          description: description.trim(),
          tone,
          duration,
          aspectRatio: project.aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setScriptText(data.script);
      setScenes(data.scenes);
      setGeneratedProject(data.project);
      setStep('preview');
      addToast('Video script generated!', 'success');
    } catch (err: any) {
      setError(err.message);
      addToast('Generation failed', 'error');
      setStep('info');
    }
  };

  const handleApply = () => {
    if (!generatedProject) return;
    setProject({
      ...project,
      ...generatedProject,
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: new Date().toISOString(),
    });
    addToast('Applied to timeline!', 'success');
    setStep('info');
    setScriptText('');
    setScenes([]);
    setGeneratedProject(null);
  };

  if (step === 'generating') {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-3 h-full">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Generating your video...</p>
        <p className="text-xs text-text-dim">Creating script, finding visuals, building captions</p>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="p-4 space-y-4 text-sm">
        <div>
          <h3 className="text-white font-medium mb-1">Generated Script</h3>
          <p className="text-text-muted text-xs leading-relaxed bg-bg rounded p-2">
            {scriptText}
          </p>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">Scenes ({scenes.length})</h3>
          <div className="space-y-2">
            {scenes.map((scene, i) => (
              <div key={i} className="bg-bg rounded p-2 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-text-dim">#{i + 1}</span>
                  <span className="text-xs text-text-muted">{(scene.duration / 1000).toFixed(1)}s</span>
                  {scene.visual?.source === 'placeholder' && (
                    <span
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: scene.visual.color || '#333' }}
                    />
                  )}
                </div>
                <p className="text-white text-xs">{scene.textOverlay}</p>
                <p className="text-text-dim text-xs mt-0.5">{scene.visualDescription}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStep('info')}
            className="flex-1 py-2 bg-bg-hover border border-border rounded text-xs text-text-muted hover:text-white"
          >
            Back
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 bg-white text-black font-semibold rounded text-xs hover:bg-accent-hover"
          >
            Apply to Timeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 text-sm">
      <h3 className="text-white font-medium">AI Video Generator</h3>
      <p className="text-text-dim text-xs">Generate a complete promo video from a business description.</p>

      {error && (
        <p className="text-red-400 text-xs bg-red-400/10 rounded p-2">{error}</p>
      )}

      <label className="block">
        <span className="text-text-muted text-xs">Business Name *</span>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Joe's Pizza"
          className="mt-1 w-full bg-bg border border-border rounded px-2 py-1.5 text-white text-xs focus:border-border-hover outline-none"
        />
      </label>

      <label className="block">
        <span className="text-text-muted text-xs">Business Type</span>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="mt-1 w-full bg-bg border border-border rounded px-2 py-1.5 text-white text-xs focus:border-border-hover outline-none"
        >
          <option value="restaurant">Restaurant</option>
          <option value="fitness">Fitness / Gym</option>
          <option value="salon">Salon / Spa</option>
          <option value="ecommerce">E-Commerce</option>
          <option value="general">General / Other</option>
        </select>
      </label>

      <label className="block">
        <span className="text-text-muted text-xs">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this business special?"
          rows={3}
          className="mt-1 w-full bg-bg border border-border rounded px-2 py-1.5 text-white text-xs focus:border-border-hover outline-none resize-none"
        />
      </label>

      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-text-muted text-xs">Tone</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="mt-1 w-full bg-bg border border-border rounded px-2 py-1.5 text-white text-xs focus:border-border-hover outline-none"
          >
            <option value="professional">Professional</option>
            <option value="energetic">Energetic</option>
            <option value="friendly">Friendly</option>
            <option value="luxury">Luxury</option>
          </select>
        </label>

        <label className="flex-1">
          <span className="text-text-muted text-xs">Duration</span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 w-full bg-bg border border-border rounded px-2 py-1.5 text-white text-xs focus:border-border-hover outline-none"
          >
            <option value="10">10 seconds</option>
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full py-2.5 bg-white text-black font-semibold rounded text-xs hover:bg-accent-hover transition-colors"
      >
        Generate Video
      </button>
    </div>
  );
}
