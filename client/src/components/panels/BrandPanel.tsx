'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useToastStore } from '@/components/ui/Toast';

interface BrandKit {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
}

const FONTS = [
  'sans-serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Arial, sans-serif',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
  'Impact, sans-serif',
];

export default function BrandPanel() {
  const [brands, setBrands] = useState<BrandKit[]>([]);
  const [editing, setEditing] = useState<BrandKit | null>(null);
  const [creating, setCreating] = useState(false);
  const project = useProjectStore((s) => s.project);
  const { updateClipProperties } = useProjectStore();
  const addToast = useToastStore((s) => s.addToast);

  const loadBrands = async () => {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      setBrands(data.brands || []);
    } catch {
      addToast('Failed to load brand kits', 'error');
    }
  };

  useEffect(() => { loadBrands(); }, []);

  const saveBrand = async (brand: Partial<BrandKit>) => {
    if (editing?.id) {
      await fetch(`/api/brands/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
    } else {
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
    }
    setEditing(null);
    setCreating(false);
    addToast('Brand kit saved', 'success');
    loadBrands();
  };

  const deleteBrand = async (id: string) => {
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    addToast('Brand kit deleted', 'info');
    loadBrands();
  };

  const applyBrand = (brand: BrandKit) => {
    // Apply brand colors and fonts to all text clips in the project
    project.tracks.forEach((track) => {
      if (track.type !== 'text') return;
      track.clips.forEach((clip) => {
        if (!clip.properties.text) return;
        updateClipProperties(track.id, clip.id, {
          text: {
            ...clip.properties.text,
            color: brand.primaryColor,
            fontFamily: brand.headingFont,
          },
        });
      });
    });
  };

  const newBrand: BrandKit = {
    id: '',
    name: '',
    logo: '',
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    accentColor: '#3b82f6',
    headingFont: 'sans-serif',
    bodyFont: 'sans-serif',
  };

  const current = editing || (creating ? newBrand : null);

  if (current) {
    return (
      <div className="p-3">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          {editing ? 'Edit Brand Kit' : 'New Brand Kit'}
        </h3>
        <BrandForm
          brand={current}
          onSave={saveBrand}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      </div>
    );
  }

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Brand Kits
      </h3>
      <button
        onClick={() => setCreating(true)}
        className="w-full py-2 mb-3 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover"
      >
        + New Brand Kit
      </button>

      {brands.length === 0 && (
        <p className="text-text-dim text-xs text-center mt-4">No brand kits yet</p>
      )}

      <div className="space-y-2">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-bg rounded-lg border border-border p-3 group">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                <div className="w-5 h-5 rounded-full border border-border" style={{ background: brand.primaryColor }} />
                <div className="w-5 h-5 rounded-full border border-border" style={{ background: brand.secondaryColor }} />
                <div className="w-5 h-5 rounded-full border border-border" style={{ background: brand.accentColor }} />
              </div>
              <span className="text-sm text-white font-medium flex-1">{brand.name}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => applyBrand(brand)}
                className="flex-1 py-1 bg-timeline-clip text-white text-[10px] font-medium rounded"
              >
                Apply
              </button>
              <button
                onClick={() => setEditing(brand)}
                className="px-2 py-1 bg-bg-hover text-text-muted text-[10px] font-medium rounded"
              >
                Edit
              </button>
              <button
                onClick={() => deleteBrand(brand.id)}
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

function BrandForm({
  brand,
  onSave,
  onCancel,
}: {
  brand: BrandKit;
  onSave: (b: Partial<BrandKit>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(brand);
  const set = (key: keyof BrandKit, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="Brand name"
        className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus"
      />

      <label className="text-[11px] text-text-dim block">Primary Color</label>
      <input type="color" value={form.primaryColor} onChange={(e) => set('primaryColor', e.target.value)}
        className="w-full h-8 bg-bg-input border border-border rounded cursor-pointer" />

      <label className="text-[11px] text-text-dim block">Secondary Color</label>
      <input type="color" value={form.secondaryColor} onChange={(e) => set('secondaryColor', e.target.value)}
        className="w-full h-8 bg-bg-input border border-border rounded cursor-pointer" />

      <label className="text-[11px] text-text-dim block">Accent Color</label>
      <input type="color" value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)}
        className="w-full h-8 bg-bg-input border border-border rounded cursor-pointer" />

      <label className="text-[11px] text-text-dim block">Heading Font</label>
      <select value={form.headingFont} onChange={(e) => set('headingFont', e.target.value)}
        className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white">
        {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}
      </select>

      <label className="text-[11px] text-text-dim block">Body Font</label>
      <select value={form.bodyFont} onChange={(e) => set('bodyFont', e.target.value)}
        className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white">
        {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}
      </select>

      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)}
          className="flex-1 py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover">
          Save
        </button>
        <button onClick={onCancel}
          className="flex-1 py-2 bg-bg-hover border border-border text-text-muted rounded-lg text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
