import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/utils/motion';

export const SystemsMindset = () => {
  const { systemsMindset } = portfolio;

  return (
    <Section id="systems-mindset" className="bg-zinc-900/30">
      <div className="space-y-10">
        <motion.div variants={fadeInUp} className="space-y-3 max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-100">Systems Mindset</h2>
          <p className="text-zinc-500">
            Principles I use when building distributed automation and infrastructure-heavy systems.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemsMindset.map((principle, index) => (
            <motion.div
              key={principle}
              variants={fadeInUp}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="text-[11px] font-mono uppercase tracking-widest text-accent mb-3">
                Principle {index + 1}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{principle}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};
