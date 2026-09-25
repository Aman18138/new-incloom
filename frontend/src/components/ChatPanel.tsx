import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatMessage,
  BrandStrategy,
  ChatAttachment,
  AttachmentKind,
  ColorPalette
} from '../types/brand';
import {
  Send,
  Palette,
  Layers,
  Image as ImageIcon,
  FileText,
  Video,
  X,
  Check,
  Copy,
  Type as TypeIcon
} from 'lucide-react';
import { Button, IconButton, Card, PromptChip, TypingIndicator, Tooltip } from './ui/primitives';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string, attachments?: ChatAttachment[]) => void;
  brand: BrandStrategy | null;
  onUpdateBrand: (updated: Partial<BrandStrategy>) => void;
  onMergeTrigger: () => void;
  canMerge?: boolean;
  isLoading: boolean;
}

const SUGGESTED_PROMPTS = [
  'Create a modern brand for a fitness app',
  'Design a landing page for a coffee subscription',
  'Generate a color palette for a fintech product',
  'Improve my website'
];

/* ------------------------------------------------------------------ */
/* Upload rules (unchanged from before)                                */
/* ------------------------------------------------------------------ */

const KIND_RULES: Record<AttachmentKind, { accept: string; maxMB: number; label: string }> = {
  image: { accept: 'image/png,image/jpeg,image/webp,image/gif', maxMB: 10, label: 'image' },
  document: { accept: 'application/pdf', maxMB: 20, label: 'PDF' },
  video: { accept: 'video/mp4,video/webm,video/quicktime', maxMB: 50, label: 'video' }
};
const MAX_ATTACHMENTS = 5;

const classify = (file: File): AttachmentKind | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'document';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* ------------------------------------------------------------------ */
/* Palette generation (unchanged logic, only the card visuals changed) */
/* ------------------------------------------------------------------ */

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const hexToHsl = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [230, 70, 55];
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

export const buildPalettes = (brand: BrandStrategy): ColorPalette[] => {
  const [h] = hexToHsl(brand.accent_color);
  return [
    {
      id: 'modern-tech',
      name: 'Modern Tech',
      description: 'Deep dark surface, crisp light text, one vivid accent.',
      colors: {
        bg_color: hslToHex(h, 32, 8),
        primary_color: hslToHex(h, 20, 96),
        secondary_color: hslToHex(h + 30, 28, 62),
        accent_color: hslToHex(h, 92, 62)
      }
    },
    {
      id: 'aesthetic-editorial',
      name: 'Aesthetic Editorial',
      description: 'Soft tinted paper, dark ink, a muted complementary accent.',
      colors: {
        bg_color: hslToHex(h + 20, 30, 95),
        primary_color: hslToHex(h, 38, 14),
        secondary_color: hslToHex(h + 20, 20, 42),
        accent_color: hslToHex(h + 180, 48, 40)
      }
    },
    {
      id: 'minimalist',
      name: 'Minimalist',
      description: 'White space, near-black text, a single quiet accent.',
      colors: {
        bg_color: '#ffffff',
        primary_color: hslToHex(h, 10, 10),
        secondary_color: hslToHex(h, 6, 46),
        accent_color: hslToHex(h, 70, 48)
      }
    }
  ];
};

const paletteMatches = (brand: BrandStrategy, p: ColorPalette) =>
  (Object.keys(p.colors) as (keyof ColorPalette['colors'])[]).every(
    (k) => brand[k].toLowerCase() === p.colors[k].toLowerCase()
  );

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const KindIcon: React.FC<{ kind: AttachmentKind; className?: string }> = ({ kind, className }) => {
  if (kind === 'image') return <ImageIcon className={className} />;
  if (kind === 'video') return <Video className={className} />;
  return <FileText className={className} />;
};

