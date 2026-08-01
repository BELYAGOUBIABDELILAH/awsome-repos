/**
 * Deduplication Utility
 * 
 * Provides canonical repository identification and duplicate detection.
 * Ensures the same repository never appears twice in the dataset.
 */

class DeduplicationUtil {
  /**
   * Normalize a repository identifier to canonical form
   * @param {string} identifier - Repository identifier (full_name, URL, or owner/name)
   * @returns {string} Normalized identifier in owner/name format
   */
  static normalizeIdentifier(identifier) {
    if (!identifier) {
      throw new Error('Repository identifier is required');
    }

    // Convert to string and trim
    let normalized = String(identifier).trim().toLowerCase();

    // Remove trailing .git
    normalized = normalized.replace(/\.git$/i, '');

    // Extract owner/name from various formats
    
    // GitHub URL format: https://github.com/owner/name
    if (normalized.includes('github.com/')) {
      const match = normalized.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (match) {
        normalized = `${match[1]}/${match[2]}`;
      }
    }

    // Git URL format: git@github.com:owner/name
    if (normalized.includes('git@github.com:')) {
      const match = normalized.match(/git@github\.com:([^\/]+)\/(.+)/);
      if (match) {
        normalized = `${match[1]}/${match[2]}`;
      }
    }

    // Remove leading/trailing slashes
    normalized = normalized.replace(/^\/+|\/+$/g, '');

    // Validate format (should be owner/name)
    if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(normalized)) {
      throw new Error(`Invalid repository identifier format: ${identifier}`);
    }

    return normalized;
  }

  /**
   * Get canonical repository key from repository object
   * Priority: github_id > full_name > owner/name
   */
  static getCanonicalKey(repository) {
    // Primary: Use GitHub numeric ID if available
    if (repository.github_id) {
      return `id:${repository.github_id}`;
    }

    // Secondary: Use normalized full_name
    if (repository.full_name) {
      return `name:${this.normalizeIdentifier(repository.full_name)}`;
    }

    // Fallback: Construct from owner/name
    if (repository.owner && repository.name) {
      return `name:${this.normalizeIdentifier(`${repository.owner}/${repository.name}`)}`;
    }

    throw new Error('Repository must have github_id, full_name, or owner+name');
  }

  /**
   * Detect duplicates in a repository array
   * Returns array of duplicate groups
   */
  static findDuplicates(repositories) {
    const seen = new Map();
    const duplicates = [];

    repositories.forEach((repo, index) => {
      try {
        const key = this.getCanonicalKey(repo);
        
        if (seen.has(key)) {
          // Found duplicate
          const original = seen.get(key);
          duplicates.push({
            key,
            original: {
              index: original.index,
              repository: original.repository
            },
            duplicate: {
              index,
              repository: repo
            }
          });
        } else {
          seen.set(key, { index, repository: repo });
        }
      } catch (error) {
        console.warn(`Warning: Could not process repository at index ${index}: ${error.message}`);
      }
    });

    return duplicates;
  }

  /**
   * Merge appearances from multiple sources into a single repository object
   * Handles same repository appearing in overall, language, and category sources
   */
  static mergeRepositories(repositories) {
    const canonicalMap = new Map();

    repositories.forEach(repo => {
      try {
        const key = this.getCanonicalKey(repo);
        
        if (!canonicalMap.has(key)) {
          // First occurrence - store as canonical
          canonicalMap.set(key, {
            ...repo,
            appearances: repo.appearances || [],
            appearance_sources: this.extractSources(repo)
          });
        } else {
          // Merge with existing
          const canonical = canonicalMap.get(key);
          
          // Merge appearances
          if (repo.appearances) {
            canonical.appearances = canonical.appearances.concat(repo.appearances);
          }

          // Merge sources
          const newSources = this.extractSources(repo);
          canonical.appearance_sources = [
            ...new Set([...canonical.appearance_sources, ...newSources])
          ];

          // Update latest metadata if newer
          if (this.isNewer(repo, canonical)) {
            canonical.stars = repo.stars || canonical.stars;
            canonical.forks = repo.forks || canonical.forks;
            canonical.description = repo.description || canonical.description;
            canonical.topics = repo.topics || canonical.topics;
            canonical.updated_at = repo.updated_at || canonical.updated_at;
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not merge repository: ${error.message}`);
      }
    });

    return Array.from(canonicalMap.values());
  }

  /**
   * Extract source information from repository appearances
   */
  static extractSources(repository) {
    const sources = new Set();
    
    if (repository.appearances) {
      repository.appearances.forEach(app => {
        if (app.source_type && app.source_slug) {
          sources.add(`${app.source_type}:${app.source_slug}`);
        }
      });
    }

    return Array.from(sources);
  }

  /**
   * Check if repo1 is newer than repo2
   */
  static isNewer(repo1, repo2) {
    if (!repo1.updated_at || !repo2.updated_at) return false;
    return new Date(repo1.updated_at) > new Date(repo2.updated_at);
  }

  /**
   * Deduplicate appearance records within a single repository
   * Removes duplicate date+source+rank combinations
   */
  static deduplicateAppearances(repository) {
    if (!repository.appearances || repository.appearances.length === 0) {
      return repository;
    }

    const seen = new Set();
    const uniqueAppearances = [];

    repository.appearances.forEach(app => {
      // Create unique key from date + source
      const key = `${app.date || 'no-date'}:${app.source_type || 'no-type'}:${app.source_slug || 'no-slug'}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueAppearances.push(app);
      }
    });

    return {
      ...repository,
      appearances: uniqueAppearances
    };
  }

  /**
   * Validate repository index for duplicates
   * Returns validation report
   */
  static validateIndex(repositoryIndex) {
    const report = {
      total_repositories: 0,
      duplicate_keys: [],
      duplicate_github_ids: [],
      duplicate_full_names: [],
      valid: true
    };

    if (!repositoryIndex.repositories) {
      report.error = 'No repositories object found';
      report.valid = false;
      return report;
    }

    const repositories = Object.values(repositoryIndex.repositories);
    report.total_repositories = repositories.length;

    // Check for duplicate GitHub IDs
    const githubIds = new Map();
    repositories.forEach((repo, index) => {
      if (repo.github_id) {
        if (githubIds.has(repo.github_id)) {
          report.duplicate_github_ids.push({
            github_id: repo.github_id,
            repositories: [githubIds.get(repo.github_id), repo.full_name]
          });
          report.valid = false;
        } else {
          githubIds.set(repo.github_id, repo.full_name);
        }
      }
    });

    // Check for duplicate normalized full_names
    const normalizedNames = new Map();
    repositories.forEach((repo, index) => {
      try {
        const normalized = this.normalizeIdentifier(repo.full_name);
        if (normalizedNames.has(normalized)) {
          report.duplicate_full_names.push({
            normalized,
            repositories: [normalizedNames.get(normalized), repo.full_name]
          });
          report.valid = false;
        } else {
          normalizedNames.set(normalized, repo.full_name);
        }
      } catch (error) {
        // Ignore invalid identifiers
      }
    });

    return report;
  }
}

module.exports = DeduplicationUtil;
