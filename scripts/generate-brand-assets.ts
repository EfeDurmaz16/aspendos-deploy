#!/usr/bin/env bun
/**
 * Brand asset generator — regenerates YULA's production brand assets from the
 * locked SVG sources in /brand. Emits into apps/web/public/.
 *
 *  Inputs:   brand/yula-mark.svg, brand/yula-favicon.svg
 *  Outputs:
 *    - logo.png, logo.svg, favicon.svg, favicon.ico, apple-touch-icon.png
 *    - icons/icon-{72,96,128,144,152,192,384,512}.png
 *    - og/home.png (1200x630 OG card)
 *    - screenshots/chat-desktop.png, chat-mobile.png (placeholders)
 *
 * Run:  bun run brand:generate
 */

import { existsSync, mkdirSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const REPO_ROOT = path.resolve(import.meta.dir, '..');
const BRAND_DIR = path.join(REPO_ROOT, 'brand');
const PUBLIC_DIR = path.join(REPO_ROOT, 'apps/web/public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const OG_DIR = path.join(PUBLIC_DIR, 'og');
const SHOTS_DIR = path.join(PUBLIC_DIR, 'screenshots');

const ACCENT = '#FF8A3D';
const BG = '#0a0a0a';
const FG = '#f5f5f5';
const MUTED = '#8a8a8a';

const MARK_SVG = path.join(BRAND_DIR, 'yula-mark.svg');
const FAVICON_SVG = path.join(BRAND_DIR, 'yula-favicon.svg');

function ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * A self-contained "color" variant of the mark with currentColor resolved to
 * near-white (#f5f5f5) so sharp can rasterize it predictably on a dark bg.
 * (sharp respects stroke="currentColor" as black otherwise.)
 */
async function getResolvedMarkSvg(): Promise<Buffer> {
    const raw = await readFile(MARK_SVG, 'utf8');
    const resolved = raw.replaceAll('currentColor', FG);
    return Buffer.from(resolved, 'utf8');
}

async function getFaviconSvg(): Promise<Buffer> {
    return readFile(FAVICON_SVG);
}

/** Render a centered mark on a dark square with ~10% margin → PNG buffer. */
async function renderIcon(size: number): Promise<Buffer> {
    const margin = Math.round(size * 0.12);
    const inner = size - margin * 2;
    const mark = await sharp(await getResolvedMarkSvg(), { density: 512 })
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    return sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: BG,
        },
    })
        .composite([{ input: mark, gravity: 'center' }])
        .png()
        .toBuffer();
}

async function writeFileSafe(target: string, data: Buffer | string) {
    ensureDir(path.dirname(target));
    await writeFile(target, data);
    console.log(`  wrote ${path.relative(REPO_ROOT, target)}`);
}

async function generateIcons() {
    console.log('\n[1/6] PWA icons');
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of sizes) {
        const buf = await renderIcon(size);
        await writeFileSafe(path.join(ICONS_DIR, `icon-${size}.png`), buf);
        // Also generate the legacy WxH filenames referenced by manifest
        await writeFileSafe(path.join(ICONS_DIR, `icon-${size}x${size}.png`), buf);
    }
}

async function generateLogoAndApple() {
    console.log('\n[2/6] logo.png, logo.svg, apple-touch-icon.png');
    const logo = await renderIcon(512);
    await writeFileSafe(path.join(PUBLIC_DIR, 'logo.png'), logo);
    await copyFile(MARK_SVG, path.join(PUBLIC_DIR, 'logo.svg'));
    console.log(`  wrote apps/web/public/logo.svg`);

    const apple = await renderIcon(180);
    await writeFileSafe(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), apple);
}

async function generateFavicons() {
    console.log('\n[3/6] favicon.svg, favicon.ico');
    await copyFile(FAVICON_SVG, path.join(PUBLIC_DIR, 'favicon.svg'));
    console.log(`  wrote apps/web/public/favicon.svg`);

    const favSvg = await getFaviconSvg();
    const pngs = await Promise.all(
        [16, 32, 48].map(async (s) =>
            sharp(favSvg, { density: 512 }).resize(s, s, { fit: 'contain' }).png().toBuffer()
        )
    );
    const ico = await pngToIco(pngs);
    await writeFileSafe(path.join(PUBLIC_DIR, 'favicon.ico'), ico);
}

/** Build the OG card SVG — rendered through sharp so we don't need a browser. */
function buildOgSvg(): string {
    const W = 1200;
    const H = 630;
    const markSize = 220;
    const markX = (W - markSize) / 2;
    const markY = 130;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g transform="translate(${markX}, ${markY})">
    <svg width="${markSize}" height="${Math.round((markSize * 48) / 64)}" viewBox="0 0 64 48" fill="none">
      <path d="M 4 40 A 28 28 0 0 1 60 40" stroke="${FG}" stroke-width="4" stroke-linecap="round"/>
      <path d="M 12 40 A 20 20 0 0 1 52 40" stroke="${FG}" stroke-width="3" stroke-linecap="round" opacity="0.72"/>
      <path d="M 20 40 A 12 12 0 0 1 44 40 Z" fill="${ACCENT}"/>
    </svg>
  </g>
  <text x="${W / 2}" y="430" text-anchor="middle" font-family="Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="800" font-size="108" letter-spacing="-4" fill="${FG}">YULA</text>
  <text x="${W / 2}" y="510" text-anchor="middle" font-family="Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="500" font-size="30" fill="${MUTED}">Deterministic AI agents that prove what they did.</text>
</svg>`;
}

async function generateOgCard() {
    console.log('\n[4/6] og/home.png');
    const svg = buildOgSvg();
    const buf = await sharp(Buffer.from(svg, 'utf8'), { density: 200 }).png().toBuffer();
    await writeFileSafe(path.join(OG_DIR, 'home.png'), buf);
}

function buildScreenshotSvg(w: number, h: number, label: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Manrope, -apple-system, sans-serif" font-weight="700" font-size="${Math.round(Math.min(w, h) / 14)}" fill="${FG}">${label}</text>
</svg>`;
}

async function generateScreenshots() {
    console.log('\n[5/6] screenshots/chat-{desktop,mobile}.png');
    const desktop = await sharp(Buffer.from(buildScreenshotSvg(1280, 720, 'YULA · Chat'), 'utf8'))
        .png()
        .toBuffer();
    await writeFileSafe(path.join(SHOTS_DIR, 'chat-desktop.png'), desktop);

    const mobile = await sharp(Buffer.from(buildScreenshotSvg(640, 1280, 'YULA · Chat'), 'utf8'))
        .png()
        .toBuffer();
    await writeFileSafe(path.join(SHOTS_DIR, 'chat-mobile.png'), mobile);
}

async function main() {
    console.log(`YULA brand asset pipeline`);
    console.log(`  source: ${path.relative(REPO_ROOT, BRAND_DIR)}/`);
    console.log(`  target: ${path.relative(REPO_ROOT, PUBLIC_DIR)}/`);
    ensureDir(ICONS_DIR);
    ensureDir(OG_DIR);
    ensureDir(SHOTS_DIR);

    await generateIcons();
    await generateLogoAndApple();
    await generateFavicons();
    await generateOgCard();
    await generateScreenshots();

    console.log('\n[6/6] done');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
