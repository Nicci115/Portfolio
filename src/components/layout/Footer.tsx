import React from 'react';
import { portfolio } from '@/content/portfolio';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-white/5 bg-zinc-950">
      <div className="container mx-auto px-6 md:px-12 max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img 
            src={portfolio.identity.assets.logo} 
            alt="Tailored Approach" 
            className="w-8 h-8 opacity-50 grayscale hover:grayscale-0 transition-all"
          />
          <span className="text-sm text-zinc-500">
            © {currentYear} {portfolio.identity.name}. All rights reserved.
          </span>
        </div>
        
        <div className="flex gap-6 text-sm text-zinc-500">
          <a href={portfolio.identity.links.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">LinkedIn</a>
          <a href={portfolio.identity.links.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">Facebook</a>
        </div>
      </div>
    </footer>
  );
};
