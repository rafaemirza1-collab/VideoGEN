import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f0f0f',
          card: '#1a1a1a',
          hover: '#222222',
          input: '#111111',
        },
        border: {
          DEFAULT: '#2a2a2a',
          hover: '#333333',
          focus: '#555555',
        },
        text: {
          DEFAULT: '#f0f0f0',
          muted: '#888888',
          dim: '#666666',
        },
        accent: {
          DEFAULT: '#ffffff',
          hover: '#e0e0e0',
        },
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        timeline: {
          clip: '#3b82f6',
          clipHover: '#60a5fa',
          text: '#a855f7',
          audio: '#22c55e',
          image: '#f59e0b',
          playhead: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
