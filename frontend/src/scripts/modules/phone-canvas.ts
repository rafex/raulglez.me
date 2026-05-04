function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function initPhoneCanvas(): void {
  const wrap = document.querySelector('.phone-canvas');
  if (!wrap) return;

  const canvas = wrap.querySelector('.phone-canvas__el') as HTMLCanvasElement | null;
  const source = wrap.querySelector('.phone-canvas__source') as HTMLImageElement | null;
  if (!canvas || !source) return;

  const draw = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(1, Math.round(wrap.getBoundingClientRect().width));
    const cssHeight = Math.max(1, Math.round(wrap.getBoundingClientRect().height));
    const baseW = 220;
    const baseH = 380;
    const sx = cssWidth / baseW;
    const sy = cssHeight / baseH;

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);
    ctx.clearRect(0, 0, baseW, baseH);

    const stroke = 'rgba(255,255,255,0.35)';
    const body = { x: 8, y: 8, w: 204, h: 364, r: 14 };
    const screen = { x: 10, y: 40, w: 200, h: 280, r: 1 };
    const centerX = body.x + body.w / 2;
    const buttonY = 340;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    drawRoundRect(ctx, body.x, body.y, body.w, body.h, body.r);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.moveTo(centerX - 12, 26);
    ctx.lineTo(centerX + 12, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.stroke();

    ctx.save();
    drawRoundRect(ctx, screen.x, screen.y, screen.w, screen.h, screen.r);
    ctx.clip();
    const sourceRatio = source.naturalWidth / source.naturalHeight;
    const targetRatio = screen.w / screen.h;
    let sw = source.naturalWidth;
    let sh = source.naturalHeight;
    let sxImg = 0;
    let syImg = 0;

    if (sourceRatio > targetRatio) {
      sw = sh * targetRatio;
      sxImg = (source.naturalWidth - sw) / 2;
    } else {
      sh = sw / targetRatio;
      syImg = (source.naturalHeight - sh) * 0.25;
    }

    ctx.drawImage(source, sxImg, syImg, sw, sh, screen.x, screen.y, screen.w, screen.h);
    ctx.restore();

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.arc(centerX, buttonY, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const icon = '☎';
    const metrics = ctx.measureText(icon);
    const iconY = buttonY + ((metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    ctx.fillText(icon, centerX, iconY);
  };

  if (source.complete) draw();
  else source.addEventListener('load', draw, { once: true });

  window.addEventListener('resize', draw);
}
