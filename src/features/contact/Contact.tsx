import React from 'react';
import { portfolio } from '@/content/portfolio';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { Mail, Phone, Linkedin, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/utils/motion';

export const Contact = () => {
  const { links } = portfolio.identity;

  const contactOptions = [
    {
      label: 'Email',
      value: links.email.replace('mailto:', ''),
      href: links.email,
      icon: Mail,
      primary: true
    },
    {
      label: 'Phone',
      value: links.phone.replace('tel:', ''),
      href: links.phone,
      icon: Phone,
      primary: false
    },
    {
      label: 'LinkedIn',
      value: 'Connect on LinkedIn',
      href: links.linkedin,
      icon: Linkedin,
      primary: false
    },
    {
      label: 'Facebook',
      value: 'Message on Facebook',
      href: links.facebook,
      icon: Facebook,
      primary: false
    }
  ];

  return (
    <Section id="contact" className="pb-32">
      <div className="max-w-3xl mx-auto space-y-12">
        <motion.div variants={fadeInUp} className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-zinc-100">Work with me</h2>
          <p className="text-zinc-400 text-lg">
            I am open to freelance, consulting, partnerships, and serious engineering roles.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contactOptions.map((option) => (
            <motion.a
              key={option.label}
              href={option.href}
              target={option.href.startsWith('http') ? '_blank' : undefined}
              rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              variants={fadeInUp}
              className="group block"
            >
              <Card className="h-full flex items-center gap-4 hover:border-accent/50 hover:bg-zinc-900/80 transition-all">
                <div className="p-3 bg-zinc-900 rounded-lg group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                  <option.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-medium">{option.label}</div>
                  <div className="text-zinc-200 font-medium group-hover:text-accent transition-colors break-all">
                    {option.value}
                  </div>
                </div>
              </Card>
            </motion.a>
          ))}
        </div>
      </div>
    </Section>
  );
};
