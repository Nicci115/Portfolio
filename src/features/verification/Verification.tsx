import React, { useMemo, useState } from 'react';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import {
  projectProofPacks,
  proofItems,
  ProofItem,
  ProofProject,
  verificationIntro,
} from '@/data/proofPacks';

const projectOrder: ProofProject[] = ['crm', 'resell'];

const formatFileLine = (item: ProofItem) => {
  if (item.lineStart == null) {
    return item.file;
  }
  if (item.lineEnd != null) {
    return `${item.file}:${item.lineStart}-${item.lineEnd}`;
  }
  return `${item.file}:${item.lineStart}`;
};

const copyText = async (value: string) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const Verification = () => {
  const [copiedCommandKey, setCopiedCommandKey] = useState<string | null>(null);

  const groupedByProjectAndSection = useMemo(() => {
    const map = new Map<string, ProofItem[]>();
    proofItems.forEach((item) => {
      const key = `${item.project}::${item.subsection}`;
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    });
    return map;
  }, []);

  const handleCopy = async (command: string, key: string) => {
    await copyText(command);
    setCopiedCommandKey(key);
    window.setTimeout(() => {
      setCopiedCommandKey((current) => (current === key ? null : current));
    }, 1500);
  };

  return (
    <Section id="verification">
      <div className="space-y-8">
        <div className="space-y-3 max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-100">Verification</h2>
          <p className="text-zinc-400 leading-relaxed">{verificationIntro}</p>
        </div>

        <div className="verification-grid">
          {projectOrder.map((project) => {
            const config = projectProofPacks[project];
            return (
              <Card key={project} className="verification-card">
                <details className="proof-project">
                  <summary className="proof-project-summary">
                    <span className="proof-project-title">{config.title}</span>
                    <span className="proof-project-meta">Proof Pack</span>
                  </summary>

                  <div className="proof-project-body">
                    {config.subsections.map((subsection) => {
                      const sectionItems = groupedByProjectAndSection.get(`${project}::${subsection}`) ?? [];
                      return (
                        <details className="proof-subsection" key={`${project}-${subsection}`}>
                          <summary className="proof-subsection-summary">{subsection}</summary>
                          <div className="proof-items">
                            {sectionItems.map((item) => {
                              const hasSnippet = item.snippet.trim().length > 0;
                              const hasCommands = item.verifyCommands.some((command) => command.trim().length > 0);

                              return (
                                <article key={item.id} className="proof-item">
                                  <p className="proof-claim">{item.claim}</p>
                                  <p className="proof-meta">
                                    Commit: {item.commit} | File: {formatFileLine(item)}
                                  </p>

                                  {!hasSnippet || !hasCommands ? (
                                    <p className="text-xs font-semibold text-amber-300">
                                      MISSING PROOF: {!hasSnippet ? 'snippet' : ''}
                                      {!hasSnippet && !hasCommands ? '/' : ''}
                                      {!hasCommands ? 'commands' : ''}
                                    </p>
                                  ) : null}

                                  <pre className="proof-code">
                                    <code>{hasSnippet ? item.snippet : 'MISSING PROOF: snippet'}</code>
                                  </pre>

                                  <div className="proof-command-list">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                      Verify Commands
                                    </p>
                                    {hasCommands ? (
                                      item.verifyCommands.map((command, index) => {
                                        const commandKey = `${item.id}-${index}`;
                                        const isCopied = copiedCommandKey === commandKey;
                                        return (
                                          <div className="proof-command-row" key={commandKey}>
                                            <code className="proof-command-text">{command}</code>
                                            <button
                                              type="button"
                                              className="proof-copy-button"
                                              onClick={() => void handleCopy(command, commandKey)}
                                            >
                                              {isCopied ? 'Copied' : 'Copy verify command'}
                                            </button>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <p className="text-xs font-semibold text-amber-300">
                                        MISSING PROOF: commands
                                      </p>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      </div>
    </Section>
  );
};
