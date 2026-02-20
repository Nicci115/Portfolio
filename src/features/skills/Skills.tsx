import React from 'react';
import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/utils/motion';

export const Skills = () => {
  const { skills } = portfolio;
  const categories = Object.keys(skills) as Array<keyof typeof skills>;

  return (
    <Section id="skills" className="bg-zinc-900/30">
      <div className="space-y-12">
        <motion.div variants={fadeInUp}>
          <h2 className="text-3xl font-bold text-zinc-100">Technical Arsenal</h2>
          <p className="text-zinc-500 mt-2">Tools I use to build production systems.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category) => (
            <motion.div 
              key={category} 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h3 className="text-sm font-mono uppercase tracking-wider text-accent border-b border-zinc-800 pb-2">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills[category].map((skill) => (
                  <motion.div key={skill} variants={fadeInUp}>
                    <Badge>{skill}</Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};
