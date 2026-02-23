import React, { useState } from 'react';
import { portfolio } from '@/content/portfolio';
import { proofItems, ProofItem } from '@/data/proofPacks';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp } from '@/utils/motion';
import { ChevronDown, Layers, Workflow, ShieldCheck, FileCode, Terminal, ExternalLink } from 'lucide-react';

type ExpandedView = 'deep-dive' | 'verification';

interface ExpansionState {
  index: number;
  view: ExpandedView;
}

export const Showcase = () => {
  const { featuredProjects } = portfolio;
  const [expansion, setExpansion] = useState<ExpansionState | null>({ index: 0, view: 'deep-dive' });

  const toggleExpansion = (index: number, view: ExpandedView) => {
    setExpansion((prev) => {
      if (prev?.index === index && prev?.view === view) return null;
      return { index, view };
    });
  };

  const getProjectProofKey = (projectName: string): string => {
    if (projectName.toLowerCase().includes('crm')) return 'crm';
    if (projectName.toLowerCase().includes('resell')) return 'resell';
    if (projectName.toLowerCase().includes('gpu') || projectName.toLowerCase().includes('ai')) return 'ai-lab';
    return '';
  };

  const renderArchitecturePreview = (projectName: string, services: string[]) => {
    if (projectName.includes('Resell Tool')) {
      return (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-100">
            Control Plane
          </div>
          <div className="flex items-center justify-center text-[10px] font-mono uppercase tracking-wider text-accent">
            <span>Mirror Mode</span>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100">
            Execution Plane
          </div>
        </div>
      );
    }

    if (projectName.includes('Real Estate CRM')) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {services.slice(0, 6).map((service) => (
            <div
              key={service}
              className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-[11px] text-zinc-300"
            >
              {service}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {services.slice(0, 5).map((service) => (
          <div
            key={service}
            className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-300"
          >
            {service}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Section id="systems-portfolio">
      <div className="space-y-12">
        <motion.div variants={fadeInUp} className="space-y-4 max-w-2xl">
          <h2 className="text-3xl font-bold text-zinc-100">Systems Portfolio</h2>
          <p className="text-zinc-500">
            Distributed systems, automation boundaries, and infrastructure experiments built for
            production reality.
          </p>
        </motion.div>

        <div className="space-y-6">
          {featuredProjects.map((project, index) => {
            const allTech = project.techStack
              ? Object.values(project.techStack).flat().slice(0, 10)
              : [];

            return (
              <Card
                key={project.name}
                className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/80 overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  <div className="space-y-5 lg:col-span-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold text-zinc-100">{project.name}</h3>
                        {project.status && (
                          <span className="text-[11px] font-mono uppercase tracking-widest text-accent border border-accent/30 bg-accent/10 rounded-full px-3 py-1">
                            {project.status}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 leading-relaxed">{project.oneLiner}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-zinc-200 font-medium">
                        <Layers className="w-4 h-4 text-accent" />
                        <span>Tech Stack</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allTech.map((tech) => (
                          <Badge key={`${project.name}-${tech}`} className="bg-zinc-950/60">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                      Architecture Preview
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                      {renderArchitecturePreview(project.name, project.architecture?.serviceBreakdown ?? [])}
                    </div>
                  </div>
                </div>

                <div className="mt-7 border-t border-zinc-800/80 pt-5">
                  <div className="flex flex-wrap gap-4">
                    <button
                      type="button"
                      aria-expanded={expansion?.index === index && expansion?.view === 'deep-dive'}
                      onClick={() => toggleExpansion(index, 'deep-dive')}
                      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                        expansion?.index === index && expansion?.view === 'deep-dive'
                          ? 'text-accent'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Workflow className="w-4 h-4" />
                      Deep Dive
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expansion?.index === index && expansion?.view === 'deep-dive' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      aria-expanded={expansion?.index === index && expansion?.view === 'verification'}
                      onClick={() => toggleExpansion(index, 'verification')}
                      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                        expansion?.index === index && expansion?.view === 'verification'
                          ? 'text-accent'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Proof
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expansion?.index === index && expansion?.view === 'verification' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {expansion?.index === index && (
                      <motion.div
                        key={`${index}-${expansion.view}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {expansion.view === 'deep-dive' ? (
                          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                            <div className="space-y-5">
                              <div className="space-y-2">
                                <h4 className="text-sm font-mono uppercase tracking-wider text-accent">
                                  1) Problem
                                </h4>
                                <p className="text-sm text-zinc-400">{project.problem}</p>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-mono uppercase tracking-wider text-accent">
                                  2) Outcome
                                </h4>
                                <p className="text-sm text-zinc-400">{project.outcome}</p>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-mono uppercase tracking-wider text-accent">
                                  3) Architecture
                                </h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                                      Service Breakdown
                                    </p>
                                    <ul className="space-y-1.5">
                                      {(project.architecture?.serviceBreakdown ?? []).map((service) => (
                                        <li key={service} className="text-sm text-zinc-400 flex items-start gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                          {service}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                                      Data Flow
                                    </p>
                                    <ol className="space-y-1.5">
                                      {(project.architecture?.dataFlowSteps ?? []).map((step, stepIndex) => (
                                        <li key={step} className="text-sm text-zinc-400 flex items-start gap-2">
                                          <span className="text-accent font-mono text-xs mt-[2px]">
                                            {stepIndex + 1}.
                                          </span>
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                                      Boundaries
                                    </p>
                                    <ul className="space-y-1.5">
                                      {(project.architecture?.boundaries ?? []).map((boundary) => (
                                        <li key={boundary} className="text-sm text-zinc-400 flex items-start gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                          {boundary}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-5">
                              <div className="space-y-2">
                                <h4 className="text-sm font-mono uppercase tracking-wider text-accent">
                                  4) Engineering Challenges
                                </h4>
                                <ul className="space-y-1.5">
                                  {(project.engineeringChallenges ?? []).map((item) => (
                                    <li key={item} className="text-sm text-zinc-400 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-mono uppercase tracking-wider text-accent">
                                  5) Scaling Considerations
                                </h4>
                                <ul className="space-y-1.5">
                                  {(project.scalingConsiderations ?? []).map((item) => (
                                    <li key={item} className="text-sm text-zinc-400 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-mono uppercase tracking-wider text-accent">
                                  6) What I&apos;d Refactor Next
                                </h4>
                                <ul className="space-y-1.5">
                                  {(project.refactorNext ?? []).map((item) => (
                                    <li key={item} className="text-sm text-zinc-400 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 pb-6 space-y-6">
                            {getProjectProofKey(project.name) === 'ai-lab' ? (
                              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-12 text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                                  <Terminal className="w-6 h-6 text-zinc-500" />
                                </div>
                                <h4 className="text-zinc-200 font-medium mb-1">Evidence Pending Verification</h4>
                                <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                                  I am currently finalizing the audit and QA documentation for the ROCm/Docker infrastructure lab. Check back soon for the verified proof pack.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {proofItems
                                  .filter((item) => item.project === getProjectProofKey(project.name))
                                  .map((item) => (
                                    <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">
                                            {item.subsection}
                                          </div>
                                          <p className="text-sm text-zinc-200 font-medium">{item.claim}</p>
                                        </div>
                                        <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                                          {item.commit.slice(0, 7)}
                                        </div>
                                      </div>
                                      
                                      <div className="relative group">
                                        <div className="absolute top-2 right-2 flex gap-2">
                                          <span className="text-[10px] font-mono text-zinc-600 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                                            {item.file}
                                          </span>
                                        </div>
                                        <pre className="text-[11px] text-zinc-400 bg-zinc-900/50 p-3 rounded border border-zinc-800 overflow-x-auto font-mono">
                                          <code>{item.snippet}</code>
                                        </pre>
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        {item.verifyCommands.map((cmd, i) => (
                                          <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 rounded px-2 py-1">
                                            <Terminal className="w-3 h-3" />
                                            <span className="truncate max-w-[200px]">{cmd}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Section>
  );
};
