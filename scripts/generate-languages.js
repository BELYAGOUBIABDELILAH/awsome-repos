#!/usr/bin/env node

/**
 * Generate Language Pages Script
 * 
 * Generates language-based aggregation pages.
 */

const fs = require('fs').promises;
const mustache = require('mustache');

class LanguageGenerator {
  constructor() {
    this.templateCache = {};
  }

  async generateAllLanguagePages() {
    console.log('💻 Generating language pages...');
    
    try {
      const repositoryIndex = await this.loadRepositoryIndex();
      const languages = this.extractLanguages(repositoryIndex);
      
      for (const language of languages) {
        await this.generateLanguagePage(language, repositoryIndex);
      }
      
      console.log(`✅ Generated ${languages.length} language pages`);
      
    } catch (error) {
      console.error(`❌ Language generation failed: ${error.message}`);
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

  extractLanguages(repositoryIndex) {
    const languages = new Set();
    
    Object.values(repositoryIndex.repositories).forEach(repo => {
      if (repo.latest_language && repo.latest_language !== 'Unknown') {
        languages.add(repo.latest_language);
      }
    });
    
    return Array.from(languages).sort();
  }

  async generateLanguagePage(language, repositoryIndex) {
    console.log(`  📄 Generating ${language.toLowerCase()}.md`);
    
    const languageRepos = Object.values(repositoryIndex.repositories)
      .filter(repo => repo.latest_language === language);
    
    if (languageRepos.length === 0) {
      console.log(`    ⚠️  No repositories found for ${language}, skipping`);
      return;
    }
    
    const templateData = this.prepareLanguageTemplateData(language, languageRepos);
    const template = await this.loadTemplate('language.md');
    const markdown = mustache.render(template, templateData);
    
    const outputPath = `languages/${language.toLowerCase()}.md`;
    await fs.writeFile(outputPath, markdown);
    
    console.log(`    ✅ Generated ${outputPath} (${languageRepos.length} repositories)`);
  }

  prepareLanguageTemplateData(language, repositories) {
    const today = new Date().toISOString().split('T')[0];
    
    const byStars = [...repositories].sort((a, b) => b.latest_stars - a.latest_stars);
    const byTrendingDays = [...repositories].sort((a, b) => b.trending_days - a.trending_days);
    const byFirstSeen = [...repositories].sort((a, b) => new Date(b.first_seen) - new Date(a.first_seen));
    
    const trendingToday = repositories.filter(repo => repo.last_seen === today);
    const newRepos = repositories.filter(repo => this.isWithinDays(repo.first_seen, 30));
    
    return {
      language_name: language,
      language_slug: language.toLowerCase(),
      
      total_count: repositories.length,
      first_date: repositories.length > 0 ? byFirstSeen[byFirstSeen.length - 1].first_seen : null,
      last_date: repositories.length > 0 ? byStars[0].last_seen : null,
      
      trending_today: trendingToday.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      new_repositories: newRepos.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      most_starred: byStars.slice(0, 20).map(repo => this.formatRepoForTemplate(repo)),
      most_frequent: byTrendingDays.slice(0, 10).map(repo => this.formatRepoForTemplate(repo)),
      
      all_repositories: repositories.slice(0, 100).map(repo => this.formatRepoForTemplate(repo)),
      
      last_updated: new Date().toISOString()
    };
  }

  formatRepoForTemplate(repo) {
    return {
      owner: repo.owner,
      name: repo.name,
      full_name: repo.full_name,
      description: this.truncateText(repo.latest_metadata?.description || '', 100),
      stars: repo.latest_stars.toLocaleString(),
      first_seen: repo.first_seen,
      last_seen: repo.last_seen,
      trending_count: repo.trending_days
    };
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
  const generator = new LanguageGenerator();
  
  generator.generateAllLanguagePages()
    .then(() => {
      console.log('\n🎉 Language page generation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Language generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = LanguageGenerator;