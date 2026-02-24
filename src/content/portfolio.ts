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
  proofOfWork: {
    positioning: string;
    buildScope: string[];
    antiScope: string[];
  };
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
      name: 'Fashion Video Pipeline (Local GPU Inference Runtime)',
      status: 'Private Runtime Proof Pack',
      oneLiner:
        'Deterministic CLI pipeline for local try-on inference, Blender rendering, enhancement fallback, and export with run-scoped artifact lineage.',
      problem:
        'Generating repeatable fashion media on consumer GPUs breaks easily without strict run contracts, deterministic stage wiring, and explicit ROCm/runtime checks.',
      outcome:
        'Built a production-style local inference runtime with fixed command surface, fail-fast guardrails, deterministic naming, and reproducible run-scoped outputs.',
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
        'Enforcing deterministic output lineage across multi-stage model/render commands.',
        'Maintaining stable ROCm runtime behavior on consumer AMD hardware.',
        'Designing fail-fast command boundaries with explicit fallback paths.',
        'Coordinating subprocess-based model and ffmpeg execution without silent failures.',
        'Keeping run contracts strict while supporting CLI-first operator workflows.',
        'Managing dependency drift across Docker, Micromamba, and pinned runtime packages.',
      ],
      scalingConsiderations: [
        'VRAM budget constraints vs model profile selection.',
        'Artifact storage growth across run-scoped outputs.',
        'Cold-start overhead from heavyweight model dependencies.',
        'Reproducibility guarantees under dependency updates.',
        'Parallel stage scheduling for multi-run throughput.',
      ],
      refactorNext: [
        'Adopt a populated lock strategy for first-party runtime dependencies.',
        'Add structured stage-level telemetry with run correlation fields.',
        'Introduce timeout/retry policy wrappers around subprocess stages.',
        'Define artifact retention and pruning policy for long-term operations.',
      ],
    },
  ],
 systemsMindset: [
  'I bias toward system integrity over feature velocity. Weak foundations compound failure.',
  'I assume duplication, retries, and race conditions will happen and design so they do not corrupt state.',
  'I separate configuration from execution so live automation cannot be mutated accidentally.',
  'I make state ownership explicit so no process updates data without clear responsibility.',
  'I design for distributed coordination even when a single-process solution would be easier.',
  'I treat authentication, authorization (RBAC), and route boundaries as architectural concerns, not middleware details.',
  'I treat AI as a collaborator, not a source of truth. Guardrails and human oversight are part of the system.',
  'I prefer observable systems with traceable logs and clear causality over systems that “usually work.”',
],
  skills: {
    frontend: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    backend: ['Node.js', 'Express', 'Supabase', 'PostgreSQL', 'Redis', 'Python', 'Rust'],
    automation: [
      'Chrome Extensions (MV3)',
      'WebSockets',
      'Job Queues',
      'n8n',
      'Twilio',
      'Resend',
      'Google APIs',
      'Puppeteer',
      'Solidity tooling',
      'On-chain bot scripting',
    ],
    ai: [
      'OpenAI API',
      'Gemini CLI',
      'Local LLMs (Qwen, Ollama)',
      'Multi-agent Orchestration',
      'ROCm stack',
      'Dockerized model orchestration',
    ],
  },
 proofOfWork: {
positioning:
  'My bias is toward execution integrity. I assume systems will fail under edge conditions and design accordingly. Clear state, explicit coordination, and isolation between orchestration and execution layers are non-negotiable.',

buildScope: [
  'I treat AI models as probabilistic components and wrap them with validation, retries, and guardrails.',
  'I design workflows with human-in-the-loop checkpoints when stakes are high.',
  'Orchestration logic is separated from execution logic to prevent cascading failure.',
  'External APIs are assumed to be unstable; state transitions are explicit and observable.',
  'Security boundaries matter! Scoped access, RBAC, and proper route handling are baseline concerns.',
  'Silent failure is unacceptable; observability and logging are built in from the start.',
],

antiScope: [
  'Shipping systems without explicit state control, observability, and version discipline.',
  'Relying on AI output without validation, fallback paths, or human oversight.',
  'Introducing architecture decisions that compromise long-term maintainability for short-term velocity.',
],
  },
  bio: {
  technical:
    'What started as crypto experimentation became an obsession with execution logic. Backend-heavy systems taught me that state, timing, and coordination matter more than surface-level features.',

   founder:
  'Around 2023–2024, I stopped thinking purely in crypto-native systems and started thinking in general software systems. Instead of bots and contracts, I was designing applications, APIs, user interfaces, and automation that had to work outside of blockchain constraints.',
},
   timeline: [
  {
    year: '2019',
    title: 'Entered crypto markets as an investor.',
    description:
      'Exposure to token mechanics, decentralized systems, and market volatility sparked interest in automation and programmable logic.',
  },
  {
    year: '2022',
    title: 'Built crypto trading bots and smart contract experiments.',
    description:
      'Focused on backend-heavy systems in Rust, Python, and Solidity. Learned through execution failures how state, timing, and randomness expose weak assumptions.',
  },
  {
    year: '2023',
    title: 'Expanded into API integrations and connected automation.',
    description:
      'Began coordinating external APIs and structured data pipelines. Shifted from isolated scripts to systems with real dependencies.',
  },
  {
    year: '2024',
    title: 'Leveled into full-stack development and discovered orchestration.',
    description:
      'Built more complete applications with defined frontend and backend layers. Introduced n8n and began designing event-driven workflows.',
  },
  {
    year: '2025',
    title: 'Built agentic automation systems.',
    description:
      'Designed multi-step workflows coordinating APIs, AI models, databases, and messaging layers. Moved into structured orchestration rather than single-purpose tools.',
  },
  {
    year: '2026',
    title: 'Operating across SaaS infrastructure and AI-driven systems.',
    description:
      'Combining orchestration, browser automation, and GPU-backed AI environments into more durable multi-service architectures.',
  },
],
};
