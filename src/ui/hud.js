// Canvas HUD drawn in screen space each frame: location label, controls hint, radio now-playing.
import { rrect } from '../core/utils.js';

export function drawHud(ctx, world, player) {
  const inside = world.house.contains(player.x, player.y);
  const label = inside ? 'Home' : player.swimming ? 'Pond' : world.regionAt(player.x, player.y);
  ctx.font = '600 15px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 24;
  ctx.fillStyle = 'rgba(15, 20, 25, 0.6)';
  rrect(ctx, 12, 12, w, 30, 8);
  ctx.fillStyle = '#f3ead8';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 24, 27);

  drawRadioHud(ctx, world, inside);

  // Controls hint, tucked under the location label so it never collides with the bag bar
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const hint = 'WASD / Arrows: move  ·  Shift: run  ·  E: bike  ·  1-5: select  ·  Space: use  ·  Click: interact';
  ctx.fillText(hint, 15, 57);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(hint, 14, 56);
}

function drawRadioHud(ctx, world, inside) {
  const radio = world.house.radio;
  let lines = null;
  if (inside && radio.state === 'tuning') lines = ['♪ Tuning in…'];
  else if (inside && radio.state === 'playing') {
    const show = radio.show;
    lines = [
      `♪ ${show.title}`,
      `${radio.currentTrack.title}  (${radio.trackIndex + 1}/${show.tracks.length})`,
    ];
  } else if (inside && radio.error && performance.now() - radio.errorAt < 4000) {
    lines = ['♪ No signal. Try again.'];
  }
  if (!lines) return;

  ctx.font = '600 14px system-ui, sans-serif';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28;
  const h = 14 + lines.length * 20;
  const x = window.innerWidth - w - 12;
  ctx.fillStyle = 'rgba(15, 20, 25, 0.65)';
  rrect(ctx, x, 12, w, h, 8);
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.font = i === 0 ? '600 14px system-ui, sans-serif' : '13px system-ui, sans-serif';
    ctx.fillStyle = i === 0 ? '#ffd98a' : '#f3ead8';
    ctx.fillText(l, x + 14, 12 + 17 + i * 20);
  });
}
