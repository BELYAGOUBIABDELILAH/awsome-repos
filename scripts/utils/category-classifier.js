/**
 * Category Classifier Utility
 * 
 * Classifies repositories into curated categories based on topics and metadata.
 * A repository can belong to multiple categories.
 */

const fs = require('fs').promises;

class CategoryClassifier {
  constructor() {
    this.categories = null;
  }

  async loadCategories() {
    if (this.categories) {
      return this.categories;
    }

    try {
      const content = await fs.readFile('config/categories.json', 'utf8');
      const config = JSON.parse(content);
      this.categories = config.categories;
      return this.categories;
    } catch (error) {
      console.error('Failed to load categories:', error.message);
      return {};
    }
  }

  /**
   * Classify a single repository into categories
   * Returns array of category slugs
   */
  async classifyRepository(repository) {
    const categories = await this.loadCategories();
    const matches = [];

    // Extract repository data for matching
    const topics = (repository.topics || repository.latest_topics || []).map(t => t.toLowerCase());
    const language = (repository.primary_language || repository.latest_language || repository.language || '').toLowerCase();
    const description = (repository.description || '').toLowerCase();

    // Check each category
    for (const [slug, category] of Object.entries(categories)) {
      if (this.matchesCategory(category, topics, language, description)) {
        matches.push(slug);
      }
    }

    // If no matches, repository remains unclassified
    return matches;
  }

  /**
   * Check if repository matches a category
   */
  matchesCategory(category, topics, language, description) {
    const aliases = category.aliases || [];

    // Check if any topic matches category aliases
    for (const topic of topics) {
      if (aliases.includes(topic)) {
        return true;
      }
    }

    // Check if description contains category aliases
    for (const alias of aliases) {
      if (description.includes(alias)) {
        return true;
      }
    }

    // Language-specific categories (e.g., systems-programming matches c, rust)
    if (category.slug === 'systems-programming') {
      if (['c', 'c++', 'cpp', 'rust', 'assembly', 'asm'].includes(language)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Classify multiple repositories
   * Returns map of repository full_name to category slugs
   */
  async classifyRepositories(repositories) {
    const results = new Map();

    for (const repo of repositories) {
      const categories = await this.classifyRepository(repo);
      if (categories.length > 0) {
        results.set(repo.full_name, categories);
      }
    }

    return results;
  }

  /**
   * Group repositories by category
   * Returns map of category slug to repository array
   */
  async groupByCategory(repositories) {
    const groups = new Map();
    const categories = await this.loadCategories();

    // Initialize groups
    for (const slug of Object.keys(categories)) {
      groups.set(slug, []);
    }

    // Classify and group
    for (const repo of repositories) {
      const repoCategories = await this.classifyRepository(repo);
      for (const categorySlug of repoCategories) {
        if (groups.has(categorySlug)) {
          groups.get(categorySlug).push(repo);
        }
      }
    }

    return groups;
  }

  /**
   * Get category metadata
   */
  async getCategoryMetadata(categorySlug) {
    const categories = await this.loadCategories();
    return categories[categorySlug] || null;
  }

  /**
   * Get all categories sorted by priority
   */
  async getAllCategories() {
    const categories = await this.loadCategories();
    return Object.entries(categories)
      .map(([slug, data]) => ({ slug, ...data }))
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }
}

module.exports = CategoryClassifier;
