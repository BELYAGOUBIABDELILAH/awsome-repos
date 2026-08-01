/**
 * Tests for deduplication utility
 */

const DeduplicationUtil = require('../scripts/utils/deduplication');

describe('Deduplication Utility', () => {
  describe('Multi-language deduplication', () => {
    test('merges same repository from multiple language sources', () => {
      const repos = [
        {
          full_name: 'facebook/react',
          owner: 'facebook',
          name: 'react',
          github_id: 10270250,
          stars: 219000,
          primary_language: 'JavaScript',
          appearances: [
            { source_type: 'overall', source_slug: 'trending', rank: 1 }
          ]
        },
        {
          full_name: 'facebook/react',
          owner: 'facebook',
          name: 'react',
          github_id: 10270250,
          stars: 219000,
          primary_language: 'JavaScript',
          appearances: [
            { source_type: 'language', source_slug: 'javascript', rank: 1 }
          ]
        }
      ];

      const merged = DeduplicationUtil.mergeRepositories(repos);

      expect(merged.length).toBe(1);
      expect(merged[0].full_name).toBe('facebook/react');
      expect(merged[0].appearances.length).toBe(2);
      expect(merged[0].appearance_sources).toContain('overall:trending');
      expect(merged[0].appearance_sources).toContain('language:javascript');
    });

    test('preserves unique repositories while merging duplicates', () => {
      const repos = [
        {
          full_name: 'facebook/react',
          github_id: 1,
          stars: 100,
          appearances: [{ source_type: 'overall', source_slug: 'trending', rank: 1 }]
        },
        {
          full_name: 'facebook/react',
          github_id: 1,
          stars: 100,
          appearances: [{ source_type: 'language', source_slug: 'javascript', rank: 1 }]
        },
        {
          full_name: 'microsoft/vscode',
          github_id: 2,
          stars: 150,
          appearances: [{ source_type: 'overall', source_slug: 'trending', rank: 2 }]
        },
        {
          full_name: 'microsoft/vscode',
          github_id: 2,
          stars: 150,
          appearances: [{ source_type: 'language', source_slug: 'typescript', rank: 1 }]
        }
      ];

      const merged = DeduplicationUtil.mergeRepositories(repos);

      expect(merged.length).toBe(2);
      
      const react = merged.find(r => r.full_name === 'facebook/react');
      expect(react.appearances.length).toBe(2);
      
      const vscode = merged.find(r => r.full_name === 'microsoft/vscode');
      expect(vscode.appearances.length).toBe(2);
    });

    test('handles repository appearing in many language lists', () => {
      const repos = [
        {
          full_name: 'example/polyglot',
          github_id: 999,
          stars: 1000,
          appearances: [{ source_type: 'language', source_slug: 'python', rank: 5 }]
        },
        {
          full_name: 'example/polyglot',
          github_id: 999,
          stars: 1000,
          appearances: [{ source_type: 'language', source_slug: 'javascript', rank: 10 }]
        },
        {
          full_name: 'example/polyglot',
          github_id: 999,
          stars: 1000,
          appearances: [{ source_type: 'language', source_slug: 'go', rank: 15 }]
        },
        {
          full_name: 'example/polyglot',
          github_id: 999,
          stars: 1000,
          appearances: [{ source_type: 'overall', source_slug: 'trending', rank: 3 }]
        }
      ];

      const merged = DeduplicationUtil.mergeRepositories(repos);

      expect(merged.length).toBe(1);
      expect(merged[0].appearances.length).toBe(4);
      expect(merged[0].appearance_sources.length).toBe(4);
      expect(merged[0].appearance_sources).toContain('language:python');
      expect(merged[0].appearance_sources).toContain('language:javascript');
      expect(merged[0].appearance_sources).toContain('language:go');
      expect(merged[0].appearance_sources).toContain('overall:trending');
    });
  });

  describe('Repository identification', () => {
    test('normalizes repository identifiers correctly', () => {
      expect(DeduplicationUtil.normalizeIdentifier('Facebook/React')).toBe('facebook/react');
      expect(DeduplicationUtil.normalizeIdentifier('https://github.com/facebook/react')).toBe('facebook/react');
      expect(DeduplicationUtil.normalizeIdentifier('https://github.com/facebook/react.git')).toBe('facebook/react');
    });

    test('uses github_id as primary canonical key', () => {
      const repo = {
        github_id: 12345,
        full_name: 'owner/repo',
        owner: 'owner',
        name: 'repo'
      };

      const key = DeduplicationUtil.getCanonicalKey(repo);
      expect(key).toBe('id:12345');
    });

    test('falls back to full_name when github_id unavailable', () => {
      const repo = {
        full_name: 'owner/repo',
        owner: 'owner',
        name: 'repo'
      };

      const key = DeduplicationUtil.getCanonicalKey(repo);
      expect(key).toBe('name:owner/repo');
    });
  });

  describe('findDuplicates', () => {
    test('detects duplicates in repository array', () => {
      const repos = [
        { github_id: 1, full_name: 'a/b', stars: 100 },
        { github_id: 2, full_name: 'c/d', stars: 200 },
        { github_id: 1, full_name: 'a/b', stars: 100 }
      ];

      const duplicates = DeduplicationUtil.findDuplicates(repos);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].key).toBe('id:1');
      expect(duplicates[0].original.index).toBe(0);
      expect(duplicates[0].duplicate.index).toBe(2);
    });

    test('returns empty array when no duplicates', () => {
      const repos = [
        { github_id: 1, full_name: 'a/b', stars: 100 },
        { github_id: 2, full_name: 'c/d', stars: 200 },
        { github_id: 3, full_name: 'e/f', stars: 300 }
      ];

      const duplicates = DeduplicationUtil.findDuplicates(repos);
      expect(duplicates.length).toBe(0);
    });
  });
});
