import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Image,
  Layers3,
  LayoutGrid,
  Maximize2,
  MessageSquareText,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Type,
  Video,
  WandSparkles,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "./ui/button";

type MotionMode = "off" | "subtle" | "expressive";
type DeviceMode = "desktop" | "mobile";
type Panel = "brand" | "layout" | "audit";
type LayoutKind = "editorial" | "centered" | "split";

type Brand = {
  name: string;
  tagline: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  motion: MotionMode;
};

type SectionKind = "hero" | "features" | "cta";
type LayoutOption = { id: string; name: string; kind: LayoutKind; sections: SectionKind[] };
type Message = { id: number; role: "user" | "assistant"; text: string };

const fonts = [
  "Fraunces",
  "Instrument Serif",
  "DM Serif Display",
  "Space Grotesk",
  "Sora",
  "Syne",
  "Outfit",
  "Manrope",
  "Work Sans",
  "Plus Jakarta Sans",
  "JetBrains Mono",
  "Libre Baskerville",
];

const palettes = [
  { name: "Ink & Gold", colors: ["#F4F1EA", "#B9B2A4", "#D6A24A", "#101016"] },
  { name: "Forest Signal", colors: ["#EDF4EC", "#9AB39B", "#3D8D62", "#102019"] },
  { name: "Cobalt Paper", colors: ["#F5F7FA", "#758196", "#315FD4", "#111827"] },
  { name: "Coral Editorial", colors: ["#FFF7F2", "#A47C70", "#D95C45", "#251A18"] },
  { name: "Aubergine Mint", colors: ["#F8F4F8", "#9C859B", "#4FAF8F", "#261A27"] },
];

const layouts: LayoutOption[] = [
  { id: "a", name: "Editorial", kind: "editorial", sections: ["hero", "features", "cta"] },
  { id: "b", name: "Centered", kind: "centered", sections: ["hero", "features", "cta"] },
  { id: "c", name: "Split", kind: "split", sections: ["hero", "features", "cta"] },
];

const cliches = [
  { phrase: "Transform your vision", replacement: "Shape a system people remember", reason: "Used across many industries" },
  { phrase: "Cutting-edge", replacement: "Built for fast-moving teams", reason: "Makes an unprovable claim" },
  { phrase: "Get started", replacement: "Create your first direction", reason: "Generic action label" },
];

const baseBrand: Brand = {
  name: "Morrow Studio",
  tagline: "Brand systems with a point of view.",
  background: "#F4F1EA",
  foreground: "#17161A",
  muted: "#777168",
  accent: "#C98B2E",
  headingFont: "Fraunces",
  bodyFont: "Manrope",
  motion: "subtle",
};

const sectionCopy = {
  hero: { label: "Hero", detail: "Identity-led opening statement" },
  features: { label: "Services", detail: "Three focused brand capabilities" },
  cta: { label: "Call to action", detail: "A direct project invitation" },
};

function readableOn(hex: string) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((v) => v + v).join("") : normalized;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#121216" : "#FFFFFF";
}

function randomPalette() {
  const hue = Math.floor(Math.random() * 360);
  return {
    background: `hsl(${hue} 24% 95%)`,
    foreground: `hsl(${hue} 24% 12%)`,
    muted: `hsl(${(hue + 18) % 360} 13% 43%)`,
    accent: `hsl(${(hue + 148) % 360} 58% 43%)`,
  };
}

function IconButton({ label, children, active, onClick, disabled }: { label: string; children: React.ReactNode; active?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "primary" : "ghost"}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-semibold uppercase text-muted-foreground">{children}</span>;
}