const AttachmentChip: React.FC<{ attachment: ChatAttachment; onRemove?: () => void }> = ({
  attachment,
  onRemove
}) => (
  <div className="flex items-center gap-2 bg-[var(--ink-800)] border border-[var(--ink-700)] rounded-[var(--radius-md)] pl-1.5 pr-2 py-1 max-w-full">
    {attachment.kind === 'image' && attachment.previewUrl ? (
      <img src={attachment.previewUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
    ) : (
      <div className="w-8 h-8 rounded bg-[var(--ink-700)] flex items-center justify-center shrink-0">
        <KindIcon kind={attachment.kind} className="w-4 h-4 text-[var(--thread)]" />
      </div>
    )}
    <div className="min-w-0 leading-tight">
      <div className="text-xs text-[var(--text-primary)] truncate max-w-[140px]">{attachment.name}</div>
      <div className="text-[10px] text-[var(--text-tertiary)]">{formatSize(attachment.size)}</div>
    </div>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--ink-700)] shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const CopyableSwatch: React.FC<{ color: string; label: string; onChange: (v: string) => void }> = ({
  color,
  label,
  onChange
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(color);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be unavailable; swatch still shows the hex on hover */
    }
  };
  return (
    <Tooltip label={copied ? 'Copied!' : `${label} · ${color} · click to copy`}>
      <div className="relative flex-1 h-9 rounded-[var(--radius-sm)] border border-[var(--ink-700)] overflow-hidden group/swatch">
        <div className="absolute inset-0" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color}
          aria-label={`Edit ${label} color`}
          onChange={(e) => onChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
        />
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label} hex code`}
          className="absolute bottom-0 right-0 p-1 text-white/70 hover:text-white opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none group-hover/swatch:pointer-events-auto"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </Tooltip>
  );
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  brand,
  onUpdateBrand,
  onMergeTrigger,
  canMerge = true,
  isLoading
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);
  const [showBrandKit, setShowBrandKit] = useState(true);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const pendingRef = useRef<ChatAttachment[]>([]);
  pendingRef.current = attachments;
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    };
  }, []);

  const addFiles = (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;
    const accepted: ChatAttachment[] = [];
    const problems: string[] = [];
    let slots = MAX_ATTACHMENTS - attachments.length;

    for (const file of files) {
      const kind = classify(file);
      if (!kind) {
        problems.push(`${file.name}: only images, PDFs and videos are supported.`);
        continue;
      }
      const { maxMB, label } = KIND_RULES[kind];
      if (file.size > maxMB * 1024 * 1024) {
        problems.push(`${file.name}: ${label} files must be under ${maxMB} MB.`);
        continue;
      }
      if (slots <= 0) {
        problems.push(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
        break;
      }
      slots -= 1;
      accepted.push({
        id: makeId(),
        kind,
        name: file.name,
        size: file.size,
        mime: file.type,
        file,
        previewUrl: kind === 'document' ? undefined : URL.createObjectURL(file)
      });
    }
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted]);
    setUploadError(problems.length ? Array.from(new Set(problems)).join(' ') : null);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
    setUploadError(null);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const submit = (text: string) => {
    if (isLoading) return;
    if (!text.trim() && attachments.length === 0) return;
    onSendMessage(text.trim() || 'Use the attached files as reference for the design.', attachments.length ? attachments : undefined);
    setInput('');
    setAttachments([]);
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const applyPalette = (palette: ColorPalette) => onUpdateBrand(palette.colors);
  const palettes = brand ? buildPalettes(brand) : [];
  const showEmptyState = messages.length <= 1 && !brand;

  return (
    <div className="w-full md:w-[380px] h-full bg-[var(--ink-900)] text-[var(--text-primary)] flex flex-col border-r border-[var(--ink-700)] font-[var(--font-ui)]">
      {/* Header */}
      <div className="h-16 shrink-0 px-4 flex items-center gap-2.5 border-b border-[var(--ink-700)]">
        <div className="relative w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--ink-800)] border border-[var(--ink-700)] flex items-center justify-center overflow-hidden">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 8c2-4 4-6 6-6s2 4 0 6-4 2-6 6" stroke="var(--thread)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-[var(--font-display)] text-[17px] tracking-tight">Ink Loom Studio</h1>
      </div>

      {/* Brand kit */}
      {brand && (
        <div className="border-b border-[var(--ink-700)]">
          <button
            type="button"
            onClick={() => setShowBrandKit((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-expanded={showBrandKit}
          >
            Brand kit
            <span className="text-[var(--text-tertiary)]">{showBrandKit ? '−' : '+'}</span>
          </button>

          <AnimatePresence initial={false}>
            {showBrandKit && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3.5 space-y-3">
                  <Card className="p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-[var(--font-display)] text-base truncate">{brand.name}</span>
                      <Tooltip label="Suggest palettes">
                        <button
                          type="button"
                          onClick={() => setShowPalettes((v) => !v)}
                          aria-expanded={showPalettes}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--thread)] hover:bg-[var(--ink-800)]"
                        >
                          <Palette className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] italic">"{brand.tagline}"</p>

                    <div className="flex gap-1.5">
                      {[
                        { key: 'primary_color' as const, label: 'Primary' },
                        { key: 'secondary_color' as const, label: 'Secondary' },
                        { key: 'accent_color' as const, label: 'Accent' },
                        { key: 'bg_color' as const, label: 'Background' }
                      ].map(({ key, label }) => (
                        <CopyableSwatch
                          key={key}
                          color={brand[key]}
                          label={label}
                          onChange={(v) => onUpdateBrand({ [key]: v })}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] pt-0.5">
                      <TypeIcon className="w-3 h-3" />
                      <span className="truncate">
                        {brand.heading_font} · {brand.body_font}
                      </span>
                    </div>
                  </Card>

                  <AnimatePresence>
                    {showPalettes && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-2"
                      >
                        {palettes.map((p) => {
                          const active = paletteMatches(brand, p);
                          return (
                            <Card key={p.id} as="button" onClick={() => applyPalette(p)} hoverable className="p-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-medium text-[13px]">{p.name}</span>
                                {active && <Check className="w-3.5 h-3.5 text-[var(--thread)]" />}
                              </div>
                              <div className="flex h-4 rounded overflow-hidden border border-[var(--ink-700)] mb-1.5">
                                {[p.colors.bg_color, p.colors.primary_color, p.colors.secondary_color, p.colors.accent_color].map(
                                  (c, i) => (
                                    <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                                  )
                                )}
                              </div>
                              <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{p.description}</p>
                            </Card>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showEmptyState ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full flex flex-col justify-center gap-5 py-6"
          >
            <div>
              <h2 className="font-[var(--font-display)] text-2xl leading-snug mb-1.5">
                Tell me what you're building.
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Describe an idea and I'll generate a brand and two landing page directions.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <PromptChip key={p} onClick={() => submit(p)}>
                  {p}
                </PromptChip>
              ))}
            </div>
          </motion.div>
        ) : (
          messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-[var(--radius-lg)] text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--thread)] text-[var(--thread-ink)] rounded-br-sm'
                    : 'bg-[var(--ink-800)] text-[var(--text-primary)] border border-[var(--ink-700)] rounded-bl-sm'
                }`}
              >
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2">
                    {m.attachments.map((a) => (
                      <AttachmentChip key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
                {m.content}
              </div>
            </motion.div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--ink-800)] border border-[var(--ink-700)] px-3.5 py-2.5 rounded-[var(--radius-lg)] rounded-bl-sm">
              <TypingIndicator label="Designing your brand..." />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className={`p-3 border-t bg-[var(--ink-900)] space-y-2 transition-colors ${
          isDragging ? 'border-[var(--thread)]/50 bg-[var(--thread-soft)]' : 'border-[var(--ink-700)]'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          icon={<Layers className="w-3.5 h-3.5 text-[var(--thread)]" />}
          onClick={onMergeTrigger}
          disabled={!canMerge}
          title={canMerge ? undefined : 'Generate two layout options first'}
          className="w-full"
        >
          Merge Layout Options
        </Button>

        {isDragging && <p className="text-xs text-[var(--thread)] text-center py-1">Drop images, PDFs or videos to attach</p>}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />
            ))}
          </div>
        )}

        {uploadError && (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {uploadError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-1 items-center">
          <IconButton label="Attach image" size="sm" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="w-4 h-4" />
          </IconButton>
          <IconButton label="Attach PDF" size="sm" onClick={() => docInputRef.current?.click()}>
            <FileText className="w-4 h-4" />
          </IconButton>
          <IconButton label="Attach video" size="sm" onClick={() => videoInputRef.current?.click()}>
            <Video className="w-4 h-4" />
          </IconButton>

          <input ref={imageInputRef} type="file" accept={KIND_RULES.image.accept} multiple hidden onChange={handlePick} />
          <input ref={docInputRef} type="file" accept={KIND_RULES.document.accept} multiple hidden onChange={handlePick} />
          <input ref={videoInputRef} type="file" accept={KIND_RULES.video.accept} multiple hidden onChange={handlePick} />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your idea or request changes..."
            className="flex-1 min-w-0 bg-[var(--ink-800)] border border-[var(--ink-700)] rounded-[var(--radius-md)] px-3 py-2 text-sm
              text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--thread)]/50 transition-colors"
          />
          <IconButton
            label="Send message"
            size="md"
            type="submit"
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="!bg-[var(--thread)] !text-[var(--thread-ink)] hover:!bg-[var(--thread-strong)] disabled:!bg-[var(--ink-800)] disabled:!text-[var(--text-tertiary)]"
          >
            <Send className="w-4 h-4" />
          </IconButton>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
