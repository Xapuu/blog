import type { APIRoute } from 'astro';
import { renderOgCardPng } from '@components/ogCardSvg';

export const GET: APIRoute = async () => {
  const png = await renderOgCardPng({
    title: 'Hristiyan Hristov — JS Team Lead & Security-Minded Architect',
    subtitle:
      'Resilient frontend architecture, browser security headers, supply-chain defense, and the 24-Day 2026 DevSec Advent Calendar.',
    badge: 'HRISTOV.DEV • PORTFOLIO & TECHNICAL BLOG',
    tags: ['security', 'javascript', 'architecture', 'advent-2026'],
    dateStr: 'hristov.dev',
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
