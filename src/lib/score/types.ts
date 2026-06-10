/**
 * ScoreModel — the convergence point of all import paths (FABLE_SPEC §4.2).
 *
 * MusicXML, MIDI, and OMR-from-image all produce this normalized structure;
 * the single encoder (encode.ts) turns it into the numeric notation body.
 */

export type VoiceRole = 'tenor' | 'lead' | 'baritone' | 'bass';

export interface ScoreModel {
	tonicPitchClass: number; // 0=C … 11=B; the movable-Do reference
	mode: 'major' | 'minor';
	keyName: string; // e.g. "C", "F", "Bb" — for original_key
	timeSignature: { beats: number; beatType: number }; // e.g. 4/4
	voices: Voice[]; // length 4, order: Tenor, Lead, Baritone, Bass
	confidence?: number; // image path only: 0–1, drives review urgency
}

export interface Voice {
	role: VoiceRole;
	measures: NoteEvent[][]; // [measureIndex][eventIndex]
}

export type Step = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface NoteEvent {
	kind: 'note' | 'rest';
	step?: Step; // spelled letter — preserves ♯2 vs ♭3 intent
	alter?: -2 | -1 | 0 | 1 | 2; // semitone alteration as written
	octave?: number; // scientific octave
	durationBeats: number; // in quarter-beats
	tiedFromPrev?: boolean;
	fermata?: boolean; // → candidate for posted (X)
	lyric?: { text: string; syllabic: 'single' | 'begin' | 'middle' | 'end' };
}

export const VOICE_ROLES: VoiceRole[] = ['tenor', 'lead', 'baritone', 'bass'];
