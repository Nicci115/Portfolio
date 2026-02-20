import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const navLinks = [
    { name: 'Showcase', href: '#showcase' },
    { name: 'Skills', href: '#skills' },
    { name: 'Proof', href: '#credibility' },
  ];

  return (
    <motion.nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent',
        isScrolled ? 'glass-nav py-4' : 'bg-transparent py-6'
      )}
    >
      <div className="container mx-auto px-6 md:px-12 max-w-[1200px] flex items-center justify-between">
        <a href="#" className="text-xl font-bold tracking-tight text-zinc-100 hover:text-accent transition-colors">
          Dominic<span className="text-accent">.</span>
        </a>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-zinc-400 hover:text-accent transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
          
          <a
            href="#contact"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              "bg-zinc-100 text-zinc-900 hover:bg-accent hover:text-white",
              "border border-transparent"
            )}
          >
            Contact
          </a>
        </div>
      </div>
    </motion.nav>
  );
};
