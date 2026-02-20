import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-zinc-400 selection:bg-accent/30">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};
