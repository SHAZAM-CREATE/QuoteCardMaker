// ── IntaSend Keys (replace with your actual keys) ──
const INTASEND_PUBLIC_KEY = 'ISPubKey_live_ee993074-8546-448a-940e-b27643db3077';
const INTASEND_SECRET_KEY = 'ISSecretKey_live_7050a35c-f371-4e6d-93c8-bfb2d6e8cb68';

// ── State ──
let uploadedAvatar = null;
let downloadsUsed = parseInt(localStorage.getItem('downloadsUsed') || '0');
let isPremium = localStorage.getItem('isPremium') === 'true';
const FREE_LIMIT = 1;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ── Trial Badge ──
function updateBadge() {
  const badge = document.getElementById('trialText');
  if (isPremium) {
    badge.textContent = '✨ Premium';
    document.getElementById('trialBadge').style.borderColor = '#f0c040';
  } else {
    const left = Math.max(0, FREE_LIMIT - downloadsUsed);
    badge.textContent = left + ' Free Download' + (left === 1 ? '' : 's') + ' Left';
  }
}

updateBadge();

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

// ── Card number formatting ──
document.getElementById('payCard').addEventListener('input', function(e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 16);
  e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
});

document.getElementById('payExpiry').addEventListener('input', function(e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
  e.target.value = v;
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

// ── Download with paywall ──
document.getElementById('downloadBtn').addEventListener('click', function() {
  if (!isPremium && downloadsUsed >= FREE_LIMIT) {
    document.getElementById('premiumModal').classList.add('active');
    return;
  }
  doDownload();
});

function doDownload() {
  if (!isPremium) {
    downloadsUsed++;
    localStorage.setItem('downloadsUsed', downloadsUsed);
    updateBadge();
  }
  renderCard(true);
  const link = document.createElement('a');
  link.download = 'quote-card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  setTimeout(function() { renderCard(false); }, 100);
}

// ── Payment method toggle ──
function selectMethod(method) {
  if (method === 'mpesa') {
    document.getElementById('mpesaSection').style.display = 'block';
    document.getElementById('cardSection').style.display = 'none';
    document.getElementById('mpesaBtn').classList.add('active');
    document.getElementById('cardBtn').classList.remove('active');
  } else {
    document.getElementById('mpesaSection').style.display = 'none';
    document.getElementById('cardSection').style.display = 'block';
    document.getElementById('cardBtn').classList.add('active');
    document.getElementById('mpesaBtn').classList.remove('active');
  }
}

// ── Modal logic ──
document.getElementById('closeModalBtn').addEventListener('click', function() {
  document.getElementById('premiumModal').classList.remove('active');
});

document.getElementById('goToPaymentBtn').addEventListener('click', function() {
  document.getElementById('premiumModal').classList.remove('active');
  document.getElementById('paymentModal').classList.add('active');
});

document.getElementById('backBtn').addEventListener('click', function() {
  document.getElementById('paymentModal').classList.remove('active');
  document.getElementById('premiumModal').classList.add('active');
});

// ── M-Pesa Payment via IntaSend ──
document.getElementById('mpesaPayBtn').addEventListener('click', function() {
  const phone = document.getElementById('mpesaPhone').value.trim();
  if (!phone || phone.length < 10) {
    alert('Please enter a valid phone number.');
    return;
  }

  this.textContent = 'Sending STK Push...';
  this.disabled = true;
  const btn = this;

  fetch('/api/mpesa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + INTASEND_PUBLIC_KEY
    },
    body: JSON.stringify({
      phone: phone,
      amount: 390,
      currency: 'KES',
      narrative: 'Quote Card Maker Premium'
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.invoice || data.success) {
      isPremium = true;
      localStorage.setItem('isPremium', 'true');
      updateBadge();
      document.getElementById('paymentModal').classList.remove('active');
      document.getElementById('successModal').classList.add('active');
    } else {
      alert('Payment failed. Please try again.');
    }
    btn.textContent = 'Pay with M-Pesa / Airtel';
    btn.disabled = false;
  })
  .catch(function() {
    alert('Something went wrong. Please try again.');
    btn.textContent = 'Pay with M-Pesa / Airtel';
    btn.disabled = false;
  });
});

// ── Card Payment ──
document.getElementById('cardPayBtn').addEventListener('click', function() {
  const name = document.getElementById('payName').value.trim();
  const email = document.getElementById('payEmail').value.trim();
  const card = document.getElementById('payCard').value.trim();
  const expiry = document.getElementById('payExpiry').value.trim();
  const cvv = document.getElementById('payCVV').value.trim();

  if (!name || !email || card.length < 19 || expiry.length < 5 || cvv.length < 3) {
    alert('Please fill in all payment details correctly.');
    return;
  }

  this.textContent = 'Processing...';
  this.disabled = true;
  const btn = this;

  setTimeout(function() {
    isPremium = true;
    localStorage.setItem('isPremium', 'true');
    updateBadge();
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('successModal').classList.add('active');
    btn.textContent = 'Pay $3.00 — Unlock Premium';
    btn.disabled = false;
  }, 2000);
});

// ── Success ──
document.getElementById('continueBtn').addEventListener('click', function() {
  document.getElementById('successModal').classList.remove('active');
  doDownload();
});

// ── Init ──
renderCard();