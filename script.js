// ── State ──
let uploadedAvatar = null;

// ── Element references ──
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ── Photo Upload ──
document.getElementById('photoUpload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      uploadedAvatar = img;

      // Show preview in the circle
      const previewImg = document.querySelector('.avatar-wrap img');
      const icon = document.getElementById('avatarIcon');
      previewImg.src = ev.target.result;
      previewImg.style.display = 'block';
      icon.style.display = 'none';

      // Update button text
      document.querySelector('.upload-btn').textContent = 'Change Photo';

      renderCard();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ── Sync preset dropdowns → color pickers ──
document.getElementById('bgPreset').addEventListener('change', function (e) {
  document.getElementById('bgColor').value = e.target.value;
  renderCard();
});

document.getElementById('textPreset').addEventListener('change', function (e) {
  document.getElementById('textColor').value = e.target.value;
  renderCard();
});

// ── Live update listeners ──
document.getElementById('bgColor').addEventListener('input', renderCard);
document.getElementById('textColor').addEventListener('input', renderCard);
document.getElementById('nameInput').addEventListener('input', renderCard);
document.getElementById('quoteInput').addEventListener('input', renderCard);
document.getElementById('cardSize').addEventListener('change', renderCard);
document.getElementById('fontStyle').addEventListener('change', renderCard);

document.getElementById('fontSize').addEventListener('input', function (e) {
  document.getElementById('fsVal').textContent = e.target.value;
  renderCard();
});

// ── Helpers ──
function getCardDimensions() {
  const val = document.getElementById('cardSize').value;
  const parts = val.split('x');
  return { w: parseInt(parts[0]), h: parseInt(parts[1]) };
}

function wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    if (!para.trim()) { lines.push(''); continue; }
    const words = para.split(' ');
    let line = '';

    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

function drawCircularImage(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // Cover crop
  const aspect = img.width / img.height;
  let sw, sh, sx, sy;
  if (aspect > 1) {
    sh = img.height; sw = sh;
    sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw;
    sx = 0; sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // Subtle white ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPlaceholderAvatar(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.15, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy + r * 1.05, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Main render ──
function renderCard(forDownload = false) {
  const { w, h } = getCardDimensions();
  canvas.width = w;
  canvas.height = h;

  // Scale preview to fit screen
  if (!forDownload) {
    const max = 380;
    const scale = Math.min(max / w, max / h);
    canvas.style.width = (w * scale) + 'px';
    canvas.style.height = (h * scale) + 'px';
  } else {
    canvas.style.width = '';
    canvas.style.height = '';
  }

  const bg = document.getElementById('bgColor').value;
  const tc = document.getElementById('textColor').value;
  const fs = parseInt(document.getElementById('fontSize').value);
  const name = document.getElementById('nameInput').value.trim();
  const quote = document.getElementById('quoteInput').value.trim();
  const fontTemplate = document.getElementById('fontStyle').value;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Avatar position
  const pad = w * 0.1;
  const avatarR = w * 0.07;
  const avatarCX = pad + avatarR;
  const avatarCY = h * 0.22;

  // Draw avatar
  if (uploadedAvatar) {
    drawCircularImage(ctx, uploadedAvatar, avatarCX, avatarCY, avatarR);
  } else {
    drawPlaceholderAvatar(ctx, avatarCX, avatarCY, avatarR);
  }

  // Name
  const nfs = Math.round(fs * 0.52);
  ctx.fillStyle = tc;
  ctx.font = '700 ' + nfs + 'px Segoe UI, sans-serif';
  ctx.fillText(name, avatarCX + avatarR + 14, avatarCY + nfs * 0.38);

  // Quote
  const fontStr = fontTemplate.replace('{size}', fs);
  ctx.font = fontStr;
  ctx.fillStyle = tc;

  const maxW = w - pad * 2;
  const lineH = fs * 1.5;
  const lines = wrapText(ctx, quote, maxW);
  const blockH = lines.length * lineH;
  const startY = h * 0.4 + (h * 0.5 - blockH) / 2;

  lines.forEach(function (line, i) {
    ctx.fillText(line, pad, startY + i * lineH);
  });
}

// ── Download ──
function downloadCard() {
  renderCard(true);
  const link = document.createElement('a');
  link.download = 'quote-card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  setTimeout(function () { renderCard(false); }, 100);
}

// ── Init ──
renderCard();