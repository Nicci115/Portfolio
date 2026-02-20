import React from 'react';
import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/utils/motion';
import { Server, Monitor, ArrowRightLeft, Layers } from 'lucide-react';

export const Showcase = () => {
  const { resellTool } = portfolio;

  return (
    <Section id="showcase">
      <div className="space-y-12">
        <motion.div variants={fadeInUp} className="space-y-4 max-w-2xl">
          <h2 className="text-3xl font-bold text-zinc-100">Featured Project</h2>
          <div className="flex items-center gap-3">
            <div className="h-px bg-zinc-800 flex-grow" />
            <span className="text-accent font-mono text-sm uppercase tracking-widest">
              {resellTool.status}
            </span>
          </div>
        </motion.div>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/80">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-zinc-100">{resellTool.name}</h3>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  {resellTool.oneLiner}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-100 font-medium">
                  <Layers className="w-5 h-5 text-accent" />
                  <span>Key Highlights</span>
                </div>
                <ul className="space-y-3">
                  {resellTool.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.values(resellTool.techStack).map((tech) => (
                  <Badge key={tech} className="bg-zinc-950/50">
                    {tech.split(',')[0]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Right: Architecture Diagram */}
            <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800/50 flex flex-col justify-center space-y-8">
               <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">
                  System Architecture
               </div>
               
               {/* Diagram Visual */}
               <div className="relative flex flex-col gap-6">
                  
                  {/* Control Plane */}
                  <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 relative group">
                    <div className="absolute -left-1 top-4 w-1 h-8 bg-blue-500 rounded-r-full" />
                    <div className="flex items-center gap-3 mb-2">
                      <Server className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-bold text-blue-100">Control Plane</span>
                    </div>
                    <div className="text-xs text-blue-200/60 font-mono">
                      {resellTool.architecture.controlPlane}
                    </div>
                  </div>

                  {/* Connection Line */}
                  <div className="flex items-center justify-center gap-2 text-zinc-600">
                    <div className="h-8 w-px bg-zinc-800" />
                    <ArrowRightLeft className="w-4 h-4 animate-pulse text-accent" />
                    <span className="text-[10px] uppercase tracking-wider font-mono text-accent">
                      Mirror Mode (WS)
                    </span>
                    <div className="h-8 w-px bg-zinc-800" />
                  </div>

                  {/* Execution Plane */}
                  <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 relative">
                    <div className="absolute -left-1 top-4 w-1 h-8 bg-emerald-500 rounded-r-full" />
                    <div className="flex items-center gap-3 mb-2">
                      <Monitor className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-100">Execution Plane</span>
                    </div>
                     <div className="text-xs text-emerald-200/60 font-mono">
                      {resellTool.architecture.executionPlane}
                    </div>
                  </div>

               </div>

               <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800">
                  {resellTool.metrics.map((metric, i) => (
                    <div key={i} className="text-center">
                       <div className="text-[10px] text-zinc-500 uppercase">{metric.label}</div>
                       <div className="text-xs font-bold text-zinc-300 mt-1 font-mono">{metric.value}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
};
