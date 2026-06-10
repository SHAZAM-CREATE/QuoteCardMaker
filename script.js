// ── Init Supabase ──
const _supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

// ── African countries (non-Kenya) ──
const AFRICA_COUNTRIES = ['UG','TZ','NG','GH','ZA','ET','EG','RW','SN','CI','CM','ZM','ZW','MZ','MA','TN','AO','MG','BF','ML','MW','NE','SD','SO','SS','TD','DJ','ER','KM','LS','LR','LY','MR','MU','NA','SC','SL','ST','SZ','TO','TG','GM','GN','GW','CV','BJ','BI','CF','CG','CD','GA','GQ'];

// ── State ──
let uploadedAvatar = null;
let isPremium = false;
let userCountry = '';
let currentUser = null;
let downloadsUsed = 0;
const FREE_LIMIT = 1;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ── Auth Check ──
async function initAuth() {
  const { data } = await _supabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'signup.html';
    return;
  }

  currentUser = data.session.user;

  // Get profile from customers table
  const { data: profile } = await _supabase
    .from('customers')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profile) {
    userCountry = profile.country || '';
    isPremium = !!profile.is_premium;
    downloadsUsed = profile.downloads_used || 0;

    if (profile.full_name) {
      document.getElementById('nameInput').value = profile.full_name;
    }
  }

  // Check URL param for returning from checkout
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('premium') === 'success') {
    await activatePremium();
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  updateBadge();
  renderCard();
}

initAuth();

// ── Logout ──
document.getElementById('logoutBtn').addEventListener('click', async function() {
  await _supabase.auth.signOut();
  window.location.href = 'login.html';
});

// ── Trial Badge ──
function updateBadge() {
  const badge = document.getElementById('trialText');
  if (isPremium) {
    badge.textContent = '✨ Premium';
    document.getElementById('trialBadge').style.borderColor = '#f0c040';
    document.getElementById('trialBadge').style.color = '#f0c040';
  } else {
    const left = Math.max(0, FREE_LIMIT - downloadsUsed);
    badge.textContent = left + ' Free Download' + (left === 1 ? '' : 's') + ' Left';
  }
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

// ── Download with paywall ──
document.getElementById('downloadBtn').addEventListener('click', function() {
  if (!isPremium && downloadsUsed >= FREE_LIMIT) {
    showPremiumModal();
    return;
  }
  doDownload();
});

async function doDownload() {
  if (!isPremium) {
    downloadsUsed++;
    // Persist download count to DB
    if (currentUser) {
      await _supabase
        .from('customers')
        .update({ downloads_used: downloadsUsed })
        .eq('id', currentUser.id);
    }
    updateBadge();
  }
  renderCard(true);
  const link = document.createElement('a');
  link.download = 'quote-card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  setTimeout(function() { renderCard(false); }, 100);
}

// ── Modal helpers ──
function showPremiumModal() {
  document.getElementById('premiumModal').classList.add('active');
}

function showPaymentOptions() {
  document.getElementById('premiumModal').classList.remove('active');
  document.getElementById('paymentModal').classList.add('active');

  document.getElementById('kenyaSection').style.display = 'none';
  document.getElementById('africaSection').style.display = 'none';
  document.getElementById('worldSection').style.display = 'none';

  if (userCountry === 'KE') {
    document.getElementById('kenyaSection').style.display = 'block';
  } else if (AFRICA_COUNTRIES.includes(userCountry)) {
    document.getElementById('africaSection').style.display = 'block';
  } else {
    document.getElementById('worldSection').style.display = 'block';
  }
}

// ── selectMethod (used inline in HTML) ──
function selectMethod(method) {
  document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(method + 'Btn');
  if (btn) btn.classList.add('active');
}

// ── Modal wiring ──
document.getElementById('closeModalBtn').addEventListener('click', function() {
  document.getElementById('premiumModal').classList.remove('active');
});
document.getElementById('goToPaymentBtn').addEventListener('click', showPaymentOptions);
document.getElementById('backBtn').addEventListener('click', function() {
  document.getElementById('paymentModal').classList.remove('active');
  document.getElementById('premiumModal').classList.add('active');
});

// ── M-Pesa Payment ──
document.getElementById('mpesaPayBtn').addEventListener('click', function() {
  const phone = document.getElementById('mpesaPhone').value.trim();
  if (!phone || phone.length < 9) {
    alert('Please enter a valid M-Pesa phone number.');
    return;
  }

  const btn = this;
  btn.textContent = 'Sending STK Push...';
  btn.disabled = true;

  fetch('/api/mpesa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone, amount: 390 })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.invoice_id) {
      btn.textContent = '⏳ Waiting for PIN confirmation...';
      pollPaymentStatus(data.invoice_id, btn);
    } else {
      alert('Failed to initiate M-Pesa push. Please try again.');
      btn.textContent = 'Pay with M-Pesa / Airtel';
      btn.disabled = false;
    }
  })
  .catch(function() {
    alert('Something went wrong. Please try again.');
    btn.textContent = 'Pay with M-Pesa / Airtel';
    btn.disabled = false;
  });
});

