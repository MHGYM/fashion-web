import type { ZoneState, Transform } from './types';

function shadeColor(hex: string, amt: number): string {
  const c = (hex || '#FFFFFF').replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const num = parseInt(full, 16) || 0xffffff;
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? -v : 255 - v) * Math.abs(amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Tekent een laag (logo-afbeelding) op zijn eigen positie/schaal/rotatie —
 *  in tegenstelling tot een 'cover'-vulling wordt de afbeelding op ware
 *  grootte (t.o.v. canvasbreedte) geplaatst, zodat meerdere logo's naast
 *  elkaar kunnen staan zonder elkaar te verdringen. */
function drawLogoLayer(ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement, t: Transform) {
  const base = (W * 0.32) / Math.max(img.width, img.height);
  const s = base * (t.scale ?? 1);
  const w = img.width * s, h = img.height * s;
  ctx.save();
  ctx.translate(W / 2 + (t.x ?? 0) * W, H / 2 + (t.y ?? 0) * H);
  ctx.rotate(((t.rotation ?? 0) * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layer: { text: string; color: string; fontFamily: string; fontWeight: number; transform: Transform },
) {
  const { text, color, fontFamily, fontWeight, transform: t } = layer;
  if (!text) return;
  const fontSize = Math.round(W * 0.09 * (t.scale ?? 1));
  ctx.save();
  ctx.translate(W / 2 + (t.x ?? 0) * W, H / 2 + (t.y ?? 0) * H);
  ctx.rotate(((t.rotation ?? 0) * Math.PI) / 180);
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const label = text.toUpperCase();
  // Zelfde borduureffect als de handschoen-badges: schaduw + omtreklijn in
  // een donkerdere tint geeft de tekst reliëf i.p.v. een platte print-look.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(label, fontSize * 0.035, fontSize * 0.05);

  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, fontSize * 0.05);
  ctx.strokeStyle = shadeColor(color, -0.45);
  ctx.strokeText(label, 0, 0);

  ctx.fillStyle = color;
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

/** Vult een zone-canvas met de basiskleur en tekent daarna elke logo- en
 *  tekstlaag erbovenop, in toevoegvolgorde. De originele GLB-textuur wordt
 *  hier nooit gebruikt — dit canvas IS de volledige, definitieve textuur. */
export function paintZone(ctx: CanvasRenderingContext2D, W: number, H: number, state: ZoneState) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = state.colorHex || '#101114';
  ctx.fillRect(0, 0, W, H);
  state.logos.forEach((logo) => drawLogoLayer(ctx, W, H, logo.img, logo.transform));
  state.texts.forEach((t) => drawTextLayer(ctx, W, H, t));
}
