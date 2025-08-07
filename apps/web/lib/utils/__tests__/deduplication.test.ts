/**
 * Tests for deduplication utilities
 */

import { 
  deduplicateArray, 
  deduplicatePainPoints, 
  deduplicateNextSteps,
  mergeAndDeduplicate,
  cleanDealAnalysisData 
} from '../deduplication';

describe('Deduplication utilities', () => {
  describe('deduplicateArray', () => {
    it('should remove exact duplicates', () => {
      const input = ['Schedule a meeting', 'Schedule a meeting', 'Send proposal'];
      const result = deduplicateArray(input);
      expect(result).toEqual(['Schedule a meeting', 'Send proposal']);
    });

    it('should remove case-insensitive duplicates', () => {
      const input = ['Schedule a meeting', 'SCHEDULE A MEETING', 'Send proposal'];
      const result = deduplicateArray(input);
      expect(result).toEqual(['Schedule a meeting', 'Send proposal']);
    });

    it('should remove punctuation-based duplicates', () => {
      const input = ['Schedule a meeting', 'Schedule a meeting.', 'Send proposal!'];
      const result = deduplicateArray(input);
      expect(result).toEqual(['Schedule a meeting', 'Send proposal!']);
    });

    it('should handle empty and whitespace-only items', () => {
      const input = ['', '   ', 'Valid item', '', 'Another item'];
      const result = deduplicateArray(input);
      expect(result).toEqual(['Valid item', 'Another item']);
    });

    it('should detect similar items', () => {
      const input = [
        'Prepare meeting agenda and talking points',
        'Prepare meeting agenda and talking points for next call',
        'Schedule demo'
      ];
      const result = deduplicateArray(input);
      expect(result).toEqual(['Prepare meeting agenda and talking points', 'Schedule demo']);
    });

    it('should handle empty arrays', () => {
      const result = deduplicateArray([]);
      expect(result).toEqual([]);
    });

    it('should handle undefined/null input gracefully', () => {
      const result = deduplicateArray(null as any);
      expect(result).toEqual([]);
    });
  });

  describe('deduplicatePainPoints', () => {
    it('should deduplicate common pain point patterns', () => {
      const input = [
        'Current tool is slow',
        'Current tool is slow and unreliable',
        'Manual process takes too long',
        'Team lacks visibility'
      ];
      const result = deduplicatePainPoints(input);
      expect(result).toEqual([
        'Current tool is slow',
        'Manual process takes too long',
        'Team lacks visibility'
      ]);
    });
  });

  describe('deduplicateNextSteps', () => {
    it('should deduplicate common next step patterns', () => {
      const input = [
        'Schedule demo',
        'Schedule a demo call',
        'Send pricing information',
        'Follow up next week'
      ];
      const result = deduplicateNextSteps(input);
      expect(result).toEqual([
        'Schedule demo',
        'Send pricing information',
        'Follow up next week'
      ]);
    });

    it('should handle the reported duplicate case', () => {
      const input = [
        'Prepare meeting agenda and talking points',
        'Prepare meeting agenda and talking points',
        'Send contract for review'
      ];
      const result = deduplicateNextSteps(input);
      expect(result).toEqual([
        'Prepare meeting agenda and talking points',
        'Send contract for review'
      ]);
    });
  });

  describe('mergeAndDeduplicate', () => {
    it('should merge and deduplicate two arrays', () => {
      const existing = ['Schedule meeting', 'Send proposal'];
      const newItems = ['Schedule a meeting', 'Follow up', 'Send proposal'];
      const result = mergeAndDeduplicate(existing, newItems);
      expect(result).toEqual(['Schedule meeting', 'Send proposal', 'Follow up']);
    });

    it('should handle empty arrays', () => {
      const result1 = mergeAndDeduplicate([], ['Item 1']);
      expect(result1).toEqual(['Item 1']);

      const result2 = mergeAndDeduplicate(['Item 1'], []);
      expect(result2).toEqual(['Item 1']);

      const result3 = mergeAndDeduplicate([], []);
      expect(result3).toEqual([]);
    });
  });

  describe('cleanDealAnalysisData', () => {
    it('should clean both pain points and next steps', () => {
      const input = {
        painPoints: [
          'Current process is manual',
          'Current process is manual and slow',
          'No visibility into pipeline'
        ],
        nextSteps: [
          'Schedule demo',
          'Schedule a demo',
          'Send pricing'
        ]
      };

      const result = cleanDealAnalysisData(input);
      
      expect(result.painPoints).toEqual([
        'Current process is manual',
        'No visibility into pipeline'
      ]);
      
      expect(result.nextSteps).toEqual([
        'Schedule demo',
        'Send pricing'
      ]);
    });

    it('should handle undefined fields', () => {
      const input = { painPoints: ['Item 1'] };
      const result = cleanDealAnalysisData(input);
      
      expect(result.painPoints).toEqual(['Item 1']);
      expect(result.nextSteps).toBeUndefined();
    });
  });
}); 