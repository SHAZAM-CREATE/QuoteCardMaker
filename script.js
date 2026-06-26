// ── Supabase ──
const _sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

// ── State ──
let uploadedAvatar = null;
let currentUser = null;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ── Auth + Premium Gate ──
async function initAuth() {
  const { data } = await _sb.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = data.session.user;

  const { data: profile } = await _sb
    .from('customers')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (!profile || !profile.is_premium) {
    // Not premium — send to payment page, this app is premium-only
    window.location.href = 'payment.html';
    return;
  }

  if (profile.full_name) {
    document.getElementById('nameInput').value = profile.full_name;
  }

  updateBadge();
  renderCard();
}

initAuth();

// ── Logout ──
document.getElementById('logoutBtn').addEventListener('click', async function() {
  await _sb.auth.signOut();
  window.location.href = 'login.html';
});

// ── Trial Badge (always Premium since this page is gated) ──
function updateBadge() {
  const badge = document.getElementById('trialText');
  badge.textContent = '✨ Premium';
  document.getElementById('trialBadge').style.borderColor = '#f0c040';
}

// ── Photo Upload ──
document.getElementById('photoUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      uploadedAvatar = img;
      document.getElementById('avatarIcon').style.display = 'none';
      const preview = document.getElementById('avatarPreview');
      preview.src = ev.target.result;
      preview.style.display = 'block';
      document.querySelector('.upload-btn').textContent = 'Change Photo';
      renderCard();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ── Sync presets ──
document.getElementById('bgPreset').addEventListener('change', function(e) {
  document.getElementById('bgColor').value = e.target.value;
  renderCard();
});
document.getElementById('textPreset').addEventListener('change', function(e) {
  document.getElementById('textColor').value = e.target.value;
  renderCard();
});

['bgColor','textColor','nameInput','quoteInput','cardSize','fontStyle'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', renderCard);
  document.getElementById(id).addEventListener('change', renderCard);
});

document.getElementById('fontSize').addEventListener('input', function(e) {
  document.getElementById('fsVal').textContent = e.target.value;
  renderCard();
});

// ── Helpers ──
function getDims() {
  const parts = document.getElementById('cardSize').value.split('x');
  return { w: parseInt(parts[0]), h: parseInt(parts[1]) };
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line); line = word;
      } else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawCircleImage(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const a = img.width / img.height;
  let sw, sh, sx, sy;
  if (a > 1) { sh = img.height; sw = sh; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPlaceholder(ctx, cx, cy, r) {
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

// ── Render ──
function renderCard(forDownload) {
  const { w, h } = getDims();
  canvas.width = w;
  canvas.height = h;

  if (!forDownload) {
    const max = 380;
    const s = Math.min(max / w, max / h);
    canvas.style.width = w * s + 'px';
    canvas.style.height = h * s + 'px';
  } else {
    canvas.style.width = '';
    canvas.style.height = '';
  }

  const bg = document.getElementById('bgColor').value;
  const tc = document.getElementById('textColor').value;
  const fs = parseInt(document.getElementById('fontSize').value);
  const name = document.getElementById('nameInput').value.trim();
  const quote = document.getElementById('quoteInput').value.trim();
  const fontTpl = document.getElementById('fontStyle').value;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const pad = w * 0.1;
  const ar = w * 0.07;
  const acx = pad + ar;
  const acy = h * 0.22;

  if (uploadedAvatar) drawCircleImage(ctx, uploadedAvatar, acx, acy, ar);
  else drawPlaceholder(ctx, acx, acy, ar);

  const nfs = Math.round(fs * 0.52);
  ctx.fillStyle = tc;
  ctx.font = '700 ' + nfs + 'px Segoe UI, sans-serif';
  ctx.fillText(name, acx + ar + 14, acy + nfs * 0.38);

  ctx.font = fontTpl.replace('{size}', fs);
  ctx.fillStyle = tc;
  const maxW = w - pad * 2;
  const lineH = fs * 1.5;
  const lines = wrapText(ctx, quote, maxW);
  const blockH = lines.length * lineH;
  const startY = h * 0.4 + (h * 0.5 - blockH) / 2;
  lines.forEach(function(line, i) {
    ctx.fillText(line, pad, startY + i * lineH);
  });
}

// ── Download (no paywall here — only premium users reach this page) ──
document.getElementById('downloadBtn').addEventListener('click', function() {
  renderCard(true);
  const link = document.createElement('a');
  link.download = 'quote-card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  setTimeout(function() { renderCard(false); }, 100);
});