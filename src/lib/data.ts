import type { Tag, TagMetadata, SearchFilters, SearchResult } from './types';
import Fuse from 'fuse.js';
import { allTags } from './generated-tags';

let fuse: Fuse<Tag>;

export function initializeSearch() {
  const options = {
    keys: [
      'metadata.title',
      'metadata.lyrics',
      'metadata.arranger',
      'content'
    ],
    threshold: 0.3,
    includeScore: true
  };
  
  fuse = new Fuse(allTags, options);
}

export function searchTags(filters: SearchFilters): SearchResult[] {
  if (!fuse) {
    initializeSearch();
  }
  
  let results: SearchResult[];
  
  // If no query, return all tags
  if (!filters.query || filters.query.trim() === '') {
    results = allTags.map((tag, index) => ({
      item: tag,
      refIndex: index,
      score: 0
    }));
  } else {
    results = fuse.search(filters.query);
  }
  
  // Apply additional filters
  if (filters.arranger && filters.arranger.trim() !== '') {
    results = results.filter(result => 
      result.item.metadata.arranger.toLowerCase().includes(filters.arranger!.toLowerCase().trim())
    );
  }
  
  if (filters.difficulty) {
    results = results.filter(result => 
      result.item.metadata.difficulty === filters.difficulty
    );
  }
  
  if (filters.parts && filters.parts.length > 0) {
    results = results.filter(result => 
      filters.parts!.includes(result.item.metadata.parts)
    );
  }
  
  return results;
}

export function getTagBySlug(slug: string): Tag | undefined {
  return allTags.find(tag => tag.slug === slug);
}

export function getAllTags(): Tag[] {
  return allTags;
}

export function getUniqueDifficulties(): string[] {
  const difficulties = allTags.map(tag => tag.metadata.difficulty);
  return [...new Set(difficulties)];
}

export function getUniqueParts(): number[] {
  const allParts = allTags.map(tag => tag.metadata.parts);
  return [...new Set(allParts)].sort((a, b) => a - b);
}