function BrandPreview({ brand, layout, sections }: { brand: Brand; layout: LayoutKind; sections: SectionKind[] }) {
  const css = {
    backgroundColor: brand.background,
    color: brand.foreground,
    fontFamily: `'${brand.bodyFont}', sans-serif`,
    "--preview-accent": brand.accent,
    "--preview-muted": brand.muted,
    "--preview-on-accent": readableOn(brand.accent),
    "--preview-heading": `'${brand.headingFont}', serif`,
  } as React.CSSProperties;

  const hero = (
    <section className={`preview-hero preview-hero-${layout}`}>
      <div className="preview-kicker"><Sparkles size={12} /> Independent brand practice</div>
      <h1>Make your brand<br />impossible to confuse.</h1>
      <p>{brand.tagline} Strategy, identity, and digital expression built as one connected system.</p>
      <button type="button">Start a project <span>↗</span></button>
      {layout === "split" && <div className="preview-mark" aria-hidden="true">{brand.name.slice(0, 1)}</div>}
    </section>
  );

  const features = (
    <section className="preview-services">
      <div className="preview-section-heading"><span>01 / Capabilities</span><h2>Clarity before decoration.</h2></div>
      <div className="preview-service-grid">
        {[
          ["Position", "Find the sharpest truth your brand can own."],
          ["Express", "Build a visual language that stays recognisable."],
          ["Activate", "Turn the system into useful digital experiences."],
        ].map(([title, copy], index) => (
          <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>
        ))}
      </div>
    </section>
  );

  const cta = (
    <section className="preview-cta">
      <p>Have a brand problem worth solving?</p>
      <h2>Let’s find its edge.</h2>
      <button type="button">Tell us what you’re building <span>→</span></button>
    </section>
  );

  return (
    <div className={`brand-preview motion-${brand.motion}`} style={css}>
      <header><strong style={{ fontFamily: `'${brand.headingFont}', serif` }}>{brand.name}</strong><span>Selected work&nbsp;&nbsp; Studio&nbsp;&nbsp; Contact</span></header>
      {sections.map((section, index) => <div key={`${section}-${index}`}>{section === "hero" ? hero : section === "features" ? features : cta}</div>)}
    </div>
  );
}

function MergeDialog({ options, onClose, onApply }: { options: LayoutOption[]; onClose: () => void; onApply: (sections: SectionKind[]) => void }) {
  const [picked, setPicked] = useState<{ source: string; section: SectionKind }[]>([]);
  const toggle = (source: string, section: SectionKind) => {
    const key = `${source}-${section}`;
    setPicked((current) => current.some((item) => `${item.source}-${item.section}` === key) ? current.filter((item) => `${item.source}-${item.section}` !== key) : [...current, { source, section }]);
  };
  const move = (index: number, direction: number) => setPicked((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    const currentItem = next[index];
    const targetItem = next[nextIndex];
    if (!currentItem || !targetItem) return current;
    next[index] = targetItem;
    next[nextIndex] = currentItem;
    return next;
  });

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="merge-dialog" role="dialog" aria-modal="true" aria-label="Merge layouts">
        <div className="dialog-header">
          <div><span className="eyebrow">Layout composer</span><h2>Merge the strongest sections</h2></div>
          <IconButton label="Close merge layout" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="merge-grid">
          {options.slice(0, 2).map((option) => (
            <div key={option.id} className="merge-column">
              <div className="merge-column-head"><div><b>{option.name}</b><p>{option.kind} composition</p></div><Button size="sm" onClick={() => setPicked(option.sections.map((section) => ({ source: option.name, section })))}>Use all</Button></div>
              {option.sections.map((section) => {
                const selected = picked.some((item) => item.source === option.name && item.section === section);
                return <button type="button" key={section} className={`section-choice ${selected ? "selected" : ""}`} onClick={() => toggle(option.name, section)}><div className={`section-thumb thumb-${section}`}><span /></div><div><b>{sectionCopy[section].label}</b><small>{sectionCopy[section].detail}</small></div>{selected ? <Check size={16} /> : <Plus size={16} />}</button>;
              })}
            </div>
          ))}
          <div className="merge-column final-column">
            <div className="merge-column-head"><div><b>Final page</b><p>{picked.length} sections selected</p></div></div>
            {picked.length === 0 ? <div className="merge-empty"><Layers3 size={24} /><p>Pick sections from either direction.</p></div> : picked.map((item, index) => (
              <div className="picked-section" key={`${item.source}-${item.section}`}><span>{index + 1}</span><div><b>{sectionCopy[item.section].label}</b><small>From {item.source}</small></div><IconButton label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></IconButton><IconButton label="Move down" disabled={index === picked.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></IconButton></div>
            ))}
          </div>
        </div>
        <div className="dialog-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!picked.length} onClick={() => { onApply(picked.map((item) => item.section)); onClose(); }}>Apply merged layout</Button></div>
      </div>
    </div>
  );
}

