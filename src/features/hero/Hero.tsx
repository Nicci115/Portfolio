import React from 'react';
import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { motion } from 'framer-motion';
import { fadeInUp, scaleIn } from '@/utils/motion';

export const Hero = () => {
  const { identity } = portfolio;

  return (
    <Section id="hero" className="min-h-screen flex items-center pt-32 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1 space-y-8">
          <motion.div variants={fadeInUp} className="space-y-2">
            <h2 className="text-accent font-mono text-sm tracking-wider uppercase">
              {identity.title}
            </h2>
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-100 tracking-tight leading-tight">
              {identity.name}
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 font-light">
              {identity.tagline}
            </p>
          </motion.div>

          <motion.p variants={fadeInUp} className="text-lg text-zinc-500 leading-relaxed max-w-lg">
            {identity.mission}
          </motion.p>

          <motion.div variants={fadeInUp} className="flex gap-4 pt-4">
            <a
              href="#showcase"
              className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              View Featured Project
            </a>
            <a
              href="#contact"
              className="px-6 py-3 border border-zinc-700 text-zinc-300 font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Contact Me
            </a>
          </motion.div>
        </div>

        <motion.div 
          variants={scaleIn}
          className="order-1 md:order-2 flex justify-center md:justify-end"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <img
              src={identity.assets.headshot}
              alt={identity.name}
              loading="lazy"
              className="relative w-64 h-64 md:w-80 md:h-80 object-cover rounded-2xl grayscale hover:grayscale-0 transition-all duration-500 border-2 border-zinc-800 hover:border-accent/50 shadow-2xl"
            />
          </div>
        </motion.div>
      </div>
    </Section>
  );
};
