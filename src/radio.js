// Old-time radio that streams a random Grateful Dead show from archive.org.
// Plays the show's tracks in order, then tunes into another random show.

const SEARCH = 'https://archive.org/advancedsearch.php';
const FIRST_YEAR = 1965;
const LAST_YEAR = 1995;

export class RadioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = 0;
    this.state = 'off'; // 'off' | 'tuning' | 'playing'
    this.show = null; // { id, title, date, venue, tracks: [{ url, title }] }
    this.trackIndex = 0;
    this.volume = 0; // follows the "can the player hear it" target
    this.session = 0; // bumps on stop so in-flight requests get ignored
    this.error = null;
    this.playCount = 0; // identifies the latest playTrack() call

    this.audio.addEventListener('ended', () => this.nextTrack());
    this.audio.addEventListener('error', () => {
      if (this.state === 'playing') this.nextTrack(); // skip unplayable track
    });
  }

  get on() {
    return this.state !== 'off';
  }

  get currentTrack() {
    return this.show?.tracks[this.trackIndex] ?? null;
  }

  toggle() {
    if (this.on) this.stop();
    else this.start();
  }

  stop() {
    this.session++;
    this.state = 'off';
    this.show = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  async start() {
    const session = ++this.session;
    this.state = 'tuning';
    this.error = null;
    try {
      const show = await findRandomShow();
      if (session !== this.session) return; // turned off while tuning
      this.show = show;
      this.state = 'playing';
      // Drop in somewhere in the middle of the show, like tuning into a live broadcast.
      const spot = randomSpot(show.tracks);
      this.playTrack(spot.track, spot);
    } catch (err) {
      if (session !== this.session) return;
      console.warn('Radio could not tune in:', err);
      this.error = 'No signal';
      this.errorAt = performance.now();
      this.state = 'off';
    }
  }

  /** startAt: { seconds } or { fraction } of the way into the track; omit to start at the top. */
  playTrack(i, startAt = null) {
    this.trackIndex = i;
    const audio = this.audio;
    const play = ++this.playCount;
    audio.src = this.show.tracks[i].url;
    if (startAt) {
      audio.addEventListener('loadedmetadata', () => {
        if (play !== this.playCount) return; // moved on before metadata arrived
        const secs = startAt.seconds ?? (audio.duration || 0) * startAt.fraction;
        if (secs > 0 && isFinite(secs)) audio.currentTime = secs;
      }, { once: true });
    }
    audio.play().catch((err) => console.warn('Radio playback blocked:', err));
  }

  nextTrack() {
    if (!this.show) return;
    if (this.trackIndex + 1 < this.show.tracks.length) this.playTrack(this.trackIndex + 1);
    else this.start(); // show's over: tune into another one
  }

  /** hearing: 0..1, how audible the radio is from where the player stands. */
  update(dt, hearing) {
    this.volume += (hearing - this.volume) * Math.min(1, dt * 6);
    this.audio.volume = Math.max(0, Math.min(1, this.volume));
  }
}

/** Track lengths come as seconds ("361.2") or clock time ("06:02", "1:02:03"). */
function parseLength(len) {
  if (!len) return 0;
  const secs = String(len).split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
  return isFinite(secs) ? secs : 0;
}

/** Pick a uniformly random moment across the whole show. */
function randomSpot(tracks) {
  const total = tracks.reduce((sum, t) => sum + t.length, 0);
  if (tracks.every((t) => t.length > 0)) {
    let at = Math.random() * total;
    for (let i = 0; i < tracks.length; i++) {
      if (at < tracks[i].length) {
        // Don't start in the last few seconds of a track
        return { track: i, seconds: Math.min(at, Math.max(0, tracks[i].length - 10)) };
      }
      at -= tracks[i].length;
    }
  }
  // No length info: random track, random point (read from the audio once it loads)
  return { track: Math.floor(Math.random() * tracks.length), fraction: Math.random() * 0.9 };
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function searchUrl(year, rows, page) {
  const p = new URLSearchParams({
    q: `collection:GratefulDead AND year:${year}`,
    'fl[]': 'identifier',
    rows: String(rows),
    page: String(page),
    output: 'json',
  });
  return `${SEARCH}?${p}`;
}

async function findRandomShow(attempts = 6) {
  for (let a = 0; a < attempts; a++) {
    // The search API caps paging depth, so pick a random year, then a random show within it.
    const year = FIRST_YEAR + Math.floor(Math.random() * (LAST_YEAR - FIRST_YEAR + 1));
    const count = (await getJson(searchUrl(year, 0, 1))).response.numFound;
    if (!count) continue;

    const page = 1 + Math.floor(Math.random() * Math.min(count, 10000));
    const doc = (await getJson(searchUrl(year, 1, page))).response.docs[0];
    if (!doc) continue;

    const meta = await getJson(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`);
    const files = meta.files || [];
    let mp3s = files.filter((f) => f.format === 'VBR MP3');
    if (!mp3s.length) mp3s = files.filter((f) => /mp3/i.test(f.format || '') || /\.mp3$/i.test(f.name));
    if (!mp3s.length) continue;

    mp3s.sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
    const base = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/`;
    return {
      id: doc.identifier,
      title: meta.metadata?.title || doc.identifier,
      date: meta.metadata?.date || String(year),
      venue: [meta.metadata?.venue, meta.metadata?.coverage].filter(Boolean).join(', '),
      tracks: mp3s.map((f) => ({
        url: base + f.name.split('/').map(encodeURIComponent).join('/'),
        title: f.title || f.name.replace(/\.mp3$/i, ''),
        length: parseLength(f.length),
      })),
    };
  }
  throw new Error('No playable show found');
}
