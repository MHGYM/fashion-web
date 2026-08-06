/* ═══════════════════════════════════════════════════════════════════════════
   DECAL-TEKENAARS — hoe ziet een onderdeel eruit als het geprojecteerd wordt?
   ═══════════════════════════════════════════════════════════════════════════
   Alleen nodig voor zones die in het huidige model geen echte geometrie hebben.
   Dit is PRODUCTkennis (hoe ziet piping eruit), geen modelkennis — daarom staat
   het los van het model-profiel en hoeft het niet mee te veranderen bij een
   nieuw 3D-bestand.

   Een tekenaar krijgt: (ctx, hex, extra) en vult een 256×256 canvas.
   `extra` bevat optioneel { text } voor tekstzones.
   Ontbreekt er een tekenaar voor een zone, dan valt de renderer terug op
   `fallback` (een effen vlak) — de zone werkt dan nog steeds, alleen zonder
   eigen vormtaal.
   ═══════════════════════════════════════════════════════════════════════════ */

const band = (ctx, hex, heightFrac = 0.40) => {
  const { width: w, height: h } = ctx.canvas;
  ctx.fillStyle = hex;
  ctx.fillRect(0, h * (0.5 - heightFrac / 2), w, h * heightFrac);
};

export const PAINTERS = {
  piping: (ctx, hex) => band(ctx, hex, 0.40),
  trim:   (ctx, hex) => band(ctx, hex, 0.40),

  strap: (ctx, hex) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = hex;
    ctx.fillRect(0, h * 0.22, w, h * 0.56);
    // klittenband-suggestie: fijne verticale streepjes
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let x = 10; x < w; x += 12) {
      ctx.beginPath(); ctx.moveTo(x, h * 0.24); ctx.lineTo(x, h * 0.76); ctx.stroke();
    }
  },

  stitching: (ctx, hex) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.strokeStyle = hex;
    ctx.lineWidth = 10;
    ctx.setLineDash([22, 18]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  },

  laces: (ctx, hex) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.strokeStyle = hex;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const rows = 4, top = h * 0.12, bottom = h * 0.88, cx = w / 2, spread = w * 0.28;
    for (let i = 0; i < rows; i++) {
      const y1 = top + (i / rows) * (bottom - top);
      const y2 = top + ((i + 1) / rows) * (bottom - top);
      ctx.beginPath(); ctx.moveTo(cx - spread, y1); ctx.lineTo(cx + spread, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + spread, y1); ctx.lineTo(cx - spread, y2); ctx.stroke();
    }
    ctx.fillStyle = '#0A0B0D';
    for (let i = 0; i <= rows; i++) {
      const y = top + (i / rows) * (bottom - top);
      ctx.beginPath(); ctx.arc(cx - spread, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spread, y, 6, 0, Math.PI * 2); ctx.fill();
    }
  },

  logo: (ctx, hex) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = hex;
    ctx.save();
    ctx.translate(w / 2, h / 2 - 14);
    ctx.scale(2.1, 2.1);
    ctx.beginPath();
    ctx.rect(-27, -18, 20.5, 6.5);
    ctx.rect(-27, -18, 6.5, 31);
    ctx.rect(-17, -3, 15, 6.5);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(1, -18, 7.5, 31);
    ctx.moveTo(1, -18); ctx.lineTo(8.5, -18); ctx.lineTo(15.5, -5); ctx.lineTo(22.5, -18); ctx.lineTo(30, -18);
    ctx.lineTo(30, 13); ctx.lineTo(23, 13); ctx.lineTo(23, -3); ctx.lineTo(18.5, 5.5); ctx.lineTo(12.5, 5.5);
    ctx.lineTo(8, -3); ctx.lineTo(8, 13); ctx.lineTo(1, 13); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = hex;
    ctx.font = '700 15px "Helvetica Neue", Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIGHTMARKETING', w / 2, h / 2 + 46);
  },

  name: (ctx, hex, extra) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = hex;
    ctx.font = '800 46px "Helvetica Neue", Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = (extra && extra.text) ? extra.text.toUpperCase() : 'YOUR NAME';
    ctx.fillText(text, w / 2, h / 2, w * 0.92);
  },
};

/** Effen vlak — gebruikt voor zones zonder eigen tekenaar (bv. duimpanelen). */
export function fallbackPainter(ctx, hex) {
  const { width: w, height: h } = ctx.canvas;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, h);
}

export function painterFor(zoneId) {
  return PAINTERS[zoneId] || fallbackPainter;
}
