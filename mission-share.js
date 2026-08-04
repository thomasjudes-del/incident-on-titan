(() => {
  'use strict';

  const tr = (key, fallback) => window.IOTI_I18N?.t(key) || fallback;
  const BRAND_LABEL = 'confluenceofminds.com/titan/';
  const context = window.IOTI_MISSION_CONTEXT;

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawSpaced(ctx, value, x, y, spacing) {
    let cursor = x;
    for (const character of value) {
      ctx.fillText(character, cursor, y);
      cursor += ctx.measureText(character).width + spacing;
    }
  }

  function drawMetric(ctx, label, value, y, gradientColors) {
    ctx.fillStyle = '#aaa198';
    ctx.font = '700 25px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), 110, y + 7);

    ctx.fillStyle = '#252b34';
    roundedRect(ctx, 330, y - 10, 610, 18, 9);
    ctx.fill();

    const gradient = ctx.createLinearGradient(330, 0, 940, 0);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(1, gradientColors[1]);
    ctx.fillStyle = gradient;
    roundedRect(ctx, 330, y - 10, Math.max(18, 610 * Math.max(0, Math.min(100, value)) / 100), 18, 9);
    ctx.fill();

    ctx.fillStyle = '#f5ede2';
    ctx.font = '700 28px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(value), 970, y + 8);
    ctx.textAlign = 'left';
  }

  function drawPath(ctx, path, y) {
    ctx.fillStyle = '#aaa198';
    ctx.font = '700 21px "Space Mono", monospace';
    ctx.fillText(tr('decisionPath', 'Decision path').toUpperCase(), 110, y - 34);
    const size = 58;
    const gap = 25;

    path.forEach((choice, index) => {
      const x = 110 + index * (size + gap);
      ctx.strokeStyle = 'rgba(255,201,121,.7)';
      ctx.lineWidth = 3;
      roundedRect(ctx, x, y, size, size, 8);
      ctx.stroke();

      if (choice === 1) {
        ctx.fillStyle = 'rgba(237,141,50,.72)';
        roundedRect(ctx, x + 9, y + 9, size - 18, size - 18, 5);
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

  function missionShareUrl() {
    const url = new URL('https://confluenceofminds.com/titan/');
    url.searchParams.set('incident', context?.selectedMissionId || mission.number);
    const language = window.IOTI_I18N?.language;
    if (language === 'fr') url.searchParams.set('lang', 'fr');
    return url;
  }

  async function createResultPng(result) {
    try { await document.fonts?.ready; } catch (_) {}

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    const background = ctx.createLinearGradient(0, 0, 0, 1350);
    background.addColorStop(0, '#150b08');
    background.addColorStop(.42, '#080a0d');
    background.addColorStop(1, '#050608');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1350);

    const glow = ctx.createRadialGradient(875, 120, 30, 875, 120, 390);
    glow.addColorStop(0, 'rgba(237,141,50,.35)');
    glow.addColorStop(1, 'rgba(237,141,50,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(480, 0, 600, 520);

    ctx.save();
    ctx.translate(900, 125);
    ctx.rotate(-.23);
    ctx.strokeStyle = 'rgba(255,201,121,.55)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 175, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a8501d';
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 55, 55, 970, 1240, 36);
    ctx.stroke();

    ctx.fillStyle = '#ffc979';
    ctx.font = '700 24px "Space Mono", monospace';
    drawSpaced(ctx, 'INCIDENT ON TITAN', 110, 130, 6);

    ctx.fillStyle = '#aaa198';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(`INCIDENT ${mission.number}  /  ${mission.role.toUpperCase()}`, 110, 205);

    ctx.fillStyle = '#f5ede2';
    ctx.font = '600 52px Rajdhani, sans-serif';
    ctx.fillText(mission.title.toUpperCase(), 110, 282);

    ctx.strokeStyle = 'rgba(237,141,50,.35)';
    ctx.beginPath();
    ctx.moveTo(110, 326);
    ctx.lineTo(970, 326);
    ctx.stroke();

    ctx.fillStyle = '#c29d73';
    ctx.font = '700 22px "Space Mono", monospace';
    drawSpaced(ctx, tr('scoreAttributedCaps', 'SCORE ATTRIBUTED BY SYBILLE AI'), 110, 405, 1.7);

    ctx.fillStyle = '#ed8d32';
    ctx.font = '600 246px Rajdhani, sans-serif';
    ctx.fillText(String(result.score), 100, 645);

    ctx.fillStyle = '#9c8062';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(tr('outOf1000', 'out of 1000').toUpperCase(), 116, 694);

    ctx.fillStyle = 'rgba(255,255,255,.035)';
    roundedRect(ctx, 85, 742, 910, 270, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(237,141,50,.18)';
    ctx.stroke();

    drawMetric(ctx, tr('health', 'Health'), result.state.health, 818, ['#b95a30', '#f0a073']);
    drawMetric(ctx, tr('energy', 'Energy'), result.state.energy, 886, ['#c97a24', '#ffc979']);
    drawMetric(ctx, tr('science', 'Science'), result.state.science, 954, ['#4d8fcf', '#91d0ff']);
    drawPath(ctx, result.path || [], 1095);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#d0b08c';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(result.simulation, 970, 1125);
    ctx.textAlign = 'left';

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.moveTo(110, 1198);
    ctx.lineTo(970, 1198);
    ctx.stroke();

    ctx.fillStyle = '#ffc979';
    ctx.font = '700 20px "Space Mono", monospace';
    ctx.fillText(tr('playSameIncident', 'Play the same incident').toUpperCase(), 110, 1252);
    ctx.fillStyle = '#91877d';
    ctx.font = '400 19px "Space Mono", monospace';
    ctx.fillText(BRAND_LABEL, 110, 1288);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG generation failed')), 'image/png', 1);
    });
  }

  function download(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }

  window.shareResult = async function missionSpecificShare() {
    const result = window.result || window.loadStoredResult?.();
    if (!result) return;

    const button = document.querySelector('[data-action="share-result"]')
      || [...document.querySelectorAll('button')].find(item => /share|partager/i.test(item.textContent));
    const originalLabel = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = tr('preparingImage', 'Preparing image…');
    }

    try {
      const blob = await createResultPng(result);
      const filename = `incident-on-titan-${String(result.simulation || 'result').replace(/[^a-z0-9-]/gi, '')}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const gameUrl = missionShareUrl();
      const text = `${tr('weeklyIncident', 'Incident')} ${mission.number} · ${mission.title}\n${mission.role.toUpperCase()}\n${tr('scoreAttributedCaps', 'SCORE ATTRIBUTED BY SYBILLE AI')}: ${result.score}\n${result.simulation}`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `Incident on Titan — ${mission.title}`,
            text,
            url: gameUrl.toString(),
            files: [file]
          });
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
          console.warn('Native image sharing failed.', error);
        }
      }

      download(blob, filename);
      try {
        await navigator.clipboard?.writeText(`${text}\n${gameUrl}`);
        alert(tr('imageDownloadedCopied', 'Result image downloaded. Game link copied.'));
      } catch (_) {
        alert(tr('imageDownloaded', 'Result image downloaded.'));
      }
    } catch (error) {
      console.error(error);
      alert(tr('imageError', 'The result image could not be generated.'));
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel || tr('shareResult', 'Share result');
      }
    }
  };
})();
