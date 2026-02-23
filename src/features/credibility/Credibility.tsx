import React from 'react';
import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/utils/motion';
import { ShieldCheck, GitBranch } from 'lucide-react';

export const Credibility = () => {
  const { timeline, bio, proofOfWork } = portfolio;

  return (
    <Section id="credibility">
      <div className="space-y-12">
        <motion.div variants={fadeInUp} className="space-y-3 max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-100">Proof of Work</h2>
          <p className="text-zinc-400 leading-relaxed">{proofOfWork.positioning}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h3 className="text-xl font-bold text-zinc-100">Execution Profile</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-3 text-zinc-400 leading-relaxed">
                <p>{bio.technical}</p>
                <p>{bio.founder}</p>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">
                  What I Build
                </p>
                <ul className="space-y-2">
                  {proofOfWork.buildScope.map((item) => (
                    <li key={item} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">
                  What I Don&apos;t Build
                </p>
                <ul className="space-y-2">
                  {proofOfWork.antiScope.map((item) => (
                    <li key={item} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-accent" />
              <h3 className="text-xl font-bold text-zinc-100">Timeline</h3>
            </div>

            <div className="relative border-l border-zinc-800 ml-3 space-y-7 pl-8 py-2">
              {timeline.map((item, index) => (
                <div key={index} className="relative">
                  <span className="absolute -left-[37px] top-1 h-4 w-4 rounded-full border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                    <span className="font-mono text-sm text-accent">{item.year}</span>
                    <h3 className="text-base font-bold text-zinc-200">{item.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-500">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
};
