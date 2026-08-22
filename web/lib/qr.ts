import { qrcode } from './qrcode-vendor.js';

export function renderQrToCanvas(canvas: HTMLCanvasElement, text: string, size = 300) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = Math.floor(size / (n + quiet * 2));
  const total = cell * (n + quiet * 2);
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, total, total);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    }
  }
}
