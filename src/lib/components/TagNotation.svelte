<script lang="ts">
  import { parseTagContent } from '$lib/notation-parser';
  import type { ParsedBeat } from '$lib/notation-parser';

  export let content: string;
  // Limit to N measures per staff for card previews; undefined = show all
  export let maxMeasures: number | undefined = undefined;

  $: parsed = parseTagContent(content);

  // Detect octave from combining diacritics on the token string
  function octaveClass(token: string): string {
    if (token.includes('\u0307')) return 'octave-upper'; // combining dot above → upper octave
    if (token.includes('\u0323')) return 'octave-lower'; // combining dot below → lower octave
    return '';
  }

  function displayToken(beat: ParsedBeat): string {
    if (beat.isEmpty) return '\u00a0';
    if (beat.isPosted) return '—';
    return beat.token;
  }
</script>

<div class="notation-wrap">
  {#each parsed.staffs as staff, si}
    {@const measures = maxMeasures !== undefined
      ? staff.measures.slice(0, maxMeasures)
      : staff.measures}
    {@const showLyrics = maxMeasures === undefined}

    <div class="staff-block" class:staff-gap={si > 0}>
      <div class="measures-row">

        <!-- Pickup notes before the first barline -->
        {#if staff.hasPickup && (maxMeasures === undefined || maxMeasures > 0)}
          <div
            class="measure-block pickup-block"
            style="--beat-cols: {staff.pickupBeats[0]?.length ?? 1}"
          >
            {#each staff.pickupBeats as voiceBeats, vi}
              {#each voiceBeats as beat}
                <div
                  class="beat-cell {octaveClass(beat.token)}"
                  class:empty-cell={beat.isEmpty}
                  class:tied-cell={beat.tiedFromPrev}
                  class:voice-gap={vi > 0}
                >
                  {displayToken(beat)}
                </div>
              {/each}
            {/each}
            {#if showLyrics}
              {#each staff.pickupLyrics as lyricRow, li}
                {#each lyricRow as syllable}
                  <div class="beat-cell lyric-cell" class:lyric-sep={li === 0}>
                    {syllable ?? '\u00a0'}
                  </div>
                {/each}
              {/each}
            {/if}
          </div>
        {/if}

        <!-- Measures, alternating background for visual separation -->
        {#each measures as measure, mi}
          {@const beatCount = measure[0]?.length ?? 1}
          <div
            class="measure-block"
            class:alt-measure={mi % 2 === 1}
            style="--beat-cols: {beatCount}"
          >
            {#each measure as voiceBeats, vi}
              {#each voiceBeats as beat}
                <div
                  class="beat-cell {octaveClass(beat.token)}"
                  class:empty-cell={beat.isEmpty}
                  class:posted-cell={beat.isPosted}
                  class:tied-cell={beat.tiedFromPrev}
                  class:voice-gap={vi > 0}
                >
                  {displayToken(beat)}
                </div>
              {/each}
            {/each}
            {#if showLyrics}
              {#each staff.measureLyrics[mi] as lyricRow, li}
                {#each lyricRow as syllable}
                  <div class="beat-cell lyric-cell" class:lyric-sep={li === 0}>
                    {syllable ?? '\u00a0'}
                  </div>
                {/each}
              {/each}
            {/if}
          </div>
        {/each}

      </div><!-- .measures-row -->
    </div><!-- .staff-block -->
  {/each}
</div>

<style>
  .notation-wrap {
    font-size: 1rem;
  }

  .staff-gap {
    margin-top: 1.5rem;
  }

  /* Frame that holds all measure blocks together */
  .measures-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    column-gap: 2px;
    row-gap: 1.5rem;
    background-color: #2e3440; /* nord-0 — darker than the measure blocks */
    border: 1px solid #4c566a; /* nord-3 */
    border-radius: 4px;
    padding: 0.35rem;
  }

  /* Each measure is an inline grid: beats as columns, voices as rows */
  .measure-block {
    display: inline-grid;
    grid-template-columns: repeat(var(--beat-cols), minmax(1.8em, auto));
    background-color: #3b4252; /* nord-1 */
    padding: 0.2rem 0.4rem;
    border-radius: 2px;
  }

  .alt-measure {
    background-color: #434c5e; /* nord-2 */
  }

  /* Pickup block floats in the frame background; right border is the first barline */
  .pickup-block {
    background-color: transparent;
    padding-right: 0.5rem;
    border-right: 1px solid #4c566a; /* nord-3 */
    border-radius: 0;
  }

  .beat-cell {
    font-family: 'Everson Mono', monospace;
    font-weight: 700;
    font-size: 1.1rem;
    min-width: 1.8em;
    padding: 0.1em 0.3em 0.1em 0.15em;
    /* Right-align so the base digit is always at the right edge of the cell.
       Accidentals (♯♭) sit to its left; they don't shift the digit. */
    text-align: right;
    line-height: 1.85;
    color: #d8dee9; /* nord-4, middle octave */
    overflow: visible;
    position: relative;
  }

  /* Small top padding opens a gap between voice rows */
  .voice-gap {
    padding-top: 0.35em;
  }

  /* ── Octave colours ────────────────────────────────────────────────────── */
  .octave-upper { color: #eceff4; } /* nord-6, brighter */
  .octave-lower { color: #81a1c1; } /* nord-9, steel blue */

  /* ── Misc cell states ──────────────────────────────────────────────────── */
  .empty-cell { opacity: 0.12; }

  .posted-cell {
    opacity: 0.4;
    font-style: italic;
  }

  /* ── Lyric cells ───────────────────────────────────────────────────────── */
  .lyric-cell {
    font-size: 0.82rem;
    font-weight: 700;
    color: #d8dee9; /* nord-4 */
    text-align: left; /* syllables read left-to-right naturally */
    white-space: nowrap;
    overflow: visible;
    padding-top: 0.1em;
  }

  /* Separator between the last voice row and the first lyric row */
  .lyric-sep {
    padding-top: 0.45em;
    border-top: 1px solid rgba(76, 86, 106, 0.5); /* nord-3, subtle */
  }
</style>
