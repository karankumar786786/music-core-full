// ===== Configuration =====
const HLS_URL =
  'https://onemelodyproduction.s3.ap-south-1.amazonaws.com/songs/495fd784-ee09-46e9-b67c-42985b166723.67b612e3e5d51b6175bd3dfbccb9c6ae5bb4dd269e87646e9a652c2400b57dd7/master.m3u8';
const VTT_URL =
  'https://onemelodyproduction.s3.ap-south-1.amazonaws.com/songs/495fd784-ee09-46e9-b67c-42985b166723.67b612e3e5d51b6175bd3dfbccb9c6ae5bb4dd269e87646e9a652c2400b57dd7/caption.vtt';

// ===== DOM Elements =====
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const qualitySelect = document.getElementById('qualitySelect');
const lyricsContainer = document.getElementById('lyricsContainer');

// ===== State =====
let cues = [];
let hls = null;
let activeCueIndex = -1;

// ===== Parse VTT =====
async function loadVTT(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    cues = parseVTT(text);
    renderLyrics();
  } catch (err) {
    console.error('Failed to load VTT:', err);
    lyricsContainer.innerHTML =
      '<p class="lyrics-placeholder">Failed to load lyrics.</p>';
  }
}

function parseVTT(text) {
  const lines = text.split('\n');
  const parsed = [];
  let i = 0;

  // Skip header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map((s) => s.trim());
      const start = parseTimestamp(startStr);
      const end = parseTimestamp(endStr);

      i++;
      let textContent = '';
      while (i < lines.length && lines[i].trim() !== '') {
        textContent += (textContent ? ' ' : '') + lines[i].trim();
        i++;
      }

      if (textContent) {
        parsed.push({ start, end, text: textContent });
      }
    } else {
      i++;
    }
  }

  return parsed;
}

function parseTimestamp(ts) {
  // Handles both HH:MM:SS.mmm and MM:SS.mmm
  const parts = ts.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    return m * 60 + s;
  }
  return 0;
}

// ===== Render Lyrics =====
function renderLyrics() {
  lyricsContainer.innerHTML = '';

  if (cues.length === 0) {
    lyricsContainer.innerHTML =
      '<p class="lyrics-placeholder">No lyrics available.</p>';
    return;
  }

  cues.forEach((cue, index) => {
    const el = document.createElement('div');
    el.classList.add('lyric-line');
    el.textContent = cue.text;
    el.dataset.index = index;

    // Click to seek
    el.addEventListener('click', () => {
      audio.currentTime = cue.start;
      if (audio.paused) {
        audio.play();
      }
    });

    lyricsContainer.appendChild(el);
  });
}

// ===== Sync Lyrics =====
function syncLyrics() {
  const currentTime = audio.currentTime;
  let newActiveIndex = -1;

  for (let i = cues.length - 1; i >= 0; i--) {
    if (currentTime >= cues[i].start && currentTime < cues[i].end) {
      newActiveIndex = i;
      break;
    }
  }

  if (newActiveIndex === activeCueIndex) return;
  activeCueIndex = newActiveIndex;

  const lyricEls = lyricsContainer.querySelectorAll('.lyric-line');

  lyricEls.forEach((el, i) => {
    el.classList.remove('active', 'past');

    if (i === activeCueIndex) {
      el.classList.add('active');
    } else if (activeCueIndex >= 0 && i < activeCueIndex) {
      el.classList.add('past');
    }
  });

  // Scroll active lyric into view
  if (activeCueIndex >= 0 && lyricEls[activeCueIndex]) {
    lyricEls[activeCueIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}

// ===== HLS Setup =====
function initHLS() {
  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });

    hls.loadSource(HLS_URL);
    hls.attachMedia(audio);

    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('HLS manifest parsed, levels:', data.levels.length);
      populateQualitySelector(data.levels);
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', data.type, data.details);
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn('Network error, attempting recovery...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn('Media error, attempting recovery...');
            hls.recoverMediaError();
            break;
          default:
            console.error('Fatal error, destroying HLS');
            hls.destroy();
            break;
        }
      }
    });
  } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari)
    audio.src = HLS_URL;
  } else {
    console.error('HLS is not supported in this browser.');
  }
}

function populateQualitySelector(levels) {
  qualitySelect.innerHTML = '<option value="-1">Auto</option>';

  levels.forEach((level, index) => {
    const option = document.createElement('option');
    option.value = index;

    const kbps = Math.round(level.bitrate / 1000);
    option.textContent = `${kbps}kbps`;

    qualitySelect.appendChild(option);
  });
}

qualitySelect.addEventListener('change', () => {
  if (hls) {
    hls.currentLevel = parseInt(qualitySelect.value);
  }
});

// ===== Player Controls =====
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

rewindBtn.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
});

forwardBtn.addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
});

// ===== Play/Pause Icon Toggle =====
audio.addEventListener('play', () => {
  playIcon.style.display = 'none';
  pauseIcon.style.display = 'block';
});

audio.addEventListener('pause', () => {
  playIcon.style.display = 'block';
  pauseIcon.style.display = 'none';
});

// ===== Progress Bar =====
audio.addEventListener('timeupdate', () => {
  const dur = audio.duration || 0;
  const cur = audio.currentTime;

  if (dur > 0) {
    const pct = (cur / dur) * 100;
    progressFill.style.width = pct + '%';
    progressThumb.style.left = pct + '%';
  }

  currentTimeEl.textContent = formatTime(cur);
  syncLyrics();
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('durationchange', () => {
  durationEl.textContent = formatTime(audio.duration);
});

// Click to seek on progress bar
progressContainer.addEventListener('click', (e) => {
  const rect = progressContainer.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * (audio.duration || 0);
});

// ===== Format Time =====
function formatTime(s) {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== Init =====
initHLS();
loadVTT(VTT_URL);
