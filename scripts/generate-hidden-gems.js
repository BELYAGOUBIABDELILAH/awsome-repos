#!/usr/bin/env node

/**
 * Generate Hidden Gems Script
 * 
 * Identifies and highlights repositories with:
 * - Low star count but high quality
 * - Recent growth momentum
 * - Active maintenance
 * - Community engagement
 */

const fs = require('fs').promises;
const path = require('path');
const mustache = require('mustache');
const { parseISO, format, startOfMonth, endOfMonth, startOfYear, endOfYear } = require('date-fns');

class HiddenGemsGenerator {
  constructor() {
    this.config = null;
    this.ecosystemData = {};
  }

  async generateAll() {
    console.log('💎 Generating hidden gems...');
    
    try {
      // Load configuration
      await this.loadConfig();
      
      // Load ecosystem data
      await this.loadEcosystemData();
      
      // Load repository index
      const repositoryIndex = await this.loadRepositoryIndex();
      const repositories = Object.values(repositoryIndex.repositories);
      
      // Identify and score hidden gems
      const hiddenGems = await this.identifyHiddenGems(repositories);
      
      console.log(`   💎 Found ${hiddenGems.length} hidden gems`);
      
      if (hiddenGems.length === 0) {
        console.log('   ℹ️  No repositories met hidden gem criteria');
        return;
      }
      
      // Generate monthly reports
      await this.generateMonthlyReports(hiddenGems);
      
      // Generate yearly reports
      await this.generateYearlyReports(hiddenGems);
      
      // Generate global index
      await this.generateGlobalIndex(hiddenGems);
      
      console.log(`✅ Hidden gems generation complete`);
      
    } catch (error) {
      console.error(`❌ Hidden gems generation failed: ${error.message}`);
      throw error;
    }
  }

  async loadConfig() {
    const content = await fs.readFile('config/hidden-gems.json', 'utf8');
    this.config = JSON.parse(content);
    console.log('   ⚙️  Loaded configuration');
  }

  async loadEcosystemData() {
    try {
      const useCasesContent = await fs.readFile('data/ecosystem/use-cases.json', 'utf8');
      this.ecosystemData.useCases = JSON.parse(useCasesContent);
    } catch (error) {
      this.ecosystemData.useCases = { mappings: {} };
    }
  }

  async loadRepositoryIndex() {
    const content = await fs.readFile('data/index/repositories.json', 'utf8');
    return JSON.parse(content);
  }

  async identifyHiddenGems(repositories) {
    const thresholds = this.config.thresholds;
    const weights = this.config.scoring_weights;
    
    const candidates = repositories.filter(repo => {
      // Apply threshold filters
      if (repo.latest_stars > thresholds.maximum_stars) return false;
      if (repo.latest_stars < thresholds.minimum_stars) return false;
      if (repo.trending_days < thresholds.minimum_trending_days) return false;
      
      // Check age
      const metadata = repo.latest_metadata || {};
      if (metadata.created_at) {
        const ageMonths = this.getAgeInMonths(metadata.created_at);
        if (ageMonths > thresholds.maximum_age_months) return false;
      }
      
      // Check recent activity
      if (metadata.pushed_at) {
        const daysSinceCommit = this.getDaysSince(metadata.pushed_at);
        if (daysSinceCommit > thresholds.recent_commit_window_days) return false;
      }
      
      return true;
    });
    
    // Score each candidate
    const scored = candidates.map(repo => {
      const score = this.calculateGemScore(repo, thresholds, weights);
      return {
        ...repo,
        gem_score: score.total,
        gem_breakdown: score.breakdown,
        gem_reason: this.generateGemReason(repo, score)
      };
    });
    
    // Filter by minimum activity score and sort by gem score
    return scored
      .filter(gem => gem.gem_score >= thresholds.minimum_activity_score)
      .sort((a, b) => b.gem_score - a.gem_score);
  }

