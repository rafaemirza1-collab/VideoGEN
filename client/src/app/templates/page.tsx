'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  project: any;
}

const CATEGORIES = ['all', 'restaurant', 'fitness', 'salon', 'ecommerce', 'general'];

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: 'bg-orange-500/20 text-orange-400',
  fitness: 'bg-red-500/20 text-red-400',
  salon: 'bg-amber-500/20 text-amber-400',
  ecommerce: 'bg-blue-500/20 text-blue-400',
  general: 'bg-purple-500/20 text-purple-400',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const url = category === 'all' ? '/api/templates' : `/api/templates?category=${category}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {});
  }, [category]);

  const useTemplate = (template: Template) => {
    const projectId = nanoid(10);
    // Save project from template
    const project = {
      ...template.project,
      id: projectId,
      name: template.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: project.name, data: project }),
    }).then(() => {
      router.push(`/editor/${projectId}`);
    });
  };

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex items-center gap-4">
        <a href="/" className="text-text-muted hover:text-white text-sm">&larr; Back</a>
        <div>
          <h1 className="text-3xl font-bold text-white">Templates</h1>
          <p className="text-text-muted mt-1">Start with a prebuilt template and customize it</p>
        </div>
      </header>

      {/* Category filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${
              category === cat
                ? 'bg-white text-black border-white'
                : 'bg-bg-card text-text-muted border-border hover:border-border-hover'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {templates.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted">No templates in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-border-hover transition-colors group"
            >
              {/* Preview area */}
              <div className="aspect-[9/16] max-h-64 bg-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Show text clips as preview */}
                {t.project.tracks
                  ?.find((tr: any) => tr.type === 'text')
                  ?.clips?.slice(0, 3)
                  .map((clip: any, i: number) => (
                    <div
                      key={i}
                      className="mb-2 text-center"
                      style={{
                        color: clip.properties?.text?.color || '#fff',
                        fontSize: `${Math.min(clip.properties?.text?.fontSize || 24, 20)}px`,
                        fontWeight: clip.properties?.text?.fontWeight || 600,
                        fontFamily: clip.properties?.text?.fontFamily || 'sans-serif',
                        backgroundColor: clip.properties?.text?.backgroundColor || 'transparent',
                        padding: clip.properties?.text?.backgroundColor ? '2px 8px' : undefined,
                        borderRadius: '3px',
                      }}
                    >
                      {clip.properties?.text?.content?.slice(0, 30)}
                    </div>
                  ))}
                <span
                  className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded font-medium ${
                    CATEGORY_COLORS[t.category] || 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {t.category}
                </span>
                <span className="absolute top-2 right-2 text-[10px] text-text-dim bg-black/40 px-2 py-0.5 rounded">
                  {t.project.aspectRatio} &middot; {t.project.duration / 1000}s
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-white font-semibold text-sm">{t.name}</h3>
                <p className="text-text-dim text-xs mt-1">{t.description}</p>
                <button
                  onClick={() => useTemplate(t)}
                  className="w-full mt-3 py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-accent-hover opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
