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
}

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
