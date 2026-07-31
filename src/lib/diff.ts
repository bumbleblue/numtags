/**
 * Line diff for the history screen (spec §6.8 "view/diff/revert").
 *
 * Tag documents are small (≤ 64KB, typically dozens of lines), so a plain
 * LCS over lines is plenty. Removed lines come before the added lines that
 * replaced them, matching how unified diffs read.
 */
export interface DiffLine {
	kind: 'same' | 'added' | 'removed';
	text: string;
}

export function diffLines(before: string, after: string): DiffLine[] {
	const a = before.split('\n');
	const b = after.split('\n');

	// lcs[i][j] = length of the LCS of a[i..] and b[j..]
	const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
		new Array<number>(b.length + 1).fill(0),
	);
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		}
	}

	const out: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			out.push({ kind: 'same', text: a[i] });
			i++;
			j++;
		} else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
			out.push({ kind: 'removed', text: a[i++] });
		} else {
			out.push({ kind: 'added', text: b[j++] });
		}
	}
	while (i < a.length) out.push({ kind: 'removed', text: a[i++] });
	while (j < b.length) out.push({ kind: 'added', text: b[j++] });
	return out;
}

/** True when the two texts differ at all (cheaper question than the diff). */
export function hasChanges(diff: DiffLine[]): boolean {
	return diff.some((l) => l.kind !== 'same');
}
