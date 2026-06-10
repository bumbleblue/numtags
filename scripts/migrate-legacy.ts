/**
 * One-off migration: convert legacy Unicode tag bodies in data/tags/*.md to
 * canonical ASCII (FABLE_SPEC §3) and add `origin: catalog` to frontmatter.
 * Lyric lines are left for hand-conversion (they were column-aligned in the
 * legacy format; canonical token alignment needs human judgment).
 *
 * Run: npx tsx scripts/migrate-legacy.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize } from '../src/lib/notation/normalize.js';

const dir = join(import.meta.dirname, '..', 'data', 'tags');

for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
	const path = join(dir, file);
	const raw = readFileSync(path, 'utf8');
	const m = raw.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
	if (!m) {
		console.error(`SKIP ${file}: no frontmatter`);
		continue;
	}
	let [, fm, body] = m;
	if (!/^origin:/m.test(fm)) {
		fm = fm.replace(/\n---\n$/, '\norigin: "catalog"\n---\n');
	}
	writeFileSync(path, fm + normalize(body));
	console.log(`migrated ${file}`);
}
