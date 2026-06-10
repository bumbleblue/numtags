export type TagOrigin =
  | 'catalog'
  | 'imported-musicxml'
  | 'imported-midi'
  | 'imported-image'
  | 'authored';

export interface TagMetadata {
  title: string;
  tag_id: number;
  arranger: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  source_url?: string;
  date_added: string;
  parts: number;
  lyrics?: string;
  comments?: string;
  original_key?: string;
  origin?: TagOrigin;
}

/** Local (private library) tag ids live in their own namespace (spec §4.3). */
export const LOCAL_ID_BASE = 1_000_000;

export interface Tag {
  metadata: TagMetadata;
  content: string;
  slug: string;
}

export interface SearchFilters {
  query: string;
  arranger?: string;
  difficulty?: string;
  parts?: number[];
}

export interface SearchResult {
  item: Tag;
  refIndex: number;
  score?: number;
}
