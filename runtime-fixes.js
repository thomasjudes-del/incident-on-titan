(() => {
  const originalTypeTransmission = window.typeTransmission;

  if (typeof originalTypeTransmission === 'function') {
    window.typeTransmission = function slowerTransmission(element, text, options = {}) {
      const adjusted = {
        ...options,
        speed: Math.round((options.speed ?? 38) * 1.38),
        linePause: Math.round((options.linePause ?? 520) * 1.28),
        finalPause: Math.round((options.finalPause ?? 480) * 1.22)
      };
      return originalTypeTransmission(element, text, adjusted);
    };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawLetterSpaced(ctx, text, x, y, spacing) {
    let cursor = x;
    for (const character of text) {
      ctx.fillText(character, cursor, y);
      cursor += ctx.measureText(character).width + spacing;
    }
  }

  function drawMetric(ctx, label, value, y, accent) {
    const x = 110;
    const trackX = 330;
    const trackW = 610;
    const trackH = 18;

    ctx.fillStyle = '#a9a198';
    ctx.font = '700 25px "Space Mono", monospace';
    ctx.fillText(label, x, y + 7);

    ctx.fillStyle = '#252b34';
    roundRect(ctx, trackX, y - 10, trackW, trackH, 9);
    ctx.fill();

    const gradient = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
    gradient.addColorStop(0, accent[0]);
    gradient.addColorStop(1, accent[1]);
    ctx.fillStyle = gradient;
    roundRect(ctx, trackX, y - 10, Math.max(18, trackW * Math.max(0, Math.min(100, value)) / 100), trackH, 9);
    ctx.fill();

    ctx.fillStyle = '#f4eadf';
    ctx.font = '700 28px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(value), 970, y + 8);
    ctx.textAlign = 'left';
  }

  function drawTrajectory(ctx, path, y) {
    const startX = 110;
    const size = 58;
    const gap = 25;

    ctx.fillStyle = '#a9a198';
    ctx.font = '700 21px "Space Mono", monospace';
    ctx.fillText('DECISION PATH', startX, y - 34);

    path.forEach((choice, index) => {
      const x = startX + index * (size + gap);
      ctx.strokeStyle = 'rgba(255, 201, 121, .7)';
      ctx.lineWidth = 3;
      roundRect(ctx, x, y, size, size, 8);
      ctx.stroke();

      if (choice === 1) {
        ctx.fillStyle = 'rgba(237, 141, 50, .72)';
        roundRect(ctx, x + 9, y + 9, size - 18, size - 18, 5);
        ctx.fill();
      } else if (choice === 2) {
        ctx.strokeStyle = '#ffc979';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + size - 12);
        ctx.lineTo(x + size - 12, y + 12);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffc979';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  async function buildShareCard(result) {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, '#130b08');
    background.addColorStop(.42, '#080a0d');
    background.addColorStop(1, '#050608');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(875, 120, 30, 875, 120, 390);
    glow.addColorStop(0, 'rgba(237, 141, 50, .35)');
    glow.addColorStop(1, 'rgba(237, 141, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(480, 0, 600, 520);

    ctx.save();
    ctx.translate(900, 125);
    ctx.rotate(-.23);
    ctx.strokeStyle = 'rgba(255, 201, 121, .55)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 175, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a8501d';
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, .08)';
    ctx.lineWidth = 2;
    roundRect(ctx, 55, 55, 970, 1240, 36);
    ctx.stroke();

    ctx.fillStyle = '#ffc979';
    ctx.font = '700 24px "Space Mono", monospace';
    drawLetterSpaced(ctx, 'INCIDENT ON TITAN', 110, 130, 6);

    ctx.fillStyle = '#a9a198';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(`INCIDENT ${mission.number}  /  ${mission.role.toUpperCase()}`, 110, 205);

    ctx.fillStyle = '#f5ede2';
    ctx.font = '600 52px Rajdhani, sans-serif';
    ctx.fillText(mission.title.toUpperCase(), 110, 282);

    ctx.strokeStyle = 'rgba(237, 141, 50, .35)';
    ctx.beginPath();
    ctx.moveTo(110, 326);
    ctx.lineTo(970, 326);
    ctx.stroke();

    ctx.fillStyle = '#c29d73';
    ctx.font = '700 23px "Space Mono", monospace';
    drawLetterSpaced(ctx, 'SCORE ATTRIBUTED BY SYBILLE', 110, 405, 2.5);

    ctx.fillStyle = '#ed8d32';
    ctx.font = '600 246px Rajdhani, sans-serif';
    ctx.fillText(String(result.score), 100, 645);

    ctx.fillStyle = '#9c8062';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText('OUT OF 1000', 116, 694);

    ctx.fillStyle = 'rgba(255, 255, 255, .035)';
    roundRect(ctx, 85, 742, 910, 270, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(237, 141, 50, .18)';
    ctx.stroke();

    drawMetric(ctx, 'HEALTH', result.state.health, 818, ['#b95a30', '#f0a073']);
    drawMetric(ctx, 'ENERGY', result.state.energy, 886, ['#c97a24', '#ffc979']);
    drawMetric(ctx, 'SCIENCE', result.state.science, 954, ['#4d8fcf', '#91d0ff']);

    drawTrajectory(ctx, result.path || [], 1095);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#d0b08c';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(result.simulation, 970, 1125);
    ctx.textAlign = 'left';

    ctx.strokeStyle = 'rgba(255, 255, 255, .08)';
    ctx.beginPath();
    ctx.moveTo(110, 1198);
    ctx.lineTo(970, 1198);
    ctx.stroke();

    ctx.fillStyle = '#ffc979';
    ctx.font = '700 20px "Space Mono", monospace';
    ctx.fillText('PLAY THE SAME INCIDENT', 110, 1252);

    ctx.fillStyle = '#91877d';
    ctx.font = '400 19px "Space Mono", monospace';
    ctx.fillText(`${location.host}${location.pathname}`, 110, 1288);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Could not generate result image.'));
      }, 'image/png', 1);
    });
  }

  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }

  async function fallbackShare(blob, filename, text, gameUrl) {
    downloadBlob(blob, filename);
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(`${text}\n${gameUrl}`);
        alert('Result image downloaded. Game link copied.');
        return;
      } catch (_) {}
    }
    alert('Result image downloaded.');
  }

  window.shareResult = async function shareResultAsImage() {
    const result = window.result || (typeof window.loadStoredResult === 'function' ? window.loadStoredResult() : null);
    if (!result) return;

    const button = [...document.querySelectorAll('button')]
      .find(candidate => candidate.textContent.trim().toLowerCase() === 'share result');
    const originalLabel = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing image…';
    }

    try {
      const blob = await buildShareCard(result);
      const cleanSimulation = String(result.simulation || 'result').replace(/[^a-z0-9-]/gi, '');
      const filename = `incident-on-titan-${cleanSimulation}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const gameUrl = new URL(location.href);
      gameUrl.search = '';
      gameUrl.hash = '';
      const text = `INCIDENT ${mission.number} · ${mission.role.toUpperCase()}\nSCORE ATTRIBUTED BY SYBILLE: ${result.score}\n${result.simulation}`;

      let shared = false;
      if (navigator.share && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Incident on Titan',
              text,
              url: gameUrl.toString(),
              files: [file]
            });
            shared = true;
          }
        } catch (error) {
          if (error?.name === 'AbortError') return;
          console.warn('Native image sharing failed.', error);
        }
      }

      if (!shared) {
        await fallbackShare(blob, filename, text, gameUrl.toString());
      }
    } catch (error) {
      console.error('Could not share result image.', error);
      alert('The result image could not be generated.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel || 'Share result';
      }
    }
  };
})();