function pollPaymentStatus(invoiceId, btn) {
  let attempts = 0;
  const maxAttempts = 20;

  const interval = setInterval(function() {
    attempts++;
    fetch('/api/mpesa?invoice_id=' + invoiceId)
      .then(function(r) { return r.json(); })
      .then(async function(data) {
        if (data.completed) {
          clearInterval(interval);
          // Also save payment linked to user email
          if (currentUser) {
            await _supabase.from('payments').upsert({
              customer_id: currentUser.id,
              email: currentUser.email,
              amount: 390,
              currency: 'KES',
              method: 'M-Pesa',
              status: 'success',
              transaction_id: invoiceId
            }, { onConflict: 'transaction_id' });
          }
          await activatePremium();
          btn.textContent = 'Pay with M-Pesa / Airtel';
          btn.disabled = false;
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          alert('Payment not confirmed yet. If you entered your PIN, wait a moment and refresh. Contact support if the issue persists.');
          btn.textContent = 'Pay with M-Pesa / Airtel';
          btn.disabled = false;
        }
      })
      .catch(function() {
        clearInterval(interval);
        btn.textContent = 'Pay with M-Pesa / Airtel';
        btn.disabled = false;
      });
  }, 3000);
}

// ── Blue Pay (Other Africa) ──
document.getElementById('africaPayBtn').addEventListener('click', function() {
  // Append user email and success redirect to checkout URL
  const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?premium=success');
  const checkoutUrl = CONFIG.checkoutAfrica + '?redirect_url=' + returnUrl;
  window.open(checkoutUrl, '_blank');
  this.textContent = '↗ Complete payment in new tab...';
  this.disabled = true;
  // Re-enable after 10s in case they come back without paying
  setTimeout(() => {
    this.textContent = 'Pay via Blue Pay →';
    this.disabled = false;
  }, 10000);
});

// ── Chariow (Rest of world) ──
document.getElementById('worldPayBtn').addEventListener('click', function() {
  const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?premium=success');
  const checkoutUrl = CONFIG.checkoutWorld + '?redirect_url=' + returnUrl;
  window.open(checkoutUrl, '_blank');
  this.textContent = '↗ Complete payment in new tab...';
  this.disabled = true;
  setTimeout(() => {
    this.textContent = 'Pay via International Checkout →';
    this.disabled = false;
  }, 10000);
});

// ── Activate Premium ──
async function activatePremium() {
  isPremium = true;
  updateBadge();

  if (currentUser) {
    await _supabase
      .from('customers')
      .update({ is_premium: true, premium_granted_at: new Date().toISOString() })
      .eq('id', currentUser.id);
  }

  document.getElementById('paymentModal').classList.remove('active');
  document.getElementById('premiumModal').classList.remove('active');
  document.getElementById('successModal').classList.add('active');
}

// ── Success continue ──
document.getElementById('continueBtn').addEventListener('click', function() {
  document.getElementById('successModal').classList.remove('active');
  doDownload();
});