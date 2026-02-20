export interface Link {
  label: string;
  href: string;
  kind: 'github' | 'linkedin' | 'facebook' | 'email' | 'phone' | 'website' | 'project';
}

export interface Identity {
  name: string;
  title: string;
  tagline: string;
  location: string;
  mission: string;
  assets: {
    headshot: string;
    logo: string;
    banner: string;
  };
  links: {
    linkedin: string;
    facebook: string;
    email: string;
    phone: string;
  };
}

export interface Metric {
  label: string;
  value: string;
}

export interface ResellTool {
  name: string;
  status: string;
  oneLiner: string;
  techStack: {
    frontend: string;
    backend: string;
    realtime: string;
    extension: string;
  };
  architecture: {
    controlPlane: string;
    executionPlane: string;
    protocol: string;
  };
  metrics: Metric[];
  highlights: string[];
}

export interface Skills {
  frontend: string[];
  backend: string[];
  automation: string[];
  ai: string[];
}

export interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

export interface PortfolioData {
  identity: Identity;
  resellTool: ResellTool;
  skills: Skills;
  timeline: TimelineItem[];
  bio: {
    technical: string;
    founder: string;
  };
}

// ASSETS
import headshot from '@/assets/Dom.png';
import logo from '@/assets/TAlogo.jpg';
import banner from '@/assets/TABanner.jpeg';

export const portfolio: PortfolioData = {
  identity: {
    name: 'Dominic Milburn',
    title: 'Founder / Full-Stack Engineer',
    tagline: 'Automation Engineer (AI + Systems)',
    location: 'Missouri, USA',
    mission:
      'Build automation systems that eliminate human bottlenecks and turn chaotic operations into scalable workflows.',
    assets: {
      headshot,
      logo,
      banner,
    },
    links: {
      linkedin: 'https://www.linkedin.com/in/dominicmilburn/',
      facebook: 'https://www.facebook.com/dominic.milburn.2025',
      email: 'mailto:dominic@tailoredapproach.us',
      phone: 'tel:__REPLACE_WITH_PUBLIC_PHONE__', // BLOCKER: Must be filled before deploy
    },
  },
  resellTool: {
    name: 'Resell Tool (Mirror Mode)',
    status: 'Live Deployment (Private Beta)',
    oneLiner:
      'A full-stack marketplace automation platform that uses a Chrome extension + real-time job orchestration to crosslist, scan inventory, and manage listings.',
    techStack: {
      frontend: 'React, TypeScript, Vite',
      backend: 'Node.js, Express, Supabase',
      realtime: 'WebSockets (Custom Mirror Protocol)',
      extension: 'Chrome MV3, CRXJS',
    },
    architecture: {
      controlPlane: 'SPA + Express API + Supabase',
      executionPlane: 'Chrome Extension + Content Scripts',
      protocol: 'Mirror Mode (WebSocket Job Orchestration)',
    },
    metrics: [
      { label: 'Listings Processed', value: '__METRIC_TBD__' }, // e.g. "Active Daily"
      { label: 'Sync Jobs', value: '__METRIC_TBD__' }, // e.g. "Real-time"
      { label: 'Uptime', value: '__METRIC_TBD__' }, // e.g. "Production"
    ],
    highlights: [
      'Mirror Mode: Dedicated authenticated WebSocket channel orchestrating jobs between backend and browser extension.',
      'Distributed Locking: Enforced job ownership via browserId + installId to prevent race conditions.',
      'Security: Encrypted credential storage for multi-tenant marketplace sessions.',
    ],
  },
  skills: {
    frontend: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    backend: ['Node.js', 'Express', 'Supabase', 'PostgreSQL'],
    automation: ['Puppeteer', 'Chrome Extensions (MV3)', 'WebSockets', 'Job Queues'],
    ai: [
      'OpenAI API',
      'Gemini CLI',
      'Local LLMs (Qwen, Ollama)',
      'Multi-agent Orchestration',
    ],
  },
  bio: {
    technical:
      "Specializing in real-time systems, browser automation, and secure orchestration. I build architectures where Chrome Extensions act as execution agents managed by a central control plane, solving complex synchronization challenges like 'Mirror Mode' job locking.",
    founder:
      "I don't just write code; I ship products. From self-taught beginnings to deploying production SaaS on Vercel and Render, I focus on systems that replace manual labor with reliable code.",
  },
  timeline: [
    {
      year: '2023',
      title: 'Self-taught coding + First Automation Systems',
      description: 'Started building custom scripts to automate business workflows.',
    },
    {
      year: '2024',
      title: 'Built Resell Tool Foundation + Supabase Backend',
      description: 'Architected the multi-tenant database and core listing logic.',
    },
    {
      year: '2025',
      title: 'Deployed "Mirror Mode"',
      description:
        'Launched the Chrome Extension + WebSocket orchestration layer for live marketplace sync.',
    },
    {
      year: '2026',
      title: 'Portfolio Launch + Next Gen AI Products',
      description: 'Expanding into voice agents and local LLM orchestration.',
    },
  ],
};
