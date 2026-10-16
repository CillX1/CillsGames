// 🏓 Pong – erster mit 5 Punkten gewinnt. Score = eigene Punkte × 100 (+500 für den Sieg).
export function start(host) {
  const W = 800, H = 500, PH = 100, PW = 14, R = 9, WIN = 5;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowUp', label: '▲', wide: true }, { code: 'ArrowDown', label: '▼', wide: true }]);

  const player = { y: H / 2 - PH / 2, score: 0 };
  const ai = { y: H / 2 - PH / 2, score: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  let serveTimer = 60, pointerY = null, aiError = 0;

  host.onPointer('pointermove', (p) => { pointerY = p.y; });
  host.onPointer('pointerdown', (p) => { pointerY = p.y; });

  function serve(dirSign) {
    ball.x = W / 2; ball.y = H / 2;
    const angle = (Math.random() - 0.5) * 0.8;
    const speed = 6;
    ball.vx = Math.cos(angle) * speed * dirSign;
    ball.vy = Math.sin(angle) * speed;
    aiError = (Math.random() - 0.5) * 60;
  }

  function score() { return player.score * 100 + (player.score >= WIN ? 500 : 0); }

  host.loop(() => {
    if (host.up) { player.y -= 8; pointerY = null; }
    if (host.down) { player.y += 8; pointerY = null; }
    if (pointerY != null) player.y += Math.max(-10, Math.min(10, pointerY - (player.y + PH / 2)));
    player.y = Math.max(0, Math.min(H - PH, player.y));

    if (serveTimer > 0) {
      if (--serveTimer === 0) serve(Math.random() < 0.5 ? -1 : 1);
      return;
    }
    // KI: sagt den Aufprall voraus, mit Fehler, der mit dem Spielstand kleiner wird
    const level = player.score + ai.score;
    const aiSpeed = Math.min(8.5, 4.5 + level * 0.45);
    let targetY = H / 2;
    if (ball.vx > 0) {
      let sx = ball.x, sy = ball.y, svy = ball.vy, n = 0;
      while (sx < W - 30 && n++ < 300) { sx += ball.vx; sy += svy; if (sy < R || sy > H - R) svy = -svy; }
      targetY = sy + aiError * Math.max(0.3, 1 - level * 0.08);
    }
    const c = ai.y + PH / 2;
    if (Math.abs(targetY - c) > 6) ai.y += Math.sign(targetY - c) * Math.min(aiSpeed, Math.abs(targetY - c));
    ai.y = Math.max(0, Math.min(H - PH, ai.y));

    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); }

    const hitPaddle = (px, py, dir) => {
      if (ball.y + R < py || ball.y - R > py + PH) return false;
      const rel = (ball.y - (py + PH / 2)) / (PH / 2); // -1 .. 1
      const speed = Math.min(15, Math.hypot(ball.vx, ball.vy) * 1.05);
      const angle = rel * 1.0;
      ball.vx = Math.cos(angle) * speed * dir;
      ball.vy = Math.sin(angle) * speed;
      ball.x = px + (dir > 0 ? PW + R : -R);
      aiError = (Math.random() - 0.5) * 70;
      host.sound('click');
      return true;
    };
    if (ball.vx < 0 && ball.x - R <= 20 + PW && ball.x - R > 4) hitPaddle(20, player.y, 1);
    if (ball.vx > 0 && ball.x + R >= W - 20 - PW && ball.x + R < W - 4) hitPaddle(W - 20 - PW, ai.y, -1);

    if (ball.x < -R) { ai.score++; host.sound('lose'); next(1); }
    else if (ball.x > W + R) { player.score++; host.sound('point'); host.setScore(score()); next(-1); }
  }, draw);

  function next(dir) {
    if (player.score >= WIN || ai.score >= WIN) { host.end(score()); return; }
    serveTimer = 50;
    ball.x = W / 2; ball.y = H / 2; ball.vx = 0; ball.vy = 0;
    void dir;
  }

  function draw() {
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.setLineDash([18, 14]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = 'bold 80px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(player.score, W / 4, 100); ctx.fillText(ai.score, (W * 3) / 4, 100);
    ctx.font = '14px system-ui'; ctx.fillText('DU', W / 4, 125); ctx.fillText('KI', (W * 3) / 4, 125);
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00d4ff'; ctx.fillStyle = '#00d4ff'; ctx.fillRect(20, player.y, PW, PH);
    ctx.shadowColor = '#ff006e'; ctx.fillStyle = '#ff006e'; ctx.fillRect(W - 20 - PW, ai.y, PW, PH);
    ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (serveTimer > 0 && !host.over) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 20px system-ui';
      ctx.fillText(player.score + ai.score === 0 ? 'Erster bis 5 gewinnt!' : 'Bereit…', W / 2, H / 2 + 60);
    }
  }
}
