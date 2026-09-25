import { ChatAttachment, AttachmentKind } from '../types/brand';

/** What gets sent to the backend for each attached file. */
export interface AttachmentPayload {
  name: string;
  kind: AttachmentKind;
  mime: string;
  /** JPEG data URLs ("data:image/jpeg;base64,..."). Images: 1. Videos: up to 3 frames. */
  images: string[];
  /** Raw base64 (no "data:" prefix) for PDFs. The backend should extract the text. */
  pdf_base64?: string;
}

const MAX_IMAGE_DIMENSION = 1024;
const VIDEO_FRAME_POSITIONS = [0.15, 0.5, 0.85];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

/** Draw to a canvas at a sensible size and return a compact JPEG data URL. */
const toJpegDataUrl = (source: CanvasImageSource, width: number, height: number): string => {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  // JPEG has no transparency, so paint white first (avoids black PNG backgrounds).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.8);
};

const imageToDataUrl = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  try {
    return toJpegDataUrl(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
};

/** Grab a few still frames so an image-only model can "see" the video's style. */
const videoToFrames = (file: File): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;

    const cleanup = () => {
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail('Timed out reading video'), 15000);

    video.onerror = () => fail('This video format could not be read');
    video.onloadedmetadata = async () => {
      try {
        const frames: string[] = [];
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        for (const position of VIDEO_FRAME_POSITIONS) {
          await new Promise<void>((done, bad) => {
            video.onseeked = () => done();
            video.onerror = () => bad(new Error('Seek failed'));
            video.currentTime = duration * position;
          });
          frames.push(toJpegDataUrl(video, video.videoWidth, video.videoHeight));
        }
        cleanup();
        resolve(frames);
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Could not read video frames');
      }
    };
    video.src = url;
  });

export interface PreparedAttachments {
  payload: AttachmentPayload[];
  /** Names of files that could not be processed. */
  failed: string[];
}

export const prepareAttachments = async (attachments: ChatAttachment[]): Promise<PreparedAttachments> => {
  const payload: AttachmentPayload[] = [];
  const failed: string[] = [];

  for (const a of attachments) {
    try {
      if (a.kind === 'image') {
        payload.push({ name: a.name, kind: a.kind, mime: 'image/jpeg', images: [await imageToDataUrl(a.file)] });
      } else if (a.kind === 'video') {
        payload.push({ name: a.name, kind: a.kind, mime: a.mime, images: await videoToFrames(a.file) });
      } else {
        const dataUrl = await fileToDataUrl(a.file);
        payload.push({
          name: a.name,
          kind: a.kind,
          mime: a.mime,
          images: [],
          pdf_base64: dataUrl.slice(dataUrl.indexOf(',') + 1)
        });
      }
    } catch {
      failed.push(a.name);
    }
  }

  return { payload, failed };
};
