import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandStrategy, LayoutOption, PageSection } from '../types/brand';
import { RenderSection, getTemplateMeta } from './TemplateRegistry';
import { IconButton, Button } from './ui/primitives';
import { Layers, X, ArrowUp, ArrowDown, Check } from 'lucide-react';

type Source = 'A' | 'B';

interface Picked {
  uid: string;
  source: Source;
  section: PageSection;
}

interface MergePanelProps {
  isOpen: boolean;
  optionA: LayoutOption | null;
  optionB: LayoutOption | null;
  brand: BrandStrategy;
  onClose: () => void;
  onApply: (sections: PageSection[]) => void;
}

const uidOf = (source: Source, section: PageSection) => `${source}:${section.id}`;
const labelFor = (section: PageSection) => getTemplateMeta(section.template_id)?.label ?? section.template_id;
const snippetFor = (section: PageSection) => section.content.headline || section.content.title || '(no headline)';
const typeLabel = (section: PageSection) => section.section_type[0].toUpperCase() + section.section_type.slice(1);

const SectionThumb: React.FC<{ section: PageSection; brand: BrandStrategy }> = ({ section, brand }) => (
  <div className="relative h-32 overflow-hidden rounded-[var(--radius-md)] border border-[var(--ink-700)] bg-white pointer-events-none" aria-hidden="true">
    <div style={{ width: '400%', transform: 'scale(0.25)', transformOrigin: 'top left' }}>
      <RenderSection section={section} brand={brand} />
    </div>
  </div>
);

const OptionColumn: React.FC<{
  source: Source;
  option: LayoutOption;
  brand: BrandStrategy;
  pickedUids: Set<string>;
  onToggle: (source: Source, section: PageSection) => void;
  onUseAll: (source: Source, option: LayoutOption) => void;
}> = ({ source, option, brand, pickedUids, onToggle, onUseAll }) => (
  <div className="space-y-2.5 min-w-0">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="font-medium text-[var(--text-primary)] truncate text-sm">
          Option {source}: {option.name}
        </h3>
        {option.description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{option.description}</p>}
      </div>
      <Button variant="secondary" size="sm" onClick={() => onUseAll(source, option)} className="shrink-0">
        Use all
      </Button>
    </div>

    {option.sections.map((section) => {
      const selected = pickedUids.has(uidOf(source, section));
      return (
        <button
          key={section.id}
          type="button"
          onClick={() => onToggle(source, section)}
          aria-pressed={selected}
          className={`w-full text-left rounded-[var(--radius-lg)] border p-2 transition-colors duration-150 ${
            selected ? 'border-[var(--thread)]/50 bg-[var(--thread-soft)]' : 'border-[var(--ink-700)] bg-[var(--ink-850)] hover:border-[var(--ink-600)]'
          }`}
        >
          <SectionThumb section={section} brand={brand} />
          <div className="flex items-center justify-between gap-2 mt-2 px-1">
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                {typeLabel(section)}: {labelFor(section)}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] truncate">{snippetFor(section)}</div>
            </div>
            <span className={`shrink-0 text-xs font-medium flex items-center gap-1 ${selected ? 'text-[var(--thread)]' : 'text-[var(--text-tertiary)]'}`}>
              {selected ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added
                </>
              ) : (
                'Add'
              )}
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

export const MergePanel: React.FC<MergePanelProps> = ({ isOpen, optionA, optionB, brand, onClose, onApply }) => {
  const [picked, setPicked] = useState<Picked[]>([]);

  useEffect(() => {
    if (isOpen) setPicked([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const pickedUids = new Set(picked.map((p) => p.uid));

  const toggle = (source: Source, section: PageSection) => {
    const uid = uidOf(source, section);
    setPicked((prev) => (prev.some((p) => p.uid === uid) ? prev.filter((p) => p.uid !== uid) : [...prev, { uid, source, section }]));
  };

  const useAll = (source: Source, option: LayoutOption) =>
    setPicked(option.sections.map((section) => ({ uid: uidOf(source, section), source, section })));

  const move = (index: number, dir: -1 | 1) =>
    setPicked((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const remove = (uid: string) => setPicked((prev) => prev.filter((p) => p.uid !== uid));

  const apply = () => {
    onApply(
      picked.map((p, i) => ({
        ...p.section,
        id: `merged-${i + 1}-${p.section.id}`,
        content: { ...p.section.content, items: p.section.content.items?.map((item) => ({ ...item })) }
      }))
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Merge layout options"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-6xl max-h-[92vh] bg-[var(--ink-900)] text-[var(--text-primary)] border border-[var(--ink-700)]
              rounded-[var(--radius-xl)] flex flex-col overflow-hidden shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ink-700)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[var(--thread-soft)] rounded-[var(--radius-md)]">
                  <Layers className="w-4 h-4 text-[var(--thread)]" />
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-lg leading-tight">Merge layout options</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">Pick sections from either option to build your final page.</p>
                </div>
              </div>
              <IconButton label="Close" onClick={onClose}>
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid gap-6 lg:grid-cols-3">
              {optionA ? (
                <OptionColumn source="A" option={optionA} brand={brand} pickedUids={pickedUids} onToggle={toggle} onUseAll={useAll} />
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">Option A isn't available yet.</p>
              )}
              {optionB ? (
                <OptionColumn source="B" option={optionB} brand={brand} pickedUids={pickedUids} onToggle={toggle} onUseAll={useAll} />
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">Option B isn't available yet.</p>
              )}

              <div className="space-y-2.5 min-w-0 lg:border-l lg:border-[var(--ink-700)] lg:pl-6">
                <h3 className="font-medium text-sm">Final page ({picked.length})</h3>

                {picked.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)]">Nothing yet. Add sections from Option A or B, or start with "Use all".</p>
                ) : (
                  <ol className="space-y-2">
                    {picked.map((p, i) => (
                      <li key={p.uid} className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--ink-850)] border border-[var(--ink-700)] p-2">
                        <span className="shrink-0 w-6 h-6 rounded bg-[var(--ink-700)] text-[11px] font-semibold flex items-center justify-center text-[var(--text-secondary)]">
                          {p.source}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-[var(--text-primary)] truncate">
                            {typeLabel(p.section)}: {labelFor(p.section)}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] truncate">{snippetFor(p.section)}</div>
                        </div>
                        <div className="flex shrink-0">
                          <IconButton label="Move up" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                            <ArrowUp className="w-4 h-4" />
                          </IconButton>
                          <IconButton label="Move down" size="sm" onClick={() => move(i, 1)} disabled={i === picked.length - 1}>
                            <ArrowDown className="w-4 h-4" />
                          </IconButton>
                          <IconButton label="Remove section" size="sm" onClick={() => remove(p.uid)}>
                            <X className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {picked.length > 0 && picked[0].section.section_type !== 'hero' && (
                  <p className="text-xs text-[var(--thread)]">Tip: landing pages usually open with a hero section.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--ink-700)]">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={apply} disabled={picked.length === 0}>
                Apply merged layout
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MergePanel;
