import sharp from 'sharp';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

export interface OgCardOptions {
  title: string;
  subtitle: string;
  badge?: string;
  tags?: string[];
  dateStr?: string;
}

export async function renderOgCardPng(options: OgCardOptions): Promise<ArrayBuffer> {
  const {
    title,
    subtitle,
    badge = 'FRONTEND ARCHITECTURE & APPLICATION SECURITY',
    tags = [],
    dateStr = 'hristov.dev',
  } = options;

  const titleLines = wrapText(title, 36, 3);
  const subtitleLines = wrapText(subtitle, 68, 2);
  const displayTags = tags.slice(0, 4);

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="80" y="${235 + idx * 62}" fill="#F9FAFB" font-family="sans-serif" font-size="48" font-weight="bold">${escapeXml(line)}</text>`
    )
    .join('\n');

  const subtitleYStart = 235 + titleLines.length * 62 + 24;
  const subtitleSvg = subtitleLines
    .map(
      (line, idx) =>
        `<text x="80" y="${subtitleYStart + idx * 34}" fill="#9CA3AF" font-family="sans-serif" font-size="23">${escapeXml(line)}</text>`
    )
    .join('\n');

  let tagX = 80;
  const tagsSvg = displayTags
    .map((tag) => {
      const label = `#${tag}`;
      const width = label.length * 13 + 28;
      const el = `
        <g transform="translate(${tagX}, 470)">
          <rect width="${width}" height="36" rx="6" fill="#0B0F17" stroke="#1F2937" stroke-width="1.5"/>
          <text x="14" y="23" fill="#10B981" font-family="monospace" font-size="17">${escapeXml(label)}</text>
        </g>
      `;
      tagX += width + 12;
      return el;
    })
    .join('\n');

  const badgeWidth = Math.max(220, badge.length * 11 + 36);

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0B0F17"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
      <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>
    </defs>

    <!-- Background Canvas -->
    <rect width="1200" height="630" fill="url(#bgGrad)"/>

    <!-- Top Emerald Accent Bar -->
    <rect width="1200" height="8" fill="url(#accentGrad)"/>

    <!-- Inner Surface Card -->
    <rect x="44" y="44" width="1112" height="542" rx="18" fill="#111827" stroke="#1F2937" stroke-width="2"/>

    <!-- Top Badge -->
    <g transform="translate(80, 96)">
      <rect width="${badgeWidth}" height="38" rx="19" fill="#064E3B" fill-opacity="0.45" stroke="#10B981" stroke-opacity="0.5" stroke-width="1.5"/>
      <text x="18" y="25" fill="#34D399" font-family="monospace" font-size="16" font-weight="bold">${escapeXml(badge)}</text>
    </g>

    <!-- Main Title -->
    ${titleSvg}

    <!-- Subtitle / Description -->
    ${subtitleSvg}

    <!-- Tags -->
    ${tagsSvg}

    <!-- Footer Divider -->
    <line x1="80" y1="530" x2="1120" y2="530" stroke="#1F2937" stroke-width="1.5"/>

    <!-- Author & Domain Footer -->
    <g transform="translate(80, 545)">
      <rect width="32" height="32" rx="6" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
      <text x="6" y="22" fill="#10B981" font-family="monospace" font-size="15" font-weight="bold">HH</text>
      <text x="44" y="22" fill="#E5E7EB" font-family="monospace" font-size="18" font-weight="bold">Hristiyan Hristov</text>
      <text x="255" y="22" fill="#6B7280" font-family="monospace" font-size="17">• Sofia, Bulgaria</text>
    </g>

    <text x="1120" y="567" text-anchor="end" fill="#10B981" font-family="monospace" font-size="18" font-weight="bold">${escapeXml(dateStr)}</text>
  </svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(pngBuffer).buffer;
}
