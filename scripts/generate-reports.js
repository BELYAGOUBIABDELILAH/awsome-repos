#!/usr/bin/env node

/**
 * Generate Daily Reports Script
 * 
 * Generates daily Markdown reports from processed snapshot data.
 */

const fs = require('fs').promises;
const path = require('path');
const mustache = require('mustache');
const { format, parseISO } = require('date-fns');

class ReportGenerator {
  constructor() {
    this.templateCache = {};
  }

  async generateDailyReport(date) {
    console.log(`📝 Generating daily report for ${date}`);
    
    try {
      // Load snapshot data
      const snapshotData = await this.loadSnapshotData(date);
      
      // Load repository index for additional context
      const repositoryIndex = await this.loadRepositoryIndex();
      
      // Process data for template
      const templateData = this.prepareTemplateData(snapshotData, repositoryIndex);
      
      // Load template
      const template = await this.loadTemplate('daily.md');
      
      // Generate markdown
      const markdown = mustache.render(template, templateData);
      
      // Write report
      await this.writeReport(date, markdown);
      
      console.log(`✅ Generated daily report for ${date}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate report for ${date}: ${error.message}`);
      throw error;
    }
  }

  async loadSnapshotData(date) {
    const dateObj = parseISO(date);
    const year = format(dateObj, 'yyyy');
    const month = format(dateObj, 'MM');
    const snapshotPath = `data/snapshots/${year}/${month}/${date}.json`;
    
    try {
      const content = await fs.readFile(snapshotPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Snapshot not found: ${snapshotPath}`);
    }
  }

  async loadRepositoryIndex() {
    try {
      const content = await fs.readFile('data/index/repositories.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Repository index not found, using empty index');
      return { repositories: {} };
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

  prepareTemplateData(snapshotData, repositoryIndex) {
    const { repositories, date } = snapshotData;
    
    // Group repositories by language
    const languageGroups = this.groupRepositoriesByLanguage(repositories);
    
    // Calculate statistics
    const stats = this.calculateStatistics(repositories, repositoryIndex);
    
    // Identify new repositories
    const newRepositories = this.identifyNewRepositories(repositories, repositoryIndex, date);
    
    // Get most starred
    const mostStarred = repositories
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 10);

    // Navigation data
    const navigation = this.getNavigationData(date);
    
    return {
      date: date,
      formatted_date: this.formatDateForDisplay(date),
      time: format(parseISO(snapshotData.generated_at), 'HH:mm'),
      
      // Summary stats
      total_count: repositories.length,
      language_count: Object.keys(languageGroups).length,
      new_count: newRepositories.length,
      returning_count: repositories.length - newRepositories.length,
      
      // Language sections
      languages: Object.entries(languageGroups)
        .sort(([,a], [,b]) => b.length - a.length)
        .map(([language, repos]) => ({
          name: language,
          icon: this.getLanguageIcon(language),
          count: repos.length,
          repositories: repos.map(repo => this.formatRepositoryForTemplate(repo))
        })),
      
      // Top sections
      top_starred: mostStarred.map(repo => this.formatRepositoryForTemplate(repo)),
      new_repositories: newRepositories.map(repo => this.formatRepositoryForTemplate(repo)),
      
      // Trending topics
      trending_topics: this.getTrendingTopics(repositories),
      
      // Statistics
      language_stats: this.getLanguageStats(languageGroups, repositories.length),
      max_stars: stats.maxStars,
      min_stars: stats.minStars,
      avg_stars: stats.avgStars,
      
      // Navigation
      ...navigation
    };
  }

  groupRepositoriesByLanguage(repositories) {
    return repositories.reduce((groups, repo) => {
      const language = repo.primary_language || 'Unknown';
      if (!groups[language]) {
        groups[language] = [];
      }
      groups[language].push(repo);
      return groups;
    }, {});
  }

  calculateStatistics(repositories, repositoryIndex) {
    if (repositories.length === 0) {
      return { minStars: 0, maxStars: 0, avgStars: 0 };
    }
    
    const stars = repositories.map(repo => repo.stars);
    return {
      minStars: Math.min(...stars),
      maxStars: Math.max(...stars),
      avgStars: Math.round(stars.reduce((a, b) => a + b, 0) / stars.length)
    };
  }

  identifyNewRepositories(repositories, repositoryIndex, date) {
    return repositories.filter(repo => {
      const indexEntry = repositoryIndex.repositories?.[repo.full_name];
      return !indexEntry || indexEntry.first_seen === date;
    });
  }

  formatRepositoryForTemplate(repo) {
    return {
      owner: repo.owner,
      name: repo.name,
      full_name: repo.full_name,
      url: repo.url,
      description: this.truncateDescription(repo.description || ''),
      stars: repo.stars.toLocaleString(),
      language: repo.primary_language || 'Unknown',
      topics: (repo.topics || []).slice(0, 5).join(', ') || 'No topics',
      license: repo.license || 'Unknown'
    };
  }

  truncateDescription(description, maxLength = 100) {
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength - 3) + '...';
  }

  getTrendingTopics(repositories) {
    const topicCounts = {};
    
    repositories.forEach(repo => {
      (repo.topics || []).forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }

  getLanguageStats(languageGroups, totalRepos) {
    return Object.entries(languageGroups)
      .sort(([,a], [,b]) => b.length - a.length)
      .map(([name, repos]) => ({
        name,
        count: repos.length,
        percentage: Math.round((repos.length / totalRepos) * 100)
      }));
  }

  getLanguageIcon(language) {
    const icons = {
      'Python': '🐍',
      'JavaScript': '⚛️',
      'TypeScript': '🔷',
      'Rust': '🦀',
      'Go': '🐹',
      'Java': '☕',
      'C++': '⚡',
      'C': '🔧',
      'C#': '🔷',
      'Ruby': '💎',
      'PHP': '🐘',
      'Swift': '🦉',
      'Kotlin': '📱',
      'Dart': '🎯',
      'Shell': '🐚',
      'HTML': '🌐',
      'CSS': '🎨'
    };
    
    return icons[language] || '📄';
  }

  getNavigationData(date) {
    const dateObj = parseISO(date);
    const prevDate = new Date(dateObj);
    prevDate.setDate(prevDate.getDate() - 1);
    
    const nextDate = new Date(dateObj);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const year = format(dateObj, 'yyyy');
    const month = format(dateObj, 'MM');
    
    return {
      prev_date: format(prevDate, 'yyyy-MM-dd'),
      prev_url: `${format(prevDate, 'yyyy-MM-dd')}.md`,
      next_date: format(nextDate, 'yyyy-MM-dd'),
      next_url: `${format(nextDate, 'yyyy-MM-dd')}.md`,
      archive_url: '../../',
      year,
      month
    };
  }

  formatDateForDisplay(date) {
    return format(parseISO(date), 'MMMM d, yyyy');
  }

  async writeReport(date, markdown) {
    const dateObj = parseISO(date);
    const year = format(dateObj, 'yyyy');
    const month = format(dateObj, 'MM');
    
    const reportPath = `archive/${year}/${month}/${date}.md`;
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    // Write report
    await fs.writeFile(reportPath, markdown);
    
    console.log(`💾 Generated report: ${reportPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const date = process.argv[2];
  
  if (!date) {
    console.error('Usage: node generate-reports.js <date>');
    console.error('Example: node generate-reports.js 2026-07-31');
    process.exit(1);
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('Error: Date must be in YYYY-MM-DD format');
    process.exit(1);
  }

  const generator = new ReportGenerator();
  
  generator.generateDailyReport(date)
    .then(() => {
      console.log(`\n🎉 Report generation completed for ${date}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Report generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = ReportGenerator;