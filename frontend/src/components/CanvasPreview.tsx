import React, { useEffect, useRef, useState } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { PageSection, BrandStrategy, LayoutOption } from '../types/brand';
import { RenderSection } from './TemplateRegistry';
import { readableOn } from '../utils/color';
import { IconButton, Skeleton } from './ui/primitives';
import { Monitor, Smartphone, Download, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react';

interface CanvasPreviewProps {
  layout: PageSection[];
  brand: BrandStrategy | null;
  layoutOptions?: LayoutOption[];
  activeOptionId?: string;
  onSelectOption?: (id: string) => void;
  /** Shows skeleton section placeholders instead of the empty state while the AI is generating. */
  isGenerating?: boolean;
}

/* ------------------------------------------------------------------ */
/* Export helpers (unchanged logic from the previous version)          */
/* ------------------------------------------------------------------ */

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const GENERIC_FONTS = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'ui-sans-serif', 'ui-serif']);

const firstFamily = (font: string | undefined): string => (font || '').split(',')[0].replace(/['"]/g, '').trim();
const safeFamily = (font: string | undefined): string => firstFamily(font).replace(/[^a-zA-Z0-9 \-]/g, '');
const fontStack = (font: string | undefined, fallback: string): string => {
  const name = safeFamily(font);
  return name ? `'${name}', ${fallback}` : fallback;
};

const googleFontsHref = (fonts: Array<string | undefined>): string | null => {
  const families = Array.from(new Set(fonts.map(safeFamily).filter((n) => n && !GENERIC_FONTS.has(n.toLowerCase()))));
  if (families.length === 0) return null;
  const params = families.map((n) => `family=${n.replace(/ /g, '+')}:wght@400;500;600;700`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
};

const safeColor = (value: string | undefined, fallback: string): string =>
  /^#[0-9a-f]{3,8}$/i.test((value || '').trim()) ? value!.trim() : fallback;

const renderExportSection = (s: PageSection): string => {
  const c = s.content || {};
  const heading = escapeHtml(c.headline || c.title || '');
  const sub = c.subheadline ? `<p class="sub">${escapeHtml(c.subheadline)}</p>` : '';
  const cta = c.cta_text ? `<a class="btn" href="#">${escapeHtml(c.cta_text)}</a>` : '';

  if (s.section_type === 'features') {
    const items = (c.items || [])
      .map((it) => `<article class="card"><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.desc)}</p></article>`)
      .join('');
    return `<section class="features"><h2>${heading}</h2>${sub}<div class="grid">${items}</div></section>`;
  }
  if (s.section_type === 'cta') {
    return `<section class="cta"><h2>${heading}</h2>${sub}${cta}</section>`;
  }
  return `<section class="hero"><h1>${heading}</h1>${sub}${cta}</section>`;
};

const buildExportHtml = (brand: BrandStrategy, layout: PageSection[]): string => {
  const bg = safeColor(brand.bg_color, '#ffffff');
  const ink = safeColor(brand.primary_color, '#111111');
  const muted = safeColor(brand.secondary_color, '#555555');
  const accent = safeColor(brand.accent_color, '#4f46e5');
  const onAccent = readableOn(accent);
  const fontsHref = googleFontsHref([brand.heading_font, brand.body_font]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(brand.name)}</title>
  ${fontsHref ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="stylesheet" href="${fontsHref}">` : ''}
  <style>
    :root { --bg: ${bg}; --ink: ${ink}; --muted: ${muted}; --accent: ${accent}; --on-accent: ${onAccent}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ${fontStack(brand.body_font, 'system-ui, sans-serif')}; background: var(--bg); color: var(--ink); line-height: 1.6; }
    h1, h2, h3 { font-family: ${fontStack(brand.heading_font, 'system-ui, sans-serif')}; line-height: 1.15; margin: 0 0 16px; }
    h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); }
    h2 { font-size: clamp(1.75rem, 4vw, 2.75rem); }
    h3 { font-size: 1.25rem; }
    section { padding: 88px 8%; }
    .sub { color: var(--muted); font-size: 1.125rem; max-width: 60ch; margin: 0 0 28px; }
    .btn { display: inline-block; background: var(--accent); color: var(--on-accent); text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 10px; }
    .btn:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-top: 40px; }
    .card { padding: 24px; border: 1px solid color-mix(in srgb, var(--ink) 15%, transparent); border-radius: 14px; }
    .card p { margin: 0; color: var(--muted); }
    .cta { text-align: center; }
    .cta .sub { margin-left: auto; margin-right: auto; }
    @media (prefers-reduced-motion: no-preference) {
      section { animation: rise .6s ease both; }
      @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    }
  </style>
</head>
<body>${layout.map(renderExportSection).join('')}
</body>
</html>`;
};

const safeFileName = (name: string | undefined): string =>
  (name || 'brand').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'brand';

/* ------------------------------------------------------------------ */
/* Zoom control                                                        */
/* ------------------------------------------------------------------ */

const ZOOM_STEPS = [0.75, 1, 1.25];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  layout,
  brand,
  layoutOptions,
  activeOptionId,
  onSelectOption,
  isGenerating = false
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [zoomIndex, setZoomIndex] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await frameRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser/embedding context; fail quietly.
    }
  };

  if (!brand || (layout.length === 0 && !isGenerating)) {
    return (
      <div className="flex-1 h-full bg-[var(--ink-950)] flex flex-col items-center justify-center text-center p-8">
        <div className="relative w-16 h-16 mb-6 rounded-[var(--radius-lg)] bg-[var(--ink-900)] border border-[var(--ink-700)] flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-[var(--radius-lg)]"
            style={{ background: 'radial-gradient(circle at 50% 30%, var(--thread-soft), transparent 70%)' }}
            aria-hidden="true"
          />
          <Monitor className="w-7 h-7 text-[var(--thread)] relative" />
        </div>
        <h3 className="font-[var(--font-display)] text-2xl text-[var(--text-primary)] mb-2">Your canvas is waiting</h3>
        <p className="max-w-md text-sm text-[var(--text-secondary)]">
          Describe your idea in the chat and Ink Loom will generate a live, animated brand and landing page here.
        </p>
      </div>
    );
  }

  const exportHTML = () => {
    if (!brand) return;
    const html = buildExportHtml(brand, layout);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(brand.name)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex-1 min-w-0 h-full bg-[var(--ink-950)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 shrink-0 bg-[var(--ink-900)] border-b border-[var(--ink-700)] flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] shrink-0" aria-hidden="true" />
          <span className="font-medium text-[var(--text-primary)] truncate text-sm">{brand?.name ?? 'Untitled'}</span>
          {brand && (
            <span className="hidden md:block text-xs text-[var(--text-tertiary)] truncate">
              {brand.heading_font} &amp; {brand.body_font}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex items-center bg-[var(--ink-800)] rounded-[var(--radius-md)] border border-[var(--ink-700)] mr-1">
            <IconButton
              label="Zoom out"
              size="sm"
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              disabled={zoomIndex === 0}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </IconButton>
            <span className="text-[11px] text-[var(--text-tertiary)] w-9 text-center tabular-nums select-none">
              {Math.round(ZOOM_STEPS[zoomIndex] * 100)}%
            </span>
            <IconButton
              label="Zoom in"
              size="sm"
              onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </IconButton>
          </div>

          <div className="flex bg-[var(--ink-800)] rounded-[var(--radius-md)] border border-[var(--ink-700)] p-0.5" role="group" aria-label="Preview size">
            <IconButton label="Desktop preview" size="sm" active={viewMode === 'desktop'} onClick={() => setViewMode('desktop')}>
              <Monitor className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton label="Mobile preview" size="sm" active={viewMode === 'mobile'} onClick={() => setViewMode('mobile')}>
              <Smartphone className="w-3.5 h-3.5" />
            </IconButton>
          </div>

          <IconButton label={isFullscreen ? 'Exit full screen' : 'Full screen'} size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </IconButton>

          <button
            type="button"
            onClick={exportHTML}
            className="ml-1 flex items-center gap-1.5 bg-[var(--thread)] hover:bg-[var(--thread-strong)] text-[var(--thread-ink)]
              px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors shadow-[var(--shadow-thread)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Layout option switcher */}
      {layoutOptions && layoutOptions.length > 1 && (
        <div className="shrink-0 bg-[var(--ink-900)]/60 border-b border-[var(--ink-700)] px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-[var(--text-tertiary)] shrink-0">Layouts</span>
          {layoutOptions.map((opt) => {
            const active = opt.id === activeOptionId;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectOption?.(opt.id)}
                aria-pressed={active}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--thread-soft)] text-[var(--thread)] border border-[var(--thread)]/40'
                    : 'bg-[var(--ink-800)] text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-10 flex justify-center">
        <div
          ref={frameRef}
          style={{
            transform: `scale(${ZOOM_STEPS[zoomIndex]})`,
            transformOrigin: 'top center',
            transition: 'transform 220ms var(--ease-premium, ease)'
          }}
          className={isFullscreen ? 'bg-[var(--ink-950)] w-full h-full flex items-start justify-center overflow-auto p-10' : ''}
        >
          <div
            className={`mx-auto bg-white shadow-[var(--shadow-lg)] overflow-hidden transition-[width] duration-300 ease-[var(--ease-premium)] ${
              viewMode === 'mobile' ? 'w-[375px] max-w-full min-h-[667px] rounded-[24px]' : 'w-full max-w-6xl rounded-[var(--radius-lg)]'
            }`}
          >
            {isGenerating ? (
              <div className="p-10 space-y-8">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-11 w-40" />
                <div className="grid grid-cols-3 gap-4 pt-6">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                </div>
              </div>
            ) : (
              <MotionConfig reducedMotion="user">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeOptionId ?? 'layout'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {layout.map((sec) => (
                      <RenderSection key={sec.id} section={sec} brand={brand} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </MotionConfig>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasPreview;
