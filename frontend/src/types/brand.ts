export interface BrandStrategy {
  name: string;
  tagline: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  bg_color: string;
  heading_font: string;
  body_font: string;
  motion_profile: 'energetic_stagger' | 'minimal_fade' | 'slide_reveal';
}

export interface SectionContent {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  title?: string;
  items?: Array<{ title: string; desc: string }>;
}

export interface PageSection {
  id: string;
  template_id: string;
  section_type: 'hero' | 'features' | 'cta';
  content: SectionContent;
}

export type AttachmentKind = 'image' | 'document' | 'video';

export interface ChatAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  size: number;
  mime: string;
  /** The raw file, so the parent can base64 / extract text / upload it. */
  file: File;
  /** Object URL for image + video previews (undefined for documents). */
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

/** One complete landing page proposal from the AI (e.g. "Option A"). */
export interface LayoutOption {
  id: string;
  name: string;
  description?: string;
  sections: PageSection[];
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: Pick<
    BrandStrategy,
    'primary_color' | 'secondary_color' | 'accent_color' | 'bg_color'
  >;
}