  calculateGemScore(repo, thresholds, weights) {
    const breakdown = {};
    
    // 1. Low Popularity Score (inverse of stars)
    breakdown.low_popularity = Math.min(100, 
      ((thresholds.maximum_stars - repo.latest_stars) / thresholds.maximum_stars) * 100
    );
    
    // 2. Recent Growth Score
    const growthRate = this.calculateGrowthRate(repo);
    breakdown.recent_growth = Math.min(100, 
      (growthRate / thresholds.minimum_growth_rate) * 100
    );
    
    // 3. Trending Score
    breakdown.trending_appearances = Math.min(100, 
      repo.trending_days * 20
    );
    
    // 4. Repository Activity Score
    breakdown.repository_activity = this.calculateActivityScore(repo, thresholds);
    
    // 5. Contributor Score (estimate)
    breakdown.contributor_count = this.estimateContributorScore(repo);
    
    // 6. Community Engagement Score
    breakdown.community_engagement = this.calculateEngagementScore(repo);
    
    // Calculate weighted total
    const total = 
      (breakdown.low_popularity * weights.low_popularity) +
      (breakdown.recent_growth * weights.recent_growth) +
      (breakdown.trending_appearances * weights.trending_appearances) +
      (breakdown.repository_activity * weights.repository_activity) +
      (breakdown.contributor_count * weights.contributor_count) +
      (breakdown.community_engagement * weights.community_engagement);
    
    return {
      total: Math.round(total),
      breakdown
    };
  }

  calculateGrowthRate(repo) {
    if (repo.trending_days === 0) return 0;
    
    // Estimate daily growth based on trending appearances
    const totalStarsGained = repo.appearances_history
      ? repo.appearances_history.reduce((sum, app) => sum + (app.stars_gained || 0), 0)
      : 0;
    
    return repo.trending_days > 0 ? totalStarsGained / repo.trending_days : 0;
  }

  calculateActivityScore(repo, thresholds) {
    const metadata = repo.latest_metadata || {};
    if (!metadata.pushed_at) return 50; // Default middle score
    
    const daysSinceCommit = this.getDaysSince(metadata.pushed_at);
    const windowDays = thresholds.recent_commit_window_days;
    
    // Score based on recency (100 for today, 0 at window edge)
    const score = Math.max(0, 100 - (daysSinceCommit / windowDays) * 100);
    
    return Math.round(score);
  }

  estimateContributorScore(repo) {
    const metadata = repo.latest_metadata || {};
    const forks = metadata.forks || 0;
    const topics = repo.latest_topics || [];
    
    // Rough estimate: more forks and topics = more contributors
    const forkScore = Math.min(50, forks * 2);
    const topicScore = Math.min(50, topics.length * 10);
    
    return Math.round(forkScore + topicScore);
  }

  calculateEngagementScore(repo) {
    const metadata = repo.latest_metadata || {};
    const stars = repo.latest_stars;
    const forks = metadata.forks || 0;
    const topics = repo.latest_topics || [];
    
    // Fork-to-star ratio (higher = more engagement)
    const forkRatio = stars > 0 ? (forks / stars) * 100 : 0;
    const forkScore = Math.min(60, forkRatio * 200);
    
    // Topic diversity
    const topicScore = Math.min(40, topics.length * 8);
    
    return Math.round(forkScore + topicScore);
  }

  generateGemReason(repo, score) {
    const reasons = [];
    const breakdown = score.breakdown;
    
    // Highlight top scoring factors
    if (breakdown.recent_growth > 70) {
      const growthRate = this.calculateGrowthRate(repo);
      reasons.push(`High growth velocity (+${Math.round(growthRate)} stars/day)`);
    }
    
    if (breakdown.trending_appearances > 60) {
      reasons.push(`Trending ${repo.trending_days} times`);
    }
    
    if (breakdown.repository_activity > 80) {
      reasons.push(`Very active development`);
    }
    
    if (breakdown.community_engagement > 70) {
      reasons.push(`Strong community engagement`);
    }
    
    if (repo.latest_stars < 5000) {
      reasons.push(`Underrated project`);
    }
    
    return reasons.length > 0 ? reasons.join(' • ') : 'Emerging project with potential';
  }

  async generateMonthlyReports(hiddenGems) {
    // Group by year-month
    const byMonth = this.groupByMonth(hiddenGems);
    
    for (const [yearMonth, gems] of Object.entries(byMonth)) {
      const [year, month] = yearMonth.split('-');
      await this.generateMonthlyReport(year, month, gems);
    }
  }

  groupByMonth(hiddenGems) {
    const grouped = {};
    
    for (const gem of hiddenGems) {
      const date = parseISO(gem.last_seen);
      const yearMonth = format(date, 'yyyy-MM');
      
      if (!grouped[yearMonth]) {
        grouped[yearMonth] = [];
      }
      grouped[yearMonth].push(gem);
    }
    
    return grouped;
  }

