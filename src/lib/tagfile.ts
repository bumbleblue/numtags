/**
 * Tag ⇄ markdown file (YAML frontmatter + ASCII notation body, spec §4.1).
 *
 * Browser-safe: the catalog's frontmatter is a flat map of strings/numbers,
 * so a tiny hand-rolled reader/writer beats shipping a YAML library to the
 * client. The build-time script (scripts/generate-tags.js) keeps using
 * gray-matter; both must agree on this flat schema.
 */
import type { Tag, TagMetadata, TagOrigin } from './types';

const STRING_KEYS = [
	'title',
	'arranger',
	'difficulty',
	'source_url',
	'date_added',
	'lyrics',
	'comments',
	'original_key',
	'origin',
] as const;

export function parseTagFile(raw: string, slug = ''): Tag {
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) throw new Error('Not a tag file: missing YAML frontmatter');
	const [, fm, content] = m;

	const meta: Record<string, string | number> = {};
	for (const line of fm.split(/\r?\n/)) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		const [, key, rawVal] = kv;
		let val = rawVal.trim();
		if (
			(val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
			(val.startsWith("'") && val.endsWith("'") && val.length >= 2)
		) {
			val = val.slice(1, -1);
		}
		meta[key] = /^-?\d+$/.test(val) && (key === 'tag_id' || key === 'parts') ? Number(val) : val;
	}

	const metadata: TagMetadata = {
		title: String(meta.title ?? 'Untitled'),
		tag_id: typeof meta.tag_id === 'number' ? meta.tag_id : Number(meta.tag_id ?? 0),
		arranger: String(meta.arranger ?? 'unknown'),
		difficulty: (['Easy', 'Medium', 'Hard'].includes(String(meta.difficulty))
			? meta.difficulty
			: 'Easy') as TagMetadata['difficulty'],
		date_added: String(meta.date_added ?? ''),
		parts: typeof meta.parts === 'number' ? meta.parts : 4,
	};
	if (meta.source_url) metadata.source_url = String(meta.source_url);
	if (meta.lyrics) metadata.lyrics = String(meta.lyrics);
	if (meta.comments) metadata.comments = String(meta.comments);
	if (meta.original_key) metadata.original_key = String(meta.original_key);
	if (meta.origin) metadata.origin = String(meta.origin) as TagOrigin;

	return { metadata, content: content.replace(/^\r?\n/, ''), slug };
}

export function serializeTag(tag: Tag): string {
	const m = tag.metadata;
	const lines = ['---'];
	const push = (key: string, val: string | number | undefined) => {
		if (val === undefined || val === '') return;
		lines.push(typeof val === 'number' ? `${key}: ${val}` : `${key}: "${val.replace(/"/g, "'")}"`);
	};
	push('title', m.title);
	lines.push(`tag_id: ${m.tag_id}`);
	push('arranger', m.arranger);
	push('difficulty', m.difficulty);
	push('source_url', m.source_url);
	push('date_added', m.date_added);
	lines.push(`parts: ${m.parts}`);
	push('lyrics', m.lyrics);
	push('comments', m.comments);
	push('original_key', m.original_key);
	push('origin', m.origin);
	lines.push('---', '');
	let body = tag.content.replace(/^\n+/, '');
	if (!body.endsWith('\n')) body += '\n';
	return lines.join('\n') + body;
}
