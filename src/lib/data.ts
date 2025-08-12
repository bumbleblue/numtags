import type { Tag, TagMetadata, SearchFilters, SearchResult } from './types';
import Fuse from 'fuse.js';

// Sample tag data - in a real app, this would be loaded from markdown files
const sampleTags: Tag[] = [
  {
    metadata: {
      title: "Sweet Adeline",
      tag_id: 1001,
      arranger: "Traditional",
      difficulty: "Easy",
      date_added: "2024-01-15",
      parts: 4,
      lyrics: "Sweet Adeline, my Adeline",
      comments: "Classic barbershop tag, great for beginners"
    },
    content: `Lead: 1 3 5 1
Bass: 1 1 3 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5

Sweet Adeline, my Adeline`,
    slug: "sweet-adeline"
  },
  {
    metadata: {
      title: "Goodbye My Coney Island Baby",
      tag_id: 1002,
      arranger: "John Smith",
      difficulty: "Medium",
      date_added: "2024-01-16",
      parts: 4,
      lyrics: "Goodbye my Coney Island baby",
      comments: "Beautiful tag with rich harmonies"
    },
    content: `Lead: 1 2 3 1
Bass: 1 1 1 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5

Goodbye my Coney Island baby`,
    slug: "goodbye-coney-island-baby"
  },
  {
    metadata: {
      title: "Let Me Call You Sweetheart",
      tag_id: 1003,
      arranger: "Traditional",
      difficulty: "Easy",
      date_added: "2024-01-17",
      parts: 4,
      lyrics: "Let me call you sweetheart",
      comments: "Perfect for quartet practice"
    },
    content: `Lead: 1 3 5 1
Bass: 1 1 3 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5

Let me call you sweetheart`,
    slug: "let-me-call-you-sweetheart"
  }
];

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
  
  fuse = new Fuse(sampleTags, options);
}

export function searchTags(filters: SearchFilters): SearchResult[] {
  if (!fuse) {
    initializeSearch();
  }
  
  let results: SearchResult[];
  
  // If no query, return all tags
  if (!filters.query || filters.query.trim() === '') {
    results = sampleTags.map((tag, index) => ({
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
  return sampleTags.find(tag => tag.slug === slug);
}

export function getAllTags(): Tag[] {
  return sampleTags;
}



export function getUniqueDifficulties(): string[] {
  const difficulties = sampleTags.map(tag => tag.metadata.difficulty);
  return [...new Set(difficulties)];
}

export function getUniqueParts(): number[] {
  const allParts = sampleTags.map(tag => tag.metadata.parts);
  return [...new Set(allParts)].sort((a, b) => a - b);
}
