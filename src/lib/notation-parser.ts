export interface ParsedBeat {
  token: string;
  tiedFromPrev: boolean; // starts with ⁀ — carries the same syllable from previous measure
  isPosted: boolean;     // all X's — hold until director cuts
  isEmpty: boolean;      // padding cell added for alignment
}

export interface ParsedStaff {
  hasPickup: boolean;
  pickupBeats: ParsedBeat[][];          // [voiceIndex][beatIndex]
  measures: ParsedBeat[][][];           // [measureIndex][voiceIndex][beatIndex]
  // Lyric syllables distributed across beat positions.
  // null = held/rest beat; each inner array is one lyric line.
  pickupLyrics: (string | null)[][];    // [lyricLine][beatIndex]
  measureLyrics: (string | null)[][][]; // [measureIndex][lyricLine][beatIndex]
}

export interface ParsedTagContent {
  staffs: ParsedStaff[];
}

const TIE_CHAR = '\u2040'; // ⁀

// Matches one complete beat token, in priority order:
//   note    — optional tie + optional accidental + digit + optional combining diacritics + optional rhythmic dot
//   posted  — one or more X (hold until cut)
//   held    — em dash, en dash, or hyphen-minus
//   rest    — 0 or middle dot
const TOKEN_RE = /\u2040?[♯♭]?[1-7][\u0300-\u036f]*·?|X+|[-—–]|[0·]/gu;

function tokenize(segment: string): ParsedBeat[] {
  // Reset lastIndex since the regex is stateful with the /g flag
  TOKEN_RE.lastIndex = 0;
  return (segment.match(TOKEN_RE) ?? []).map(parseBeat);
}

function parseBeat(token: string): ParsedBeat {
  return {
    token,
    tiedFromPrev: token.startsWith(TIE_CHAR),
    isPosted: /^X+$/.test(token),
    isEmpty: false,
  };
}

function parseVoiceLine(line: string): {
  pickupBeats: ParsedBeat[];
  measures: ParsedBeat[][];
} {
  const parts = line.split('|');
  const pickupRaw = parts[0].trim();
  const measureParts = parts.slice(1);

  const pickupBeats = pickupRaw ? tokenize(pickupRaw) : [];

  const measures = measureParts
    .map(p => tokenize(p))
    .filter(m => m.length > 0);

  return { pickupBeats, measures };
}

// Parse one lyric line into a flat beat-aligned syllable array.
// Single space = move to next beat.
// `_` = explicit held/rest beat (preferred; produces a null slot).
// Double space = held/rest beat (legacy; still honored, but `_` is unambiguous
//   and survives editors/formatters that collapse runs of spaces).
// Hyphen within a word = syllable break across consecutive beats.
// Leading whitespace is stripped (it was monospace visual alignment).
function parseLyricsLine(line: string): (string | null)[] {
  const trimmed = line.trimStart();
  if (!trimmed) return [];
  const beats: (string | null)[] = [];
  for (const seg of trimmed.split(' ')) {
    if (seg === '') {
      beats.push(null);
    } else {
      for (const syl of seg.split('-')) {
        beats.push(syl === '' || syl === '_' ? null : syl);
      }
    }
  }
  return beats;
}

const EMPTY_BEAT: ParsedBeat = {
  token: '',
  tiedFromPrev: false,
  isPosted: false,
  isEmpty: true,
};

function padEnd(arr: ParsedBeat[], len: number): ParsedBeat[] {
  if (arr.length >= len) return arr;
  return [...arr, ...Array(len - arr.length).fill(EMPTY_BEAT)];
}

// Right-align pickup notes so they lead into the first measure
function padStart(arr: ParsedBeat[], len: number): ParsedBeat[] {
  if (arr.length >= len) return arr;
  return [...Array(len - arr.length).fill(EMPTY_BEAT), ...arr];
}

export function parseTagContent(content: string): ParsedTagContent {
  const staffs: ParsedStaff[] = [];
  let currentStaff: ParsedStaff | null = null;

  for (const block of content.split('\n\n')) {
    const lines = block
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.trim() && !l.trim().startsWith('//'));

    // Lines with | are voice lines; everything else is lyrics
    const voiceLines = lines.filter(l => l.includes('|'));
    const lyricLines = lines.filter(l => !l.includes('|'));

    if (voiceLines.length > 0) {
      const parsed = voiceLines.map(parseVoiceLine);
      const measureCount = Math.max(...parsed.map(v => v.measures.length));

      // Pickup: right-align across voices so beats land on the beat before measure 1
      const maxPickup = Math.max(...parsed.map(v => v.pickupBeats.length));
      const pickupBeats = parsed.map(v => padStart(v.pickupBeats, maxPickup));

      // Measures: normalize beat count per measure across voices
      const measures: ParsedBeat[][][] = Array.from({ length: measureCount }, (_, mi) => {
        const voiceBeats = parsed.map(v => v.measures[mi] ?? []);
        const maxBeats = Math.max(...voiceBeats.map(v => v.length), 1);
        return voiceBeats.map(beats => padEnd(beats, maxBeats));
      });

      // Distribute each lyric line's syllables across pickup + measure beat positions
      const pickupLyrics: (string | null)[][] = [];
      const measureLyrics: (string | null)[][][] = Array.from(
        { length: measureCount }, () => []
      );

      for (const rawLine of lyricLines) {
        const syllables = parseLyricsLine(rawLine);
        let pos = 0;

        // Pickup slice
        const pu: (string | null)[] = Array(maxPickup).fill(null);
        for (let i = 0; i < maxPickup; i++) pu[i] = syllables[pos++] ?? null;
        pickupLyrics.push(pu);

        // One slice per measure
        for (let mi = 0; mi < measureCount; mi++) {
          const bc = measures[mi][0]?.length ?? 0;
          const slice: (string | null)[] = Array(bc).fill(null);
          for (let bi = 0; bi < bc; bi++) slice[bi] = syllables[pos++] ?? null;
          measureLyrics[mi].push(slice);
        }
      }

      currentStaff = {
        hasPickup: maxPickup > 0,
        pickupBeats,
        measures,
        pickupLyrics,
        measureLyrics,
      };
      staffs.push(currentStaff);
    } else if (lyricLines.length > 0 && currentStaff) {
      // Lyric-only block (separated by blank line) belongs to the staff above.
      // Re-run the distribution for these additional lines.
      const measureCount = currentStaff.measures.length;
      const maxPickup = currentStaff.pickupBeats[0]?.length ?? 0;
      for (const rawLine of lyricLines) {
        const syllables = parseLyricsLine(rawLine);
        let pos = 0;
        const pu: (string | null)[] = Array(maxPickup).fill(null);
        for (let i = 0; i < maxPickup; i++) pu[i] = syllables[pos++] ?? null;
        currentStaff.pickupLyrics.push(pu);
        for (let mi = 0; mi < measureCount; mi++) {
          const bc = currentStaff.measures[mi][0]?.length ?? 0;
          const slice: (string | null)[] = Array(bc).fill(null);
          for (let bi = 0; bi < bc; bi++) slice[bi] = syllables[pos++] ?? null;
          currentStaff.measureLyrics[mi].push(slice);
        }
      }
    }
  }

  return { staffs };
}
