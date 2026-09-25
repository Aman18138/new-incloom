import React, { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { CanvasPreview } from './components/CanvasPreview';
import { MergePanel } from './components/MergePanel';
import { TEMPLATE_CATALOG } from './components/TemplateRegistry';
import { IconButton, Tooltip } from './components/ui/primitives';
import { prepareAttachments } from './utils/attachments';
import { ChatMessage, BrandStrategy, PageSection, LayoutOption, ChatAttachment } from './types/brand';
import { LayoutGrid, Settings } from 'lucide-react';
import './styles/theme.css';

const API_URL = 'http://localhost:8000/api';

const now = () => new Date().toLocaleTimeString();

const normalizeOption = (raw: any, index: number): LayoutOption => {
  const id = String(raw?.id ?? `option-${index + 1}`);
  const sections: PageSection[] = (Array.isArray(raw?.sections) ? raw.sections : []).map(
    (s: PageSection, i: number) => ({ ...s, id: s.id || `${id}-${i + 1}` })
  );
  return { id, name: raw?.name || `Option ${String.fromCharCode(65 + index)}`, description: raw?.description, sections };
};

const deriveAlternative = (base: LayoutOption): LayoutOption => ({
  id: 'alt',
  name: 'Option B',
  description: 'Same copy, different section styles',
  sections: base.sections.map((s) => {
    const sameType = TEMPLATE_CATALOG.filter((t) => t.section_type === s.section_type);
    const index = sameType.findIndex((t) => t.id === s.template_id);
    const next = sameType.length ? sameType[(index + 1) % sameType.length] : undefined;
    return {
      ...s,
      id: `${s.id}-alt`,
      template_id: next?.id ?? s.template_id,
      content: { ...s.content, items: s.content.items?.map((item) => ({ ...item })) }
    };
  })
});

/** Slim left rail — currently one real workspace, structured so more views
 * (a dedicated Brand Kit page, project history, etc.) can slot in later. */
const SideRail: React.FC = () => (
  <div className="hidden md:flex w-16 h-full shrink-0 bg-[var(--ink-900)] border-r border-[var(--ink-700)] flex-col items-center py-4 justify-between">
    <div className="flex flex-col items-center gap-6">
      <Tooltip label="Ink Loom Studio">
        <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--ink-800)] border border-[var(--ink-700)] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 8c2-4 4-6 6-6s2 4 0 6-4 2-6 6" stroke="var(--thread)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      </Tooltip>
      <IconButton label="Studio" active>
        <LayoutGrid className="w-4 h-4" />
      </IconButton>
    </div>
    <IconButton label="Settings">
      <Settings className="w-4 h-4" />
    </IconButton>
  </div>
);

/** Compact top bar shown on small screens, with a Chat/Preview switcher
 * standing in for the sidebar (there's nothing to put in a drawer yet —
 * this is the functional mobile affordance the brief asks for instead). */
const MobileTopBar: React.FC<{ view: 'chat' | 'preview'; onChange: (v: 'chat' | 'preview') => void }> = ({
  view,
  onChange
}) => (
  <div className="flex md:hidden h-14 shrink-0 items-center justify-between px-3 bg-[var(--ink-900)] border-b border-[var(--ink-700)]">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--ink-800)] border border-[var(--ink-700)] flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 8c2-4 4-6 6-6s2 4 0 6-4 2-6 6" stroke="var(--thread)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <span className="font-[var(--font-display)] text-sm text-[var(--text-primary)]">Ink Loom</span>
    </div>
    <div className="flex bg-[var(--ink-800)] rounded-[var(--radius-md)] border border-[var(--ink-700)] p-0.5 text-xs font-medium">
      {(['chat', 'preview'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors capitalize ${
            view === v ? 'bg-[var(--thread-soft)] text-[var(--thread)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  </div>
);

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Welcome to Ink Loom AI. Tell me about your product or community idea to build your brand and dynamic landing page.',
      timestamp: now()
    }
  ]);
  const [brand, setBrand] = useState<BrandStrategy | null>(null);
  const [options, setOptions] = useState<LayoutOption[]>([]);
  const [activeId, setActiveId] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');

  const layout: PageSection[] = options.find((o) => o.id === activeId)?.sections ?? [];

  const addAssistantMessage = (content: string) =>
    setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content, timestamp: now() }]);

  const applyLayoutFromResponse = (data: any) => {
    let incoming: LayoutOption[] = [];
    if (Array.isArray(data.layout_options)) {
      incoming = data.layout_options.map(normalizeOption).filter((o: LayoutOption) => o.sections.length > 0);
    } else if (Array.isArray(data.layout) && data.layout.length > 0) {
      incoming = [normalizeOption({ id: 'main', name: 'Option A', sections: data.layout }, 0)];
    }
    if (incoming.length === 0) return;
    const next = incoming.length >= 2 ? incoming : [...incoming, deriveAlternative(incoming[0])];
    setOptions(next);
    setActiveId(next[0].id);
  };

  const handleSendMessage = async (userPrompt: string, attachments?: ChatAttachment[]) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userPrompt, timestamp: now(), attachments };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setMobileView('preview'); // jump to the canvas on mobile once generation starts

    try {
      let attachmentPayload: Awaited<ReturnType<typeof prepareAttachments>>['payload'] = [];
      if (attachments && attachments.length > 0) {
        const prepared = await prepareAttachments(attachments);
        attachmentPayload = prepared.payload;
        if (prepared.failed.length > 0) {
          addAssistantMessage(`I couldn't read ${prepared.failed.join(', ')}, so I'll continue without it.`);
        }
      }

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userPrompt,
          conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
          current_layout: layout,
          current_brand: brand,
          ...(attachmentPayload.length > 0 ? { attachments: attachmentPayload } : {})
        })
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

      if (data.reply) addAssistantMessage(data.reply);
      if (data.brand) setBrand(data.brand);
      applyLayoutFromResponse(data);
    } catch (err) {
      const detail = err instanceof Error ? ` (${err.message})` : '';
      addAssistantMessage(`Failed to communicate with the AI server${detail}. Make sure the FastAPI backend is running.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBrand = (updated: Partial<BrandStrategy>) => setBrand((prev) => (prev ? { ...prev, ...updated } : prev));

  const handleApplyMerge = (sections: PageSection[]) => {
    const merged: LayoutOption = { id: 'merged', name: 'Merged', description: 'Sections you picked from Option A and B', sections };
    setOptions((prev) => [...prev.filter((o) => o.id !== 'merged'), merged]);
    setActiveId('merged');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[var(--ink-950)] font-[var(--font-ui)]">
      <SideRail />
      <MobileTopBar view={mobileView} onChange={setMobileView} />

      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-none min-h-0`}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          brand={brand}
          onUpdateBrand={handleUpdateBrand}
          onMergeTrigger={() => setMergeOpen(true)}
          canMerge={options.filter((o) => o.id !== 'merged').length >= 2}
          isLoading={isLoading}
        />
      </div>

      <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 min-h-0`}>
        <CanvasPreview
          layout={layout}
          brand={brand}
          layoutOptions={options}
          activeOptionId={activeId}
          onSelectOption={setActiveId}
          isGenerating={isLoading && layout.length === 0}
        />
      </div>

      {brand && (
        <MergePanel
          isOpen={mergeOpen}
          brand={brand}
          optionA={options[0] ?? null}
          optionB={options[1] ?? null}
          onClose={() => setMergeOpen(false)}
          onApply={handleApplyMerge}
        />
      )}
    </div>
  );
};

export default App;
