import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/features/hero/Hero';
import { Showcase } from '@/features/showcase/Showcase';
import { Verification } from '@/features/verification/Verification';
import { SystemsMindset } from '@/features/mindset/SystemsMindset';
import { Skills } from '@/features/skills/Skills';
import { Credibility } from '@/features/credibility/Credibility';
import { Contact } from '@/features/contact/Contact';

function App() {
  return (
    <Layout>
      <Hero />
      <Showcase />
      <Verification />
      <SystemsMindset />
      <Skills />
      <Credibility />
      <Contact />
    </Layout>
  );
}

export default App;
