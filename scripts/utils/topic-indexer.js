/**
 * Topic Indexer Utility
 * 
 * Maintains a dynamic index of all discovered topics across the dataset.
 * Tracks topic frequency, related repositories, and trending patterns.
 */

const fs = require('fs').promises;

class TopicIndexer {
  constructor() {
    this.indexPath = 'data/index/topics.json';
  }

  async loadIndex() {
    try {
      const content = await fs.readFile(this.indexPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create new index
        return this.createEmptyIndex();
      }
      throw error;
    }
  }

  createEmptyIndex() {
    return {
      schema_version: 1,
      last_updated: null,
      total_topics: 0,
      topics: {}
    };
  }

  async updateIndex(repositories, date) {
    const index = await this.loadIndex();
    
    // Extract all topics from repositories
    repositories.forEach(repo => {
      const topics = repo.topics || repo.latest_topics || [];
      
      topics.forEach(topic => {
        const topicSlug = this.normalizeTopicSlug(topic);
        
        if (!index.topics[topicSlug]) {
          // New topic discovered
          index.topics[topicSlug] = {
            name: topic,
            slug: topicSlug,
            first_seen: date,
            last_seen: date,
            total_repositories: 0,
            trending_repositories: 0,
            repositories: []
          };
        }

        const topicData = index.topics[topicSlug];
        
        // Update last seen
        topicData.last_seen = date;
        
        // Add repository if not already present
        const repoKey = repo.full_name;
        if (!topicData.repositories.includes(repoKey)) {
          topicData.repositories.push(repoKey);
          topicData.total_repositories++;
        }
        
        // Increment trending count if this is a new trending date
        topicData.trending_repositories = topicData.repositories.length;
      });
    });

    // Update metadata
    index.last_updated = new Date().toISOString();
    index.total_topics = Object.keys(index.topics).length;

    await this.saveIndex(index);
    return index;
  }

  async saveIndex(index) {
    // Ensure directory exists
    const dir = require('path').dirname(this.indexPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  normalizeTopicSlug(topic) {
    return topic
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get topics above a minimum repository threshold
   */
  async getPopularTopics(minRepositories = 1) {
    const index = await this.loadIndex();
    
    return Object.values(index.topics)
      .filter(topic => topic.total_repositories >= minRepositories)
      .sort((a, b) => b.total_repositories - a.total_repositories);
  }

  /**
   * Get topic statistics
   */
  async getStatistics() {
    const index = await this.loadIndex();
    const topics = Object.values(index.topics);

    if (topics.length === 0) {
      return {
        total: 0,
        avg_repos_per_topic: 0,
        most_popular: null
      };
    }

    const totalRepos = topics.reduce((sum, t) => sum + t.total_repositories, 0);
    const mostPopular = topics.reduce((max, t) => 
      t.total_repositories > max.total_repositories ? t : max, topics[0]);

    return {
      total: topics.length,
      avg_repos_per_topic: Math.round(totalRepos / topics.length * 10) / 10,
      most_popular: {
        name: mostPopular.name,
        repositories: mostPopular.total_repositories
      }
    };
  }
}

module.exports = TopicIndexer;
