/**
 * Deduplication utilities for deal analysis data
 */

/**
 * Normalize text for comparison by removing extra whitespace, 
 * converting to lowercase, and removing common punctuation
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if two strings are similar enough to be considered duplicates
 * Uses simple similarity check based on normalized text
 */
function areSimilar(text1: string, text2: string, threshold: number = 0.8): boolean {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Check if one is contained within the other (for partial matches)
  const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
  const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
  
  if (shorter.length > 0 && longer.includes(shorter)) {
    return true;
  }
  
  // Simple Jaccard similarity for word-based comparison
  const words1 = new Set(normalized1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalized2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 && words2.size === 0) {
    return true;
  }
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const similarity = intersection.size / union.size;
  return similarity >= threshold;
}

/**
 * Deduplicate an array of strings using fuzzy matching
 * Keeps the first occurrence of each unique item
 */
export function deduplicateArray(items: string[], similarityThreshold: number = 0.8): string[] {
  if (!items || items.length === 0) {
    return [];
  }
  
  const deduplicated: string[] = [];
  
  for (const item of items) {
    const trimmedItem = item.trim();
    
    // Skip empty items
    if (!trimmedItem) {
      continue;
    }
    
    // Check if this item is similar to any existing item
    const isDuplicate = deduplicated.some(existing => 
      areSimilar(existing, trimmedItem, similarityThreshold)
    );
    
    if (!isDuplicate) {
      deduplicated.push(trimmedItem);
    }
  }
  
  return deduplicated;
}

/**
 * Deduplicate pain points array
 */
export function deduplicatePainPoints(painPoints: string[]): string[] {
  return deduplicateArray(painPoints, 0.8);
}

/**
 * Deduplicate next steps array
 */
export function deduplicateNextSteps(nextSteps: string[]): string[] {
  return deduplicateArray(nextSteps, 0.8);
}

/**
 * Merge and deduplicate two arrays of strings
 * Useful when combining existing data with new AI analysis
 */
export function mergeAndDeduplicate(
  existing: string[], 
  newItems: string[], 
  similarityThreshold: number = 0.8
): string[] {
  const combined = [...(existing || []), ...(newItems || [])];
  return deduplicateArray(combined, similarityThreshold);
}

/**
 * Clean and deduplicate deal analysis data
 */
export interface DealAnalysisData {
  painPoints?: string[];
  nextSteps?: string[];
}

export function cleanDealAnalysisData(data: DealAnalysisData): DealAnalysisData {
  return {
    painPoints: data.painPoints ? deduplicatePainPoints(data.painPoints) : undefined,
    nextSteps: data.nextSteps ? deduplicateNextSteps(data.nextSteps) : undefined,
  };
} 