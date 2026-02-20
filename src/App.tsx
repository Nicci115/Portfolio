import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/features/hero/Hero';
import { Showcase } from '@/features/showcase/Showcase';
import { Skills } from '@/features/skills/Skills';
import { Credibility } from '@/features/credibility/Credibility';
import { Contact } from '@/features/contact/Contact';

function App() {
  return (
    <Layout>
      <Hero />
      <Showcase />
      <Skills />
      <Credibility />
      <Contact />
    </Layout>
  );
}

export default App;