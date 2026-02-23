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
    phone?: string;
  };
}

export interface Metric {
  label: string;
  value: string;
}

export interface ExternalLink {
  label: string;
  href: string;
  kind: 'github' | 'website' | 'project';
}

export interface ProjectArchitecture {
  serviceBreakdown: string[];
  dataFlowSteps: string[];
  boundaries: string[];
}

export interface ProjectTechStack {
  frontend?: string[];
  backend?: string[];
  infra?: string[];
  automation?: string[];
  ai?: string[];
}

export interface FeaturedProject {
  name: string;
  status?: string;
  oneLiner: string;
  problem?: string;
  outcome?: string;
  architecture?: ProjectArchitecture;
  techStack?: ProjectTechStack;
  engineeringChallenges?: string[];
  scalingConsiderations?: string[];
  refactorNext?: string[];
  safeMetrics?: Metric[];
  externalLinks?: ExternalLink[];
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
  featuredProjects: FeaturedProject[];
  systemsMindset: string[];
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
    },
  },
  featuredProjects: [
    {
      name: 'Real Estate CRM (Multi-tenant Automation SaaS)',
      status: 'Private Architecture Overview',
      oneLiner:
        'Multi-service CRM platform connecting lead intake, qualification logic, communication channels, and workflow automation in one orchestrated system.',
      problem:
        'Real estate agents lack an integrated system that connects lead intake, automation workflows, qualification logic, and communication channels into a single orchestrated architecture.',
      outcome:
        'Built a multi-service SaaS architecture combining authentication, relational data, workflow automation, and third-party integrations into a modular automation platform.',
      architecture: {
        serviceBreakdown: [
          'Frontend SPA',
          'Backend API',
          'Supabase (Postgres + Auth + RLS)',
          'n8n automation workflows',
          'Notification integrations (Twilio, Resend)',
          'Google APIs connectors',
        ],
        dataFlowSteps: [
          'Lead enters through frontend intake and validation logic.',
          'Backend persists tenant-scoped data and enforces RLS boundaries.',
          'Automation workflows execute qualification and follow-up sequences.',
          'Notification services dispatch SMS/email and write workflow state back.',
        ],
        boundaries: [
          'Control plane: tenant configuration, workflow definitions, team settings.',
          'Execution plane: automation workers and workflow runtime.',
          'Integration boundary: external provider APIs with rate-limit protections.',
        ],
      },
      techStack: {
        frontend: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
        backend: ['Node.js', 'Express', 'Supabase', 'PostgreSQL'],
        infra: ['Docker', 'Redis'],
        automation: ['n8n', 'Twilio', 'Resend', 'Google APIs'],
      },
      engineeringChallenges: [
        'Designing multi-tenant boundaries with Supabase RLS without breaking onboarding flows.',
        'Coordinating async automation workflows across n8n and backend logic without double execution.',
        'Handling idempotency for SMS/email workflows to prevent duplicate sends.',
        'Debugging state mismatches between UI and background automation execution.',
        'Managing secure API key storage per-user without leaking integration credentials.',
        'Avoiding tight coupling between workflow definitions and UI logic.',
      ],
      scalingConsiderations: [
        'Horizontal scaling of automation execution workers.',
        'Rate limiting external APIs (Twilio, Google APIs).',
        'Managing concurrent workflow triggers for high-volume lead intake.',
        'Database index strategy for large lead datasets.',
        'Observability strategy for debugging distributed failures.',
        'Separation of control plane (configuration) vs execution plane (automation engine).',
      ],
      refactorNext: [
        'Replace portions of n8n with a custom job orchestration layer for tighter control.',
        'Introduce centralized event logging for workflow tracing.',
        'Formalize a message queue layer instead of relying on direct trigger chaining.',
        'Improve onboarding resilience by decoupling auth from team provisioning.',
      ],
    },
    {
      name: 'Resell Tool (Browser Automation + Control Plane Architecture)',
      status: 'Live Deployment (Private Beta)',
      oneLiner:
        'Chrome extension plus backend control plane for cross-marketplace coordination with real-time Mirror Mode state visibility.',
      problem:
        'Marketplace sellers lack real-time synchronization and centralized control when managing listings across multiple platforms.',
      outcome:
        'Designed a Chrome extension + backend control plane architecture that enables multi-marketplace coordination with real-time state visibility ("Mirror Mode").',
      architecture: {
        serviceBreakdown: [
          'Web control plane UI',
          'Backend orchestration API',
          'WebSocket mirror channel',
          'Chrome extension service worker',
          'Marketplace adapter scripts',
        ],
        dataFlowSteps: [
          'Operator configures sync action in control plane UI.',
          'Backend issues authenticated job payload over Mirror Mode channel.',
          'Extension execution plane performs marketplace mutations and streams status.',
          'Control plane reconciles job outcome and updates cross-platform listing state.',
        ],
        boundaries: [
          'Control plane: orchestration, auth, queueing, and state visibility.',
          'Execution plane: browser automation, active sessions, and adapter execution.',
          'Transport boundary: websocket reliability and reconnect behavior.',
        ],
      },
      techStack: {
        frontend: ['React', 'TypeScript', 'Vite'],
        backend: ['Node.js', 'Express', 'Supabase'],
        infra: ['WebSockets'],
        automation: ['Chrome MV3 extension', 'Content scripts', 'Browser automation'],
      },
      engineeringChallenges: [
        'Managing Chrome extension content script isolation and background service worker lifecycles.',
        'Handling marketplace session expiration without corrupting sync state.',
        'Designing a control plane vs execution plane separation.',
        'Preventing race conditions during cross-platform sync operations.',
        'Handling websocket reliability for real-time mirror channel.',
        'Building idempotent sync jobs to prevent duplicate listing mutations.',
      ],
      scalingConsiderations: [
        'Websocket connection limits per user.',
        'Job locking mechanisms to prevent overlapping sync tasks.',
        'Marketplace rate limiting and anti-bot detection risk.',
        'Resilience to browser tab closures.',
        'Separating UI state from automation execution state.',
      ],
      refactorNext: [
        'Introduce formal job queue with retry backoff strategy.',
        'Add structured telemetry for sync job success/failure.',
        'Improve session persistence detection heuristics.',
        'Decouple marketplace adapters into plugin-style modules.',
      ],
    },
    {
      name: 'GPU / AI Docker Lab (ROCm + Model Orchestration Experimentation)',
      status: 'Active Infrastructure Experimentation',
      oneLiner:
        'Dockerized experimentation stack for ROCm-era model orchestration, diffusion workflows, and repeatable GPU inference pipelines on consumer hardware.',
      problem:
        'AI model experimentation on consumer GPUs is fragile due to driver mismatches, dependency conflicts, and inconsistent CUDA/ROCm ecosystems.',
      outcome:
        'Built a Docker + Conda/ Micromamba environment for orchestrating LLMs, diffusion models, and Blender automation workflows while investigating GPU driver constraints.',
      architecture: {
        serviceBreakdown: [
          'Host OS and AMD GPU runtime',
          'ROCm driver/toolchain layer',
          'Dockerized model environments',
          'Conda/Micromamba dependency environments',
          'CLI orchestration scripts',
          'Model and asset cache volumes',
        ],
        dataFlowSteps: [
          'Host validates GPU runtime compatibility and container passthrough.',
          'Containerized environment boots pinned model dependencies.',
          'CLI pipeline executes inference/render subprocess chains.',
          'Artifacts and caches persist for reproducible reruns and profiling.',
        ],
        boundaries: [
          'Hardware boundary: host drivers, VRAM limits, passthrough configuration.',
          'Environment boundary: container image layers vs Python env dependencies.',
          'Workload boundary: inference pipelines isolated from rendering automation.',
        ],
      },
      techStack: {
        infra: ['Docker', 'ROCm', 'Micromamba', 'Conda'],
        ai: ['PyTorch', 'Transformers', 'Diffusion pipelines', 'Local LLM tooling'],
        automation: ['CLI orchestration scripts', 'Blender automation', 'Subprocess pipelines'],
      },
      engineeringChallenges: [
        'ROCm vs CUDA incompatibility constraints on AMD hardware.',
        'Version pinning conflicts across PyTorch, transformers, and diffusion libraries.',
        'Subprocess orchestration between model pipelines and rendering tools.',
        'Debugging container GPU passthrough issues.',
        'Managing multiple Python environments across CLI workflows.',
        'Handling VRAM fragmentation and memory errors during inference.',
      ],
      scalingConsiderations: [
        'GPU memory limits vs model size.',
        'Container layering and image size management.',
        'Model caching strategy.',
        'CLI-first orchestration for reproducibility.',
        'Dependency drift across updates.',
      ],
      refactorNext: [
        'Introduce reproducible environment lockfiles for every model stack.',
        'Build a unified orchestration CLI wrapper.',
        'Separate inference workloads into isolated containers.',
        'Add lightweight monitoring for GPU utilization.',
      ],
    },
  ],
  systemsMindset: [
    'I design explicit control-plane vs execution-plane boundaries so configuration cannot directly mutate live automation state.',
    'I treat idempotency as a first-class requirement for async jobs, webhooks, and workflow retries.',
    'I design around failure modes first: partial outages, stale sessions, duplicate triggers, and retry storms - not the happy path.',
    'I prioritize observability early with structured events, traceable job IDs, and logs that explain causality - not just symptoms.',
    'I design for distributed coordination, not single-process assumptions, using explicit locks, leases, and state ownership rules.',
    'I enforce version pinning and reproducible environments to reduce dependency drift across infra and AI workflows.',
    'I bias toward automation-first operations: repeatable provisioning, scripted workflows, and zero manual recovery dependencies.',
    'I separate UI state from backend execution state so real-time dashboards reflect truth instead of optimistic guesses.',
  ],
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
