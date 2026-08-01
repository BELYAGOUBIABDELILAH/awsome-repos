#!/usr/bin/env node

/**
 * GitHub Trending Collector
 * 
 * This script collects trending repositories from GitHub and saves them to JSON files.
 * It handles rate limiting, error recovery, and data validation.
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const { format } = require('date-fns');

class TrendingCollector {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.today = format(new Date(), 'yyyy-MM-dd');
    this.outputPath = this.getOutputPath();
    this.languagesConfig = null;
  }

  async loadLanguagesConfig() {
    if (this.languagesConfig) {
      return this.languagesConfig;
    }

    try {
      const configPath = path.join(process.cwd(), 'config/languages.json');
      const content = await fs.readFile(configPath, 'utf8');
      this.languagesConfig = JSON.parse(content);
      return this.languagesConfig;
    } catch (error) {
      console.warn('Could not load languages config, using defaults:', error.message);
      // Fallback to minimal set if config fails to load
      return {
        languages: {
          python: { enabled: true, github_trending_slug: 'python' },
          javascript: { enabled: true, github_trending_slug: 'javascript' },
          typescript: { enabled: true, github_trending_slug: 'typescript' }
        }
      };
    }
  }

  getEnabledLanguages(config) {
    const languages = [''];  // Always include overall trending (empty string)
    
    for (const [key, lang] of Object.entries(config.languages || {})) {
      if (lang.enabled !== false) {  // Include if enabled is true or undefined
        languages.push(lang.github_trending_slug);
      }
    }
    
    return languages;
  }

  getOutputPath() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = this.today;
    
    return {
      dir: `data/${year}/${month}`,
      file: `${day}.json`,
      full: `data/${year}/${month}/${day}.json`
    };
  }

  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.outputPath.dir, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  async searchTrendingRepositories(language = '', since = 'daily') {
    try {
      // Calculate date for trending search
      const date = new Date();
      date.setDate(date.getDate() - 1); // Yesterday
      const sinceDate = format(date, 'yyyy-MM-dd');

      const query = [
        `created:>${sinceDate}`,
        language ? `language:${language}` : '',
        'stars:>10' // Minimum stars to reduce noise
      ].filter(Boolean).join(' ');

      console.log(`Searching for repositories: ${query}`);

      const response = await this.octokit.rest.search.repos({
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: 100
      });

      return response.data.items;
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw error;
    }
  }

  async getRepositoryDetails(owner, repo) {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      });

      return response.data;
    } catch (error) {
      console.warn(`Could not get details for ${owner}/${repo}:`, error.message);
      return null;
    }
  }

  normalizeRepositoryData(repo, rank = 0) {
    return {
      id: `${repo.owner.login}/${repo.name}`,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description || '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      language: repo.language || 'Unknown',
      topics: repo.topics || [],
      license: repo.license ? repo.license.spdx_id : null,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      homepage: repo.homepage || '',
      size: repo.size,
      open_issues: repo.open_issues_count,
      trending_rank: rank + 1,
      category: this.categorizeRepository(repo),
      first_seen: this.today,
      is_new: true // Will be updated by the analysis script
    };
  }

  categorizeRepository(repo) {
    const description = (repo.description || '').toLowerCase();
    const topics = repo.topics || [];
    const language = (repo.language || '').toLowerCase();

    // AI/ML category
    const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural', 'llm', 'gpt', 'transformer'];
    if (topics.some(topic => aiKeywords.includes(topic)) || aiKeywords.some(keyword => description.includes(keyword))) {
      return 'ai';
    }

    // Web development
    const webKeywords = ['web', 'frontend', 'backend', 'api', 'server', 'framework'];
    if (topics.some(topic => webKeywords.includes(topic)) || webKeywords.some(keyword => description.includes(keyword))) {
      return 'web';
    }

    // Mobile development
    const mobileKeywords = ['mobile', 'ios', 'android', 'react-native', 'flutter'];
    if (topics.some(topic => mobileKeywords.includes(topic)) || mobileKeywords.some(keyword => description.includes(keyword))) {
      return 'mobile';
    }

    // DevOps/Tools
    const devopsKeywords = ['devops', 'docker', 'kubernetes', 'deployment', 'ci/cd', 'automation'];
    if (topics.some(topic => devopsKeywords.includes(topic)) || devopsKeywords.some(keyword => description.includes(keyword))) {
      return 'devops';
    }

    // Default to language-based category
    return language || 'other';
  }

  generateStatistics(repositories) {
    const languages = {};
    const topics = {};
    let totalStars = 0;
    let minStars = Infinity;
    let maxStars = 0;

    repositories.forEach(repo => {
      // Language statistics
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }

      // Topic statistics
      repo.topics.forEach(topic => {
        topics[topic] = (topics[topic] || 0) + 1;
      });

      // Star statistics
      totalStars += repo.stars;
      minStars = Math.min(minStars, repo.stars);
      maxStars = Math.max(maxStars, repo.stars);
    });

    return {
      star_range: {
        min: minStars === Infinity ? 0 : minStars,
        max: maxStars,
        average: repositories.length > 0 ? Math.round(totalStars / repositories.length) : 0
      },
      new_repositories: repositories.filter(r => r.is_new).length,
      returning_repositories: repositories.filter(r => !r.is_new).length,
      language_distribution: this.calculatePercentages(languages, repositories.length),
      topic_distribution: this.calculatePercentages(topics, repositories.length)
    };
  }

  calculatePercentages(data, total) {
    const result = {};
    for (const [key, count] of Object.entries(data)) {
      result[key] = total > 0 ? Math.round((count / total) * 100) : 0;
    }
    return result;
  }

  async saveData(data) {
    try {
      await this.ensureDirectoryExists();
      await fs.writeFile(this.outputPath.full, JSON.stringify(data, null, 2));
      console.log(`✅ Data saved to ${this.outputPath.full}`);
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  }

  async collect() {
    console.log(`🚀 Starting trending collection for ${this.today}`);

    try {
      // Load language configuration
      const config = await this.loadLanguagesConfig();
      const languages = this.getEnabledLanguages(config);
      
      console.log(`📚 Collecting trending data for ${languages.length} language(s)`);
      
      let allRepos = [];

      for (const language of languages) {
        console.log(`📊 Collecting ${language || 'all'} repositories...`);
        const repos = await this.searchTrendingRepositories(language);
        allRepos = allRepos.concat(repos);

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Remove duplicates
      const uniqueRepos = allRepos.filter((repo, index, self) =>
        index === self.findIndex(r => r.id === repo.id)
      );

      // Normalize data
      const normalizedRepos = uniqueRepos
        .slice(0, 50) // Limit to top 50
        .map((repo, index) => this.normalizeRepositoryData(repo, index));

      // Generate statistics
      const statistics = this.generateStatistics(normalizedRepos);

      // Language and topic aggregations
      const languageCount = {};
      const topicCount = {};

      normalizedRepos.forEach(repo => {
        if (repo.language) {
          languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
        }
        repo.topics.forEach(topic => {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        });
      });

      const data = {
        date: this.today,
        generated_at: new Date().toISOString(),
        total_count: normalizedRepos.length,
        languages: languageCount,
        topics: topicCount,
        repositories: normalizedRepos,
        statistics,
        collection_metadata: {
          api_version: '2022-11-28',
          rate_limit_remaining: null, // Will be filled if available
          collection_duration_ms: null, // Will be calculated
          errors: []
        }
      };

      await this.saveData(data);

      console.log(`✅ Successfully collected ${normalizedRepos.length} repositories`);
      console.log(`📊 Languages: ${Object.keys(languageCount).length}`);
      console.log(`🏷️ Topics: ${Object.keys(topicCount).length}`);

      return data;

    } catch (error) {
      console.error('❌ Collection failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const collector = new TrendingCollector();
  
  collector.collect()
    .then(() => {
      console.log('🎉 Collection completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Collection failed:', error);
      process.exit(1);
    });
}

module.exports = TrendingCollector;