import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Function to parse markdown content and extract metadata
function parseTagFromMarkdown(content, slug) {
  const { data, content: tagContent } = matter(content);
  
  return {
    metadata: {
      title: data.title,
      tag_id: parseInt(data.tag_id),
      arranger: data.arranger,
      difficulty: data.difficulty,
      date_added: data.date_added,
      parts: parseInt(data.parts),
      lyrics: data.lyrics,
      comments: data.comments || ""
    },
    content: tagContent.trim(),
    slug: slug
  };
}

// Function to generate the tags database
function generateTagsDatabase() {
  const tagsDir = path.join(process.cwd(), 'data', 'tags');
  const outputFile = path.join(process.cwd(), 'src', 'lib', 'generated-tags.ts');
  
  // Read all markdown files from the tags directory
  const tagFiles = fs.readdirSync(tagsDir)
    .filter(file => file.endsWith('.md'))
    .sort(); // Sort for consistent ordering
  
  const allTags = [];
  
  tagFiles.forEach(file => {
    const filePath = path.join(tagsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const slug = file.replace('.md', '');
    
    try {
      const tag = parseTagFromMarkdown(content, slug);
      allTags.push(tag);
      console.log(`✅ Processed: ${tag.metadata.title} (${slug})`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
  
  // Generate the TypeScript file
  const generatedContent = `// Auto-generated file - do not edit manually
// Generated on: ${new Date().toISOString()}
// Source: data/tags/ directory

import type { Tag } from './types';

export const allTags: Tag[] = ${JSON.stringify(allTags, null, 2)};

export const tagCount = ${allTags.length};
`;

  // Write the generated file
  fs.writeFileSync(outputFile, generatedContent);
  
  console.log(`\n🎉 Generated database with ${allTags.length} tags`);
  console.log(`📁 Output: ${outputFile}`);
  
  return allTags;
}

// Run the generation
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTagsDatabase();
}

export { generateTagsDatabase };