  async generateMonthlyReport(year, month, gems) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month) - 1];
    
    const outputPath = `hidden-gems/${year}/${monthName.toLowerCase()}.md`;
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const templateData = {
      period_name: `${monthName} ${year}`,
      period_start: `${year}-${month}-01`,
      period_end: `${year}-${month}-28`, // Simplified
      gem_count: gems.length,
      gems: gems.slice(0, 20).map((gem, index) => this.prepareGemData(gem, index + 1)),
      max_stars: this.config.thresholds.maximum_stars.toLocaleString(),
      min_stars: this.config.thresholds.minimum_stars,
      min_trending_days: this.config.thresholds.minimum_trending_days,
      commit_window: this.config.thresholds.recent_commit_window_days,
      generated_at: new Date().toISOString()
    };
    
    const template = await this.loadTemplate('hidden-gem.md');
    const markdown = mustache.render(template, templateData);
    
    await fs.writeFile(outputPath, markdown);
    console.log(`  📄 Generated ${outputPath}`);
  }

  async generateYearlyReports(hiddenGems) {
    const byYear = this.groupByYear(hiddenGems);
    
    for (const [year, gems] of Object.entries(byYear)) {
      await this.generateYearlyReport(year, gems);
    }
  }

  groupByYear(hiddenGems) {
    const grouped = {};
    
    for (const gem of hiddenGems) {
      const date = parseISO(gem.last_seen);
      const year = format(date, 'yyyy');
      
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(gem);
    }
    
    return grouped;
  }

  async generateYearlyReport(year, gems) {
    const outputPath = `hidden-gems/${year}/README.md`;
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const templateData = {
      period_name: year,
      period_start: `${year}-01-01`,
      period_end: `${year}-12-31`,
      gem_count: gems.length,
      gems: gems.slice(0, 50).map((gem, index) => this.prepareGemData(gem, index + 1)),
      max_stars: this.config.thresholds.maximum_stars.toLocaleString(),
      min_stars: this.config.thresholds.minimum_stars,
      min_trending_days: this.config.thresholds.minimum_trending_days,
      commit_window: this.config.thresholds.recent_commit_window_days,
      generated_at: new Date().toISOString()
    };
    
    const template = await this.loadTemplate('hidden-gem.md');
    const markdown = mustache.render(template, templateData);
    
    await fs.writeFile(outputPath, markdown);
    console.log(`  📄 Generated ${outputPath}`);
  }

  async generateGlobalIndex(hiddenGems) {
    const outputPath = 'hidden-gems/README.md';
    await fs.mkdir('hidden-gems', { recursive: true });
    
    // Get top 30 gems overall
    const topGems = hiddenGems.slice(0, 30);
    
    const templateData = {
      period_name: 'All Time',
      period_start: 'Beginning',
      period_end: 'Present',
      gem_count: hiddenGems.length,
      gems: topGems.map((gem, index) => this.prepareGemData(gem, index + 1)),
      max_stars: this.config.thresholds.maximum_stars.toLocaleString(),
      min_stars: this.config.thresholds.minimum_stars,
      min_trending_days: this.config.thresholds.minimum_trending_days,
      commit_window: this.config.thresholds.recent_commit_window_days,
      generated_at: new Date().toISOString()
    };
    
    const template = await this.loadTemplate('hidden-gem.md');
    const markdown = mustache.render(template, templateData);
    
    await fs.writeFile(outputPath, markdown);
    console.log(`  📄 Generated ${outputPath}`);
  }

  prepareGemData(gem, rank) {
    const useCases = this.ecosystemData.useCases.mappings[gem.full_name]?.best_for || [];
    
    return {
      rank,
      full_name: gem.full_name,
      owner: gem.owner,
      name: gem.name,
      description: gem.latest_metadata?.description || 'No description',
      stars: gem.latest_stars.toLocaleString(),
      language: gem.latest_language || 'Unknown',
      gem_score: gem.gem_score,
      trending_days: gem.trending_days,
      first_seen: this.formatDate(gem.first_seen),
      gem_reason: gem.gem_reason,
      best_for: useCases.slice(0, 5),
      url: gem.latest_metadata?.url || `https://github.com/${gem.full_name}`
    };
  }

  getAgeInMonths(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    return (now - created) / (1000 * 60 * 60 * 24 * 30);
  }

  getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return (now - date) / (1000 * 60 * 60 * 24);
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  async loadTemplate(templateName) {
    const templatePath = `templates/${templateName}`;
    return await fs.readFile(templatePath, 'utf8');
  }
}

// CLI usage
if (require.main === module) {
  const generator = new HiddenGemsGenerator();
  
  generator.generateAll()
    .then(() => {
      console.log('\n🎉 Hidden gems generation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Hidden gems generation failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = HiddenGemsGenerator;
