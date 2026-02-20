import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { fadeInUp } from '@/utils/motion';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export const Section = ({ id, className, children, ...props }: SectionProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={cn('py-20 md:py-32', className)}
      {...props}
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={shouldReduceMotion ? { ...fadeInUp, initial: { opacity: 0, y: 0 } } : fadeInUp}
        className="container mx-auto px-6 md:px-12 max-w-[1200px]"
      >
        {children}
      </motion.div>
    </section>
  );
};