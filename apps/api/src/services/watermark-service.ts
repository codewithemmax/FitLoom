import sharp from 'sharp';

export type WatermarkedImage = { buffer: Buffer; mimeType: 'image/jpeg' };

export type WatermarkService = {
  applyWatermark(image: Buffer): Promise<WatermarkedImage>;
};

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Composites the TrueFit mark onto a generated result. The vendor returns clean
 * images — there is no watermark option on the YouCam API — so branding is
 * applied here, at download time, leaving the stored original untouched.
 */
export const createWatermarkService = (label = 'TrueFit'): WatermarkService => ({
  async applyWatermark(image: Buffer): Promise<WatermarkedImage> {
    const metadata = await sharp(image).metadata();
    const width = metadata.width ?? 1024;
    const height = metadata.height ?? 1024;

    // Every dimension scales with the image so the mark reads the same at any
    // output resolution (results range from ~768px to 4096px on the long side).
    const fontSize = Math.max(13, Math.round(width * 0.032));
    const padding = Math.round(fontSize * 0.62);
    const margin = Math.round(width * 0.028);
    const textWidth = Math.round(label.length * fontSize * 0.58);
    const pillWidth = textWidth + padding * 2;
    const pillHeight = Math.round(fontSize * 1.9);
    const x = width - pillWidth - margin;
    const y = height - pillHeight - margin;

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g>
        <rect x="${x}" y="${y}" width="${pillWidth}" height="${pillHeight}" rx="${Math.round(pillHeight / 2)}"
              fill="#1e201d" fill-opacity="0.52"/>
        <text x="${x + pillWidth / 2}" y="${y + pillHeight / 2}"
              font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600"
              letter-spacing="${(fontSize * 0.04).toFixed(2)}"
              fill="#ffffff" fill-opacity="0.94" text-anchor="middle" dominant-baseline="central"
        >${escapeXml(label)}</text>
      </g>
    </svg>`;

    const buffer = await sharp(image)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    return { buffer, mimeType: 'image/jpeg' };
  },
});
