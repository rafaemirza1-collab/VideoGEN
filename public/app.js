let capturedShots = [];
let viewport = 'desktop';

document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    viewport = btn.dataset.vp;
  });
});

document.getElementById('btn-capture').addEventListener('click', async () => {
  const url = document.getElementById('url-input').value.trim();
  if (!url) return setStatus('capture-status', 'Please enter a URL.', 'error');

  const btn = document.getElementById('btn-capture');
  btn.disabled = true;
  setStatus('capture-status', 'Capturing website... this may take 20-30 seconds.', '');

  try {
    const res = await fetch('/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, viewport })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    capturedShots = data.screenshots.map(s => ({ ...s, selected: true }));
    renderPreview();
    show('step-preview');
    show('step-options');
    setStatus('capture-status', `Captured ${capturedShots.length} shots.`, 'success');
    loadMusicOptions();
  } catch (err) {
    setStatus('capture-status', 'Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

function renderPreview() {
  const grid = document.getElementById('preview-grid');
  grid.innerHTML = '';
  capturedShots.forEach((shot, i) => {
    const div = document.createElement('div');
    div.className = 'preview-item' + (shot.selected ? '' : ' deselected');
    div.innerHTML = `<img src="/${shot.file}" loading="lazy"><div class="badge">${i + 1}</div>`;
    div.addEventListener('click', () => {
      capturedShots[i].selected = !capturedShots[i].selected;
      div.classList.toggle('deselected');
    });
    grid.appendChild(div);
  });
}

async function loadMusicOptions() {
  try {
    const res = await fetch('/music-list');
    const { tracks } = await res.json();
    const sel = document.getElementById('opt-music');
    tracks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
      sel.appendChild(opt);
    });
  } catch (_) {}
}

document.getElementById('btn-generate').addEventListener('click', async () => {
  const selected = capturedShots.filter(s => s.selected).map(s => s.file);
  if (selected.length === 0) return setStatus('generate-status', 'Select at least one shot.', 'error');

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  setStatus('generate-status', 'Generating video... this may take a minute.', '');

  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clips: selected,
        format: document.getElementById('opt-format').value,
        style: document.getElementById('opt-style').value,
        duration: document.getElementById('opt-duration').value,
        music: document.getElementById('opt-music').value || null
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const link = document.getElementById('download-link');
    link.href = `/output/${data.file}`;
    link.download = data.file;
    document.getElementById('download-msg').textContent = `Video ready: ${data.file}`;
    show('step-download');
    setStatus('generate-status', 'Done!', 'success');
  } catch (err) {
    setStatus('generate-status', 'Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btn-reset').addEventListener('click', () => {
  capturedShots = [];
  document.getElementById('url-input').value = '';
  document.getElementById('preview-grid').innerHTML = '';
  ['step-preview', 'step-options', 'step-download'].forEach(hide);
  setStatus('capture-status', '', '');
  setStatus('generate-status', '', '');
  document.getElementById('opt-music').innerHTML = '<option value="">No music</option>';
});

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function setStatus(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'status' + (type ? ' ' + type : '');
}
