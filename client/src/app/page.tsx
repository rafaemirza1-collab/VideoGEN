'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string; updatedAt: string }[]>([]);

  const createProject = () => {
    const id = nanoid(10);
    const project = { id, name: 'Untitled Project', updatedAt: new Date().toISOString() };
    setProjects((prev) => [project, ...prev]);
    router.push(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">QQ VideoGen</h1>
        <p className="text-text-muted mt-1">AI-powered video creation platform</p>
      </header>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Projects</h2>
        <button
          onClick={createProject}
          className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-accent-hover transition-colors"
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted text-lg mb-4">No projects yet</p>
          <button
            onClick={createProject}
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-accent-hover transition-colors"
          >
            Create Your First Video
          </button>
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