export function InkLoomStudio() {
  const [brand, setBrand] = useState(baseBrand);
  const [panel, setPanel] = useState<Panel>("brand");
  const [activeLayout, setActiveLayout] = useState("a");
  const [mergedSections, setMergedSections] = useState<SectionKind[] | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState(0.84);
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Your first brand direction is ready. Adjust the system or tell me what should change." }]);
  const [message, setMessage] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [fontQuery, setFontQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const layout = layouts.find((item) => item.id === activeLayout) ?? { id: "a", name: "Editorial", kind: "editorial" as const, sections: ["hero", "features", "cta"] as SectionKind[] };
  const visibleFonts = useMemo(() => fonts.filter((font) => font.toLowerCase().includes(fontQuery.toLowerCase())), [fontQuery]);
  const updateBrand = (values: Partial<Brand>) => setBrand((current) => ({ ...current, ...values }));

  const applyPalette = (colors: string[]) => {
    const [background, muted, accent, foreground] = colors;
    if (!background || !muted || !accent || !foreground) return;
    updateBrand({ background, muted, accent, foreground });
  };
  const copyColor = async (color: string) => {
    await navigator.clipboard?.writeText(color);
    setCopied(color);
    window.setTimeout(() => setCopied(null), 900);
  };
  const sendMessage = () => {
    if (!message.trim() && !attached.length) return;
    const text = message.trim() || `Use ${attached.join(", ")} as visual reference.`;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text }, { id: Date.now() + 1, role: "assistant", text: "I’ve noted that direction. The live controls above let you shape the result instantly; connect an AI service later for generated copy and layouts." }]);
    setMessage(""); setAttached([]);
  };
  const exportHtml = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${brand.name}</title></head><body style="margin:0;background:${brand.background};color:${brand.foreground};font-family:${brand.bodyFont},sans-serif"><main style="padding:10vw"><p style="color:${brand.accent}">Independent brand practice</p><h1 style="font:600 clamp(3rem,8vw,7rem)/.95 ${brand.headingFont},serif">Make your brand impossible to confuse.</h1><p style="max-width:42rem;color:${brand.muted};font-size:1.25rem">${brand.tagline}</p></main></body></html>`;
    const href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a"); link.href = href; link.download = `${brand.name.toLowerCase().replaceAll(" ", "-")}.html`; link.click(); URL.revokeObjectURL(href);
  };

  return (
    <main className="studio-shell">
      <aside className="icon-rail">
        <div className="loom-mark" aria-label="Ink Loom Studio"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 15c4-8 8-11 12-10 4 2 1 8-3 10s-7 3-8 8" /></svg></div>
        <nav aria-label="Workspace"><IconButton label="Studio" active><LayoutGrid size={17} /></IconButton><IconButton label="Conversation"><MessageSquareText size={17} /></IconButton><IconButton label="Assets"><Image size={17} /></IconButton></nav>
        <IconButton label="Settings"><Settings2 size={17} /></IconButton>
      </aside>

      <aside className="control-panel">
        <header className="panel-header"><div><span className="eyebrow">Creative workspace</span><h1>Ink Loom</h1></div><span className="saved-dot">Saved</span></header>
        <div className="panel-tabs" role="tablist">
          {(["brand", "layout", "audit"] as Panel[]).map((item) => <button type="button" role="tab" aria-selected={panel === item} key={item} onClick={() => setPanel(item)}>{item === "brand" ? <Palette size={14} /> : item === "layout" ? <Layers3 size={14} /> : <ShieldCheck size={14} />}{item}</button>)}
        </div>

        <div className="panel-scroll">
          {panel === "brand" && <>
            <section className="inspector-section">
              <div className="section-title"><div><span className="eyebrow">Identity</span><h2>Brand foundation</h2></div><WandSparkles size={17} /></div>
              <label><FieldLabel>Brand name</FieldLabel><input value={brand.name} onChange={(event) => updateBrand({ name: event.target.value })} /></label>
              <label><FieldLabel>Tagline</FieldLabel><textarea rows={2} value={brand.tagline} onChange={(event) => updateBrand({ tagline: event.target.value })} /></label>
            </section>
            <section className="inspector-section">
              <div className="section-title"><div><span className="eyebrow">Type system</span><h2>Choose any pairing</h2></div><Type size={17} /></div>
              <div className="font-search"><Search size={14} /><input aria-label="Search fonts" placeholder="Search fonts" value={fontQuery} onChange={(event) => setFontQuery(event.target.value)} /></div>
              <label><FieldLabel>Heading</FieldLabel><div className="select-wrap"><select value={brand.headingFont} onChange={(event) => updateBrand({ headingFont: event.target.value })}>{visibleFonts.map((font) => <option key={font}>{font}</option>)}</select><ChevronDown size={14} /></div></label>
              <label><FieldLabel>Body</FieldLabel><div className="select-wrap"><select value={brand.bodyFont} onChange={(event) => updateBrand({ bodyFont: event.target.value })}>{visibleFonts.map((font) => <option key={font}>{font}</option>)}</select><ChevronDown size={14} /></div></label>
              <div className="type-sample"><strong style={{ fontFamily: brand.headingFont }}>Aa</strong><div><b style={{ fontFamily: brand.headingFont }}>{brand.headingFont}</b><small style={{ fontFamily: brand.bodyFont }}>Paired with {brand.bodyFont}</small></div></div>
            </section>
            <section className="inspector-section">
              <div className="section-title"><div><span className="eyebrow">Colour system</span><h2>Curated for this brand</h2></div><Button size="sm" icon={<RefreshCw size={13} />} onClick={() => updateBrand(randomPalette())}>New palette</Button></div>
              <div className="color-row">
                {(["background", "foreground", "muted", "accent"] as const).map((key) => <div className="color-control" key={key}><button type="button" title={`Copy ${brand[key]}`} onClick={() => copyColor(brand[key])} style={{ backgroundColor: brand[key] }}>{copied === brand[key] && <Check size={13} />}</button><input type="color" aria-label={`Choose ${key} color`} value={brand[key].startsWith("#") ? brand[key] : "#777777"} onChange={(event) => updateBrand({ [key]: event.target.value })} /><small>{key.slice(0, 2).toUpperCase()}</small></div>)}
              </div>
              <div className="palette-list">{palettes.map((palette, index) => <button type="button" key={palette.name} onClick={() => applyPalette(palette.colors)}><span>{index === 0 ? "Best match" : "Suggested"}</span><b>{palette.name}</b><i>{palette.colors.map((color) => <em key={color} style={{ backgroundColor: color }} />)}</i></button>)}</div>
            </section>
            <section className="inspector-section">
              <div className="section-title"><div><span className="eyebrow">Interaction</span><h2>Motion profile</h2></div><Zap size={17} /></div>
              <div className="segmented">{(["off", "subtle", "expressive"] as MotionMode[]).map((mode) => <button type="button" key={mode} aria-pressed={brand.motion === mode} onClick={() => updateBrand({ motion: mode })}>{mode}</button>)}</div>
            </section>
          </>}

          {panel === "layout" && <>
            <section className="inspector-section"><div className="section-title"><div><span className="eyebrow">Composition</span><h2>Page directions</h2></div><Layers3 size={17} /></div><div className="layout-cards">{layouts.map((option) => <button type="button" key={option.id} className={activeLayout === option.id ? "active" : ""} onClick={() => { setActiveLayout(option.id); setMergedSections(null); }}><div className={`layout-mini mini-${option.kind}`}><span /><span /><span /></div><div><b>{option.name}</b><small>{option.kind === "editorial" ? "Left-led and art directed" : option.kind === "centered" ? "Focused and balanced" : "Bold two-part opening"}</small></div>{activeLayout === option.id && <Check size={15} />}</button>)}</div></section>
            <section className="inspector-section"><div className="section-title"><div><span className="eyebrow">Custom assembly</span><h2>Combine directions</h2></div></div><p className="helper-copy">Pick the strongest sections from two page directions, reorder them, and create one final layout.</p><Button className="w-full" variant="primary" icon={<Layers3 size={15} />} onClick={() => setMergeOpen(true)}>Merge layouts</Button></section>
          </>}

          {panel === "audit" && <section className="inspector-section audit-section"><div className="audit-score"><div><ShieldCheck size={20} /><span><b>74</b>/100</span></div><p>Distinct foundation. Three phrases weaken the voice.</p></div><div className="section-title"><div><span className="eyebrow">Cliché audit</span><h2>Make the language yours</h2></div></div>{cliches.map((item) => <article className="audit-item" key={item.phrase}><div><span>Flagged phrase</span><b>“{item.phrase}”</b><small>{item.reason}</small></div><div className="audit-replacement"><span>Try instead</span><p>{item.replacement}</p></div><Button size="sm" onClick={() => setMessages((current) => [...current, { id: Date.now(), role: "assistant", text: `Replaced “${item.phrase}” with “${item.replacement}”.` }])}>Use suggestion</Button></article>)}</section>}
        </div>

        <section className="chat-dock">
          <div className="chat-history">{messages.slice(-2).map((item) => <p key={item.id} className={item.role}>{item.text}</p>)}</div>
          {attached.length > 0 && <div className="attachments">{attached.map((file) => <span key={file}>{file}<button type="button" onClick={() => setAttached((current) => current.filter((item) => item !== file))}><X size={11} /></button></span>)}</div>}
          <div className="composer"><textarea aria-label="Message Ink Loom" rows={2} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Ask for a sharper, warmer, bolder direction…" /><div><span><IconButton label="Attach image or PDF" onClick={() => fileRef.current?.click()}><Plus size={16} /></IconButton><input ref={fileRef} hidden type="file" accept="image/*,.pdf,video/*" multiple onChange={(event) => setAttached(Array.from(event.target.files ?? []).slice(0, 5).map((file) => file.name))} /></span><IconButton label="Send" onClick={sendMessage}><Send size={15} /></IconButton></div></div>
        </section>
      </aside>

      <section className="canvas-area">
        <header className="canvas-toolbar">
          <div className="project-title"><span /><div><b>{brand.name}</b><small>Live brand direction</small></div></div>
          <div className="toolbar-actions">
            <div className="zoom-control"><IconButton label="Zoom out" disabled={zoom <= 0.6} onClick={() => setZoom((value) => Math.max(0.6, value - 0.12))}><ZoomOut size={15} /></IconButton><span>{Math.round(zoom * 100)}%</span><IconButton label="Zoom in" disabled={zoom >= 1.08} onClick={() => setZoom((value) => Math.min(1.08, value + 0.12))}><ZoomIn size={15} /></IconButton></div>
            <div className="device-control"><IconButton label="Desktop preview" active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={15} /></IconButton><IconButton label="Mobile preview" active={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={15} /></IconButton></div>
            <IconButton label="Full screen" onClick={() => frameRef.current?.requestFullscreen?.()}><Maximize2 size={15} /></IconButton>
            <Button variant="primary" size="sm" icon={<Download size={14} />} onClick={exportHtml}>Export</Button>
          </div>
        </header>
        <div className="layout-switcher"><span>Directions</span>{layouts.map((option) => <button type="button" key={option.id} aria-pressed={activeLayout === option.id} onClick={() => { setActiveLayout(option.id); setMergedSections(null); }}>{option.name}</button>)}{mergedSections && <button type="button" aria-pressed="true">Merged</button>}<Button size="sm" icon={<Layers3 size={13} />} onClick={() => setMergeOpen(true)}>Merge</Button></div>
        <div className="canvas-stage" ref={frameRef}>
          <div className={`preview-frame ${device}`} style={{ transform: `scale(${zoom})` }}>
            <BrandPreview brand={brand} layout={layout.kind} sections={mergedSections ?? layout.sections} />
          </div>
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile workspace"><button type="button" onClick={() => setPanel("brand")}><Palette size={18} />Brand</button><button type="button" onClick={() => setPanel("layout")}><Layers3 size={18} />Layout</button><button type="button" onClick={() => setPanel("audit")}><ShieldCheck size={18} />Audit</button></nav>
      {mergeOpen && <MergeDialog options={layouts} onClose={() => setMergeOpen(false)} onApply={setMergedSections} />}
    </main>
  );
}