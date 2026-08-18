function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

async function submitCheckin(payload, method) {
  const res = await fetch('/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({}, payload, { method }))
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body && body.error) || ('check-in failed: ' + res.status));
  }
  return res.json();
}

async function fetchTotals(session) {
  const q = session ? `?session=${encodeURIComponent(session)}` : '';
  const res = await fetch('/api/totals' + q);
  return res.json();
}

async function fetchMeta() {
  const res = await fetch('/api/meta');
  return res.json();
}
