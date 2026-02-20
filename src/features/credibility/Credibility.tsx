import React from 'react';
import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/utils/motion';
import { Terminal, Award } from 'lucide-react';

export const Credibility = () => {
  const { timeline, bio } = portfolio;

  return (
    <Section id="credibility">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Bio Section */}
        <div className="space-y-8">
          <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-bold text-zinc-100">Engineer & Founder</h2>
            </div>
            <div className="space-y-6 text-lg text-zinc-400 leading-relaxed">
              <p>{bio.technical}</p>
              <p>{bio.founder}</p>
            </div>
          </motion.div>
        </div>

        {/* Timeline Section */}
        <div className="space-y-8">
           <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-bold text-zinc-100">Journey</h2>
            </div>
            
            <div className="relative border-l border-zinc-800 ml-3 space-y-8 pl-8 py-2">
              {timeline.map((item, index) => (
                <div key={index} className="relative">
                  <span className="absolute -left-[37px] top-1 h-4 w-4 rounded-full border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                    <span className="font-mono text-sm text-accent">{item.year}</span>
                    <h3 className="text-base font-bold text-zinc-200">{item.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-500 max-w-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
};
