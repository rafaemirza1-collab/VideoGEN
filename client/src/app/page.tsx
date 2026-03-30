'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

interface ProjectItem {
  id: string;
  name: string;
  updatedAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createProject = () => {
    const id = nanoid(10);
    router.push(`/editor/${id}`);
  };

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">QQ VideoGen</h1>
        <p className="text-text-muted mt-1">AI-powered video creation platform</p>
      </header>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-white flex-1">Projects</h2>
        <a
          href="/templates"
          className="px-5 py-2.5 bg-bg-card border border-border text-white font-medium rounded-lg hover:border-border-hover transition-colors text-sm"
        >
          Browse Templates
        </a>
        <button
          onClick={createProject}
          className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm"
        >
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="w-full aspect-video bg-bg rounded-lg mb-4" />
              <div className="h-4 bg-bg rounded w-2/3 mb-2" />
              <div className="h-3 bg-bg rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-white text-lg font-medium mb-2">Create your first video</p>
          <p className="text-text-muted text-sm mb-6">Start from scratch or pick a template to get going fast.</p>
          <div className="flex gap-3 justify-center">
            <a
              href="/templates"
              className="px-6 py-3 bg-bg-hover border border-border text-white font-medium rounded-lg hover:border-border-hover transition-colors"
            >
              Start from Template
            </a>
            <button
              onClick={createProject}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-accent-hover transition-colors"
            >
              Blank Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/editor/${p.id}`)}
              className="bg-bg-card border border-border rounded-xl p-6 text-left hover:border-border-hover transition-colors group relative"
            >
              <div className="w-full aspect-video bg-bg rounded-lg mb-4 flex items-center justify-center">
                <span className="text-text-dim text-sm">No preview</span>
              </div>
              <h3 className="text-white font-medium">{p.name}</h3>
              <p className="text-text-dim text-sm mt-1">
                {new Date(p.updatedAt).toLocaleDateString()}
              </p>
              <button
                onClick={(e) => deleteProject(e, p.id)}
                className="absolute top-3 right-3 w-7 h-7 bg-bg border border-border rounded-md flex items-center justify-center text-text-dim hover:text-red-400 hover:border-red-400/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="Delete project"
              >
                ×
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
