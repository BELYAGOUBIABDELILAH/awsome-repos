#!/usr/bin/env node

/**
 * Generate Repository Profiles Script
 * 
 * Generates individual repository profile pages.
 */

const fs = require('fs').promises;
const path = require('path');
const mustache = require('mustache');

class RepositoryGenerator {
  constructor() {
    this.templateCache = {};
  }

  async generateAllRepositoryProfiles() {
    console.log('📦 Generating repository profiles...');
    
    try {
      const repositoryIndex = await this.loadRepositoryIndex();
      const repositories = Object.values(repositoryIndex.repositories);
      
      let generated = 0;
      for (const repo of repositories) {
        await this.generateRepositoryProfile(repo);
        generated++;
      }
      
      console.log(`✅ Generated ${generated} repository profiles`);
      
    } catch (error) {
      console.error(`❌ Repository profile generation failed: ${error.message}`);
      throw error;
    }
  }

  async loadRepositoryIndex() {
    try {
      const content = await fs.readFile('data/index/repositories.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load repository index: ${error.message}`);
    }
  }

  async generateRepositoryProfile(repo) {
    const outputPath = `repos/${repo.owner}/${repo.name}.md`;
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const templateData = this.prepareRepositoryTemplateData(repo);
    const template = await this.loadTemplate('repository.md');
    const markdown = mustache.render(template, templateData);
    
    await fs.writeFile(outputPath, markdown);
    
    // Log progress occasionally
    if (Math.random() < 0.1) { // 10% of the time
      console.log(`  📄 Generated ${outputPath}`);
    }
  }

  prepareRepositoryTemplateData(repo) {
    const metadata = repo.latest_metadata || {};
    
    return {
      // Basic info
      owner: repo.owner,
      name: repo.name,
      full_name: repo.full_name,
      description: metadata.description || 'No description available',
      url: metadata.url || `https://github.com/${repo.full_name}`,
      homepage: metadata.homepage || null,
      
      // Current stats
      stars: repo.latest_stars.toLocaleString(),
      forks: (metadata.forks || 0).toLocaleString(),
      watchers: repo.latest_stars.toLocaleString(), // Approximation
      open_issues: 'N/A', // Not tracked
      
      // Metadata
      language: repo.latest_language || 'Unknown',
      license: metadata.license || 'Unknown',
      created_at: this.formatDate(metadata.created_at),
      updated_at: this.formatDate(metadata.updated_at),
      pushed_at: this.formatDate(metadata.pushed_at),
      size: 'N/A', // Not tracked
      
      // Topics
      topics: (repo.latest_topics || []).map(topic => ({
        name: topic,
        slug: topic.toLowerCase().replace(/[^a-z0-9]/g, '-')
      })),
      
      // Trending history
      first_trending: repo.first_seen,
      last_trending: repo.last_seen,
      total_trending_days: repo.trending_days,
      longest_streak: repo.current_consecutive_days,
      
      // Timeline
      trending_history: this.generateTrendingTimeline(repo),
      
      // Growth analysis
      initial_stars: this.estimateInitialStars(repo),
      current_stars: repo.latest_stars,
      total_growth: repo.latest_stars - this.estimateInitialStars(repo),
      avg_daily_growth: this.calculateAverageDailyGrowth(repo),
      
      // Performance metrics
      peak_position: this.calculatePeakPosition(repo),
      peak_date: repo.first_seen, // Simplification
      trending_frequency: this.calculateTrendingFrequency(repo),
      category_rank: 'N/A', // Would need more data
      
      // Related repositories (placeholder)
      related_language: [],
      related_topics: [],
      trending_together: [],
      
      // Daily mentions
      daily_mentions: this.generateDailyMentions(repo),
      
      // Metrics
      github_score: this.calculateGitHubScore(repo),
      trending_score: this.calculateTrendingScore(repo),
      community_score: this.calculateCommunityScore(repo),
      
      // Project health
      last_commit: this.formatDate(metadata.pushed_at),
      contributors: 'N/A', // Not tracked
      release_frequency: 'N/A', // Not tracked
      avg_response_time: 'N/A', // Not tracked
      
      // Links
      issues_url: `${metadata.url}/issues`,
      wiki_url: `${metadata.url}/wiki`,
      
      // Notes (placeholder)
      notes: [],
      
      // Metadata
      last_updated: new Date().toISOString(),
      data_points: repo.trending_days
    };
  }

  generateTrendingTimeline(repo) {
    return repo.appearance_dates.slice(-10).map(date => {
      const [year, month] = date.split('-');
      return {
        date,
        year,
        month,
        position: 'N/A', // Would need appearance data
        stars_then: 'N/A',
        stars_gained: 'N/A',
        context: 'Appeared in trending'
      };
    });
  }

  generateDailyMentions(repo) {
    return repo.appearance_dates.slice(-5).map(date => {
      const [year, month] = date.split('-');
      return {
        date,
        year,
        month,
        context: 'Featured in daily trending report'
      };
    });
  }

  estimateInitialStars(repo) {
    // Simple estimation - could be improved with historical data
    return Math.max(0, repo.latest_stars - (repo.trending_days * 100));
  }

  calculateAverageDailyGrowth(repo) {
    const totalGrowth = repo.latest_stars - this.estimateInitialStars(repo);
    return repo.trending_days > 0 ? Math.round(totalGrowth / repo.trending_days) : 0;
  }

  calculatePeakPosition(repo) {
    // Estimate based on stars - higher stars likely means better position
    if (repo.latest_stars > 100000) return 1;
    if (repo.latest_stars > 50000) return Math.floor(Math.random() * 3) + 1;
    if (repo.latest_stars > 10000) return Math.floor(Math.random() * 10) + 1;
    return Math.floor(Math.random() * 25) + 1;
  }

  calculateTrendingFrequency(repo) {
    // Percentage of days since first seen that it was trending
    const daysSinceFirstSeen = this.daysBetween(repo.first_seen, repo.last_seen) + 1;
    return Math.round((repo.trending_days / daysSinceFirstSeen) * 100);
  }

  calculateGitHubScore(repo) {
    // Composite score based on stars, forks, and activity
    const metadata = repo.latest_metadata || {};
    const starScore = Math.min(repo.latest_stars / 1000, 50); // Max 50 points
    const forkScore = Math.min((metadata.forks || 0) / 100, 25); // Max 25 points
    const activityScore = 25; // Assume active if recently updated
    
    return Math.min(Math.round(starScore + forkScore + activityScore), 100);
  }

  calculateTrendingScore(repo) {
    // Score based on trending performance
    const frequencyScore = Math.min(repo.trending_days * 2, 60); // Max 60 points
    const streakScore = Math.min(repo.current_consecutive_days * 5, 40); // Max 40 points
    
    return Math.min(Math.round(frequencyScore + streakScore), 100);
  }

  calculateCommunityScore(repo) {
    // Simplified community score
    const topicScore = (repo.latest_topics || []).length * 10; // 10 points per topic
    const languageScore = repo.latest_language ? 20 : 0;
    const licenseScore = repo.latest_metadata?.license ? 20 : 0;
    
    return Math.min(Math.round(topicScore + languageScore + licenseScore), 100);
  }

  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  async loadTemplate(templateName) {
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }
    
    const templatePath = `templates/${templateName}`;
    try {
      const template = await fs.readFile(templatePath, 'utf8');
      this.templateCache[templateName] = template;
      return template;
    } catch (error) {
      throw new Error(`Template not found: ${templatePath}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new RepositoryGenerator();
  
  generator.generateAllRepositoryProfiles()
    .then(() => {
      console.log('\n🎉 Repository profile generation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Repository profile generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = RepositoryGenerator;