#!/usr/bin/env node

/**
 * Generate Topic Pages Script
 * 
 * Generates topic-based aggregation pages using curated topics from config.
 */

const fs = require('fs').promises;
const path = require('path');
const mustache = require('mustache');

class TopicGenerator {
  constructor() {
    this.templateCache = {};
  }

  async generateAllTopicPages() {
    console.log('🏷️ Generating topic pages...');
    
    try {
      // Load configuration and data
      const topics = await this.loadTopicConfig();
      const repositoryIndex = await this.loadRepositoryIndex();
      
      // Generate each topic page
      for (const [slug, topicConfig] of Object.entries(topics.curated_topics)) {
        await this.generateTopicPage(slug, topicConfig, repositoryIndex);
      }
      
      console.log(`✅ Generated ${Object.keys(topics.curated_topics).length} topic pages`);
      
    } catch (error) {
      console.error(`❌ Topic generation failed: ${error.message}`);
      throw error;
    }
  }

  async loadTopicConfig() {
    try {
      const content = await fs.readFile('config/topics.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load topic config: ${error.message}`);
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

  async generateTopicPage(slug, topicConfig, repositoryIndex) {
    console.log(`  📄 Generating ${slug}.md`);
    
    // Filter repositories for this topic
    const matchingRepos = this.filterRepositoriesForTopic(topicConfig, repositoryIndex);
    
    if (matchingRepos.length === 0) {
      console.log(`    ⚠️  No repositories found for topic ${slug}, skipping`);
      return;
    }
    
    // Prepare template data
    const templateData = this.prepareTopicTemplateData(slug, topicConfig, matchingRepos);
    
    // Load and render template
    const template = await this.loadTemplate('topic.md');
    const markdown = mustache.render(template, templateData);
    
    // Write topic page
    const outputPath = `topics/${slug}.md`;
    await fs.writeFile(outputPath, markdown);
    
    console.log(`    ✅ Generated ${outputPath} (${matchingRepos.length} repositories)`);
  }

  filterRepositoriesForTopic(topicConfig, repositoryIndex) {
    const { aliases } = topicConfig;
    const matchingRepos = [];
    
    for (const [fullName, repo] of Object.entries(repositoryIndex.repositories)) {
      // Check if any of the repository's topics match this topic's aliases
      const repoTopics = (repo.latest_topics || []).map(t => t.toLowerCase());
      const hasMatchingTopic = aliases.some(alias => 
        repoTopics.some(topic => 
          topic === alias.toLowerCase() || 
          topic.includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(topic)
        )
      );
      
      if (hasMatchingTopic) {
        matchingRepos.push(repo);
      }
    }
    
    return matchingRepos;
  }

  prepareTopicTemplateData(slug, topicConfig, repositories) {
    const today = new Date().toISOString().split('T')[0];
    
    // Sort repositories by different criteria
    const byStars = [...repositories].sort((a, b) => b.latest_stars - a.latest_stars);
    const byTrendingDays = [...repositories].sort((a, b) => b.trending_days - a.trending_days);
    const byFirstSeen = [...repositories].sort((a, b) => new Date(b.first_seen) - new Date(a.first_seen));
    
    // Filter for different time periods
    const today_trending = repositories.filter(repo => repo.last_seen === today);
    const week_trending = repositories.filter(repo => this.isWithinDays(repo.last_seen, 7));
    const month_new = repositories.filter(repo => this.isWithinDays(repo.first_seen, 30));
    
    // Calculate statistics
    const stats = this.calculateTopicStatistics(repositories);
    
    return {
      // Topic metadata
      topic_name: topicConfig.name,
      topic_slug: slug,
      description: topicConfig.description,
      icon: topicConfig.icon,
      
      // Overview stats
      total_count: repositories.length,
      first_date: repositories.length > 0 ? byFirstSeen[byFirstSeen.length - 1].first_seen : null,
      last_date: repositories.length > 0 ? byStars[0].last_seen : null,
      avg_stars: Math.round(stats.totalStars / repositories.length) || 0,
      
      // Trending sections
      trending_today: today_trending.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      trending_week: week_trending.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      new_month: month_new.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      
      // Top lists
      most_starred: byStars.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      hall_of_fame: byTrendingDays.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      
      // Recent history
      recent_days: this.getRecentHistory(repositories, 7),
      
      // Statistics
      languages: this.getLanguageBreakdown(repositories),
      daily_avg: Math.round(stats.dailyAvg * 10) / 10,
      peak_date: stats.peakDate,
      peak_count: stats.peakCount,
      growth_rate: Math.round(stats.growthRate),
      
      // Related topics (placeholder)
      related_topics: [],
      
      // All repositories list
      all_repositories: repositories.slice(0, 100).map(repo => this.formatRepoForTemplate(repo)),
      
      // Metadata
      last_updated: new Date().toISOString()
    };
  }

  formatRepoForTemplate(repo) {
    return {
      owner: repo.owner,
      name: repo.name,
      full_name: repo.full_name,
      slug: `${repo.owner}/${repo.name}`,
      description: this.truncateText(repo.latest_metadata?.description || '', 100),
      stars: repo.latest_stars.toLocaleString(),
      language: repo.latest_language || 'Unknown',
      first_seen: repo.first_seen,
      last_seen: repo.last_seen,
      trending_count: repo.trending_days,
      days_trending: repo.current_consecutive_days
    };
  }

  calculateTopicStatistics(repositories) {
    let totalStars = 0;
    let dailyAppearances = {};
    
    repositories.forEach(repo => {
      totalStars += repo.latest_stars;
      
      // Count daily appearances
      repo.appearance_dates.forEach(date => {
        dailyAppearances[date] = (dailyAppearances[date] || 0) + 1;
      });
    });
    
    const dailyCounts = Object.values(dailyAppearances);
    const peakDay = Object.entries(dailyAppearances)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      totalStars,
      dailyAvg: dailyCounts.length > 0 ? dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length : 0,
      peakDate: peakDay ? peakDay[0] : null,
      peakCount: peakDay ? peakDay[1] : 0,
      growthRate: this.calculateGrowthRate(repositories)
    };
  }

  getLanguageBreakdown(repositories) {
    const languageCounts = {};
    
    repositories.forEach(repo => {
      const lang = repo.latest_language || 'Unknown';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
    
    return Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / repositories.length) * 100)
      }));
  }

  getRecentHistory(repositories, days) {
    const recent = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRepos = repositories.filter(repo => 
        repo.appearance_dates.includes(dateStr)
      );
      
      if (dayRepos.length > 0) {
        const topRepo = dayRepos.sort((a, b) => b.latest_stars - a.latest_stars)[0];
        const [year, month] = dateStr.split('-');
        
        recent[dateStr] = {
          date: dateStr,
          year,
          month,
          count: dayRepos.length,
          top_repo: `${topRepo.owner}/${topRepo.name}`
        };
      }
    }
    
    return Object.values(recent).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  calculateGrowthRate(repositories) {
    // Simple growth rate calculation based on new repositories in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRepos = repositories.filter(repo => 
      new Date(repo.first_seen) > thirtyDaysAgo
    );
    
    return repositories.length > 0 ? (recentRepos.length / repositories.length) * 100 : 0;
  }

  isWithinDays(dateStr, days) {
    const date = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date > cutoff;
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.slice(0, maxLength - 3) + '...';
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
  const generator = new TopicGenerator();
  
  generator.generateAllTopicPages()
    .then(() => {
      console.log('\n🎉 Topic page generation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Topic generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = TopicGenerator;