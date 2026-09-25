import React from 'react'
import { motion, Variants } from 'framer-motion'
import { PageSection, BrandStrategy } from '../types/brand'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { readableOn, withAlpha } from '../utils/color'

interface ComponentProps {
  section: PageSection
  brand: BrandStrategy
}

/* ------------------------------------------------------------------ */
/* Catalog: single source of truth for template ids                    */
/* Use it in the merge UI and in the AI prompt so the model only       */
/* returns template ids that actually exist.                           */
/* ------------------------------------------------------------------ */

export interface TemplateMeta {
  id: string
  section_type: PageSection['section_type']
  label: string
  description: string
}

export const TEMPLATE_CATALOG: TemplateMeta[] = [
  { id: 'hero_bold_01', section_type: 'hero', label: 'Bold centered', description: 'Big centered headline with a badge and button' },
  { id: 'hero_minimal_02', section_type: 'hero', label: 'Minimal editorial', description: 'Left-aligned serif headline with an accent rule' },
  { id: 'hero_split_03', section_type: 'hero', label: 'Split with brand panel', description: 'Text on the left, brand-colored panel on the right' },
  { id: 'features_bento_01', section_type: 'features', label: 'Feature cards', description: 'Three cards in a row' },
  { id: 'features_grid_02', section_type: 'features', label: 'Icon grid', description: 'Two-column grid with icon badges' },
  { id: 'features_list_03', section_type: 'features', label: 'Stacked rows', description: 'Title on the left, description on the right, divided by rules' },
  { id: 'cta_glow_01', section_type: 'cta', label: 'Email capture', description: 'Dark card with email field and button' },
  { id: 'cta_banner_02', section_type: 'cta', label: 'Full-width banner', description: 'Accent-colored bar with headline and button' }
]

export const getTemplateMeta = (id: string): TemplateMeta | undefined =>
  TEMPLATE_CATALOG.find((t) => t.id === id)

/** Paste this into the system prompt so the model picks valid template ids. */
export const templatesForPrompt = (): string =>
  (['hero', 'features', 'cta'] as const)
    .map(
      (type) =>
        `${type}: ` +
        TEMPLATE_CATALOG.filter((t) => t.section_type === type)
          .map((t) => `${t.id} (${t.label})`)
          .join(', ')
    )
    .join('\n')

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

const getMotionVariants = (profile: string): Variants => {
  if (profile === 'minimal_fade') {
    return { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6 } } }
  }
  if (profile === 'slide_reveal') {
    return { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } } }
  }
  return { hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.15 } } }
}

const DEFAULT_ITEMS = [
  { title: 'Dynamic Intelligence', desc: 'Automated brand decisions in real-time.' },
  { title: 'Modular Architecture', desc: 'Stitch and merge design systems effortlessly.' },
  { title: 'Launch Ready', desc: 'Export clean code and visual assets instantly.' }
]

/* ------------------------------------------------------------------ */
/* Heroes                                                              */
/* ------------------------------------------------------------------ */

export const HeroBold: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="min-h-[70vh] flex flex-col justify-center items-center text-center px-6 py-20 relative overflow-hidden" style={{ backgroundColor: brand.bg_color }}>
      <motion.div variants={variants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-sm border" style={{ borderColor: brand.accent_color, color: brand.accent_color }}>
        <Sparkles className="w-4 h-4" /> {brand.name} Identity System
      </motion.div>
      <motion.h1 variants={variants} className="text-5xl md:text-7xl font-extrabold max-w-4xl tracking-tight mb-6" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>
        {section.content.headline || 'Transform Your Vision Into Reality'}
      </motion.h1>
      <motion.p variants={variants} className="text-lg md:text-xl max-w-2xl mb-8 leading-relaxed opacity-80" style={{ color: brand.secondary_color, fontFamily: brand.body_font }}>
        {section.content.subheadline || brand.tagline}
      </motion.p>
      <motion.button variants={variants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-2" style={{ backgroundColor: brand.accent_color, color: readableOn(brand.accent_color) }}>
        {section.content.cta_text || 'Get Started'} <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.section>
  )
}

export const HeroMinimal: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="min-h-[60vh] flex flex-col justify-center px-8 py-16" style={{ backgroundColor: brand.bg_color }}>
      <div className="max-w-5xl mx-auto border-l-4 pl-8" style={{ borderColor: brand.accent_color }}>
        <motion.h1 variants={variants} className="text-4xl md:text-6xl font-serif mb-4" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>
          {section.content.headline || brand.name}
        </motion.h1>
        <motion.p variants={variants} className="text-lg max-w-xl mb-6 opacity-75" style={{ color: brand.secondary_color, fontFamily: brand.body_font }}>
          {section.content.subheadline || brand.tagline}
        </motion.p>
        {section.content.cta_text && (
          <motion.button variants={variants} className="underline font-semibold text-lg" style={{ color: brand.accent_color }}>
            {section.content.cta_text} →
          </motion.button>
        )}
      </div>
    </motion.section>
  )
}

export const HeroSplit: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  const onAccent = readableOn(brand.accent_color)
  const initial = (brand.name || '?').trim().charAt(0).toUpperCase()
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="min-h-[60vh] flex items-center px-6 md:px-8 py-16" style={{ backgroundColor: brand.bg_color }}>
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 items-center gap-10 md:gap-16">
        <div>
          <motion.h1 variants={variants} className="text-4xl md:text-6xl font-bold tracking-tight mb-5" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>
            {section.content.headline || brand.name}
          </motion.h1>
          <motion.p variants={variants} className="text-lg max-w-md mb-8 leading-relaxed opacity-80" style={{ color: brand.secondary_color, fontFamily: brand.body_font }}>
            {section.content.subheadline || brand.tagline}
          </motion.p>
          {section.content.cta_text && (
            <motion.button variants={variants} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="px-7 py-3.5 rounded-xl font-bold shadow-md" style={{ backgroundColor: brand.accent_color, color: onAccent }}>
              {section.content.cta_text}
            </motion.button>
          )}
        </div>
        <motion.div variants={variants} className="relative aspect-square w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden flex items-center justify-center" style={{ backgroundColor: brand.accent_color }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ backgroundColor: withAlpha(onAccent, 0.12) }} />
          <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full" style={{ backgroundColor: withAlpha(onAccent, 0.08) }} />
          <span className="relative text-[9rem] font-extrabold leading-none select-none" style={{ color: onAccent, fontFamily: brand.heading_font }}>
            {initial}
          </span>
        </motion.div>
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

export const FeaturesBento: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  const items = section.content.items || DEFAULT_ITEMS

  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="py-20 px-6" style={{ backgroundColor: brand.bg_color }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>
          {section.content.title || 'Engineered for Distinctiveness'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <motion.div key={idx} variants={variants} whileHover={{ y: -5 }} className="p-6 rounded-2xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: withAlpha(brand.primary_color, 0.04), borderColor: withAlpha(brand.primary_color, 0.14) }}>
              <div>
                <CheckCircle2 className="w-8 h-8 mb-4" style={{ color: brand.accent_color }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>{item.title}</h3>
                <p className="text-sm opacity-75 leading-relaxed" style={{ color: brand.secondary_color, fontFamily: brand.body_font }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

export const FeaturesGrid: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  const items = section.content.items || DEFAULT_ITEMS

  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="py-20 px-6" style={{ backgroundColor: brand.bg_color }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 max-w-xl" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>
          {section.content.title || 'Engineered for Distinctiveness'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {items.map((item, idx) => (
            <motion.div key={idx} variants={variants} className="flex gap-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: withAlpha(brand.accent_color, 0.15) }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: brand.accent_color }} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>{item.title}</h3>
                <p className="text-sm leading-relaxed opacity-80" style={{ color: brand.secondary_color, fontFamily: brand.body_font }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

export const FeaturesList: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  const items = section.content.items || DEFAULT_ITEMS

  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="py-20 px-6" style={{ backgroundColor: brand.bg_color }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-10" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>
          {section.content.title || 'Engineered for Distinctiveness'}
        </h2>
        <div>
          {items.map((item, idx) => (
            <motion.div key={idx} variants={variants} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2 md:gap-10 py-7 border-t" style={{ borderColor: withAlpha(brand.secondary_color, 0.35) }}>
              <h3 className="text-xl font-bold" style={{ color: brand.primary_color, fontFamily: brand.heading_font }}>{item.title}</h3>
              <p className="leading-relaxed opacity-80" style={{ color: brand.secondary_color, fontFamily: brand.body_font }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Calls to action                                                     */
/* ------------------------------------------------------------------ */

export const CTAGlow: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  const onPrimary = readableOn(brand.primary_color)
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="py-20 px-6" style={{ backgroundColor: brand.bg_color }}>
      <div className="max-w-4xl mx-auto rounded-3xl p-10 text-center relative overflow-hidden shadow-2xl" style={{ backgroundColor: brand.primary_color }}>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: onPrimary, fontFamily: brand.heading_font }}>
            {section.content.headline || 'Ready to launch your brand?'}
          </h2>
          <p className="mb-8 max-w-lg mx-auto opacity-80" style={{ color: onPrimary, fontFamily: brand.body_font }}>
            {section.content.subheadline || 'Generate your identity and dynamic landing page in under 2 minutes.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto">
            <input type="email" placeholder="Enter your email" aria-label="Email address" className="px-4 py-3 rounded-xl text-black outline-none flex-1" />
            <button className="px-6 py-3 rounded-xl font-bold shadow" style={{ backgroundColor: brand.accent_color, color: readableOn(brand.accent_color) }}>
              {section.content.cta_text || 'Claim Access'}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export const CTABanner: React.FC<ComponentProps> = ({ section, brand }) => {
  const variants = getMotionVariants(brand.motion_profile)
  const onAccent = readableOn(brand.accent_color)
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={variants} className="py-14 px-6" style={{ backgroundColor: brand.accent_color }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <motion.h2 variants={variants} className="text-3xl md:text-4xl font-bold mb-2" style={{ color: onAccent, fontFamily: brand.heading_font }}>
            {section.content.headline || 'Ready to launch your brand?'}
          </motion.h2>
          <motion.p variants={variants} className="opacity-85" style={{ color: onAccent, fontFamily: brand.body_font }}>
            {section.content.subheadline || brand.tagline}
          </motion.p>
        </div>
        <motion.button variants={variants} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="px-7 py-3.5 rounded-xl font-bold shadow-lg shrink-0 flex items-center gap-2" style={{ backgroundColor: onAccent, color: brand.accent_color }}>
          {section.content.cta_text || 'Get Started'} <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const TEMPLATE_COMPONENTS: Record<string, React.FC<ComponentProps>> = {
  hero_bold_01: HeroBold,
  hero_minimal_02: HeroMinimal,
  hero_split_03: HeroSplit,
  features_bento_01: FeaturesBento,
  features_grid_02: FeaturesGrid,
  features_list_03: FeaturesList,
  cta_glow_01: CTAGlow,
  cta_banner_02: CTABanner
}

// If the AI invents an unknown template id, fall back by section type
// (previously every unknown id rendered a hero, even for feature sections).
const DEFAULT_BY_TYPE: Record<PageSection['section_type'], React.FC<ComponentProps>> = {
  hero: HeroBold,
  features: FeaturesBento,
  cta: CTAGlow
}

export const RenderSection: React.FC<ComponentProps> = (props) => {
  const Component =
    TEMPLATE_COMPONENTS[props.section.template_id] ??
    DEFAULT_BY_TYPE[props.section.section_type] ??
    HeroBold
  return <Component {...props} />
}

export default RenderSection
