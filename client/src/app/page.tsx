'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string; updatedAt: string }[]>([]);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  const createProject = () => {
    const id = nanoid(10);
    router.push(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen p-8">
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

      {projects.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted text-lg mb-4">No projects yet</p>
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
              className="bg-bg-card border border-border rounded-xl p-6 text-left hover:border-border-hover transition-colors"
            >
              <div className="w-full aspect-video bg-bg rounded-lg mb-4 flex items-center justify-center">
                <span className="text-text-dim text-sm">No preview</span>
              </div>
              <h3 className="text-white font-medium">{p.name}</h3>
              <p className="text-text-dim text-sm mt-1">
                {new Date(p.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
