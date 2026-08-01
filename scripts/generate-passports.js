#!/usr/bin/env node

/**
 * Generate Repository Passports Script
 * 
 * Creates comprehensive repository passport pages with:
 * - Quick facts and metrics
 * - Best use cases
 * - Ecosystem integrations
 * - Trending timeline
 * - Embedded Developer Card
 */

const fs = require('fs').promises;
const path = require('path');
const mustache = require('mustache');

class PassportGenerator {
  constructor() {
    this.templateCache = {};
    this.ecosystemData = {};
  }

  async generateAllPassports() {
    console.log('🎫 Generating repository passports...');
    
    try {
      // Load ecosystem data
      await this.loadEcosystemData();
      
      // Load repository index
      const repositoryIndex = await this.loadRepositoryIndex();
      const repositories = Object.values(repositoryIndex.repositories);
      
      let generated = 0;
      for (const repo of repositories) {
        await this.generatePassport(repo);
        generated++;
      }
      
      console.log(`✅ Generated ${generated} passports`);
      
    } catch (error) {
      console.error(`❌ Passport generation failed: ${error.message}`);
      throw error;
    }
  }

  async loadEcosystemData() {
    try {
      const worksWithContent = await fs.readFile('data/ecosystem/works-with.json', 'utf8');
      this.ecosystemData.worksWith = JSON.parse(worksWithContent);
      
      const alternativesContent = await fs.readFile('data/ecosystem/alternatives.json', 'utf8');
      this.ecosystemData.alternatives = JSON.parse(alternativesContent);
      
      const useCasesContent = await fs.readFile('data/ecosystem/use-cases.json', 'utf8');
      this.ecosystemData.useCases = JSON.parse(useCasesContent);
      
      console.log('   📊 Loaded ecosystem data');
    } catch (error) {
      console.warn('   ⚠️  Could not load ecosystem data:', error.message);
      this.ecosystemData = { worksWith: {mappings: {}}, alternatives: {mappings: {}}, useCases: {mappings: {}} };
    }
  }

  async loadRepositoryIndex() {
    const content = await fs.readFile('data/index/repositories.json', 'utf8');
    return JSON.parse(content);
  }

  async generatePassport(repo) {
    const outputPath = `repos/${repo.owner}/${repo.name}.md`;
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Prepare template data
    const templateData = await this.preparePassportData(repo);
    
    // Load and render template
    const template = await this.loadTemplate('passport.md');
    const markdown = mustache.render(template, templateData);
    
    // Write passport
    await fs.writeFile(outputPath, markdown);
    
    if (Math.random() < 0.15) {
      console.log(`  🎫 Generated ${outputPath}`);
    }
  }

  async preparePassportData(repo) {
    const metadata = repo.latest_metadata || {};
    const fullName = repo.full_name;
    
    // Get ecosystem data
    const worksWith = this.ecosystemData.worksWith.mappings[fullName]?.works_with || [];
    const alternatives = this.getAlternatives(fullName);
    const useCases = this.ecosystemData.useCases.mappings[fullName] || {};
    
    // Calculate metrics
    const peakRank = this.calculatePeakRank(repo);
    const longestStreak = this.calculateLongestStreak(repo);
    
    // Generate timeline
    const timeline = this.generateTimeline(repo);
    
    // Generate Developer Card
    const developerCard = await this.generateDeveloperCard(repo);
    
    // Get categories
    const categories = await this.getCuratedCategories(repo);
    
    return {
      full_name: repo.full_name,
      owner: repo.owner,
      name: repo.name,
      description: metadata.description || 'No description available',
      url: metadata.url || `https://github.com/${repo.full_name}`,
      homepage: metadata.homepage || null,
      
      // Quick facts
      language: repo.latest_language || 'Unknown',
      license: metadata.license || 'Not specified',
      stars: repo.latest_stars.toLocaleString(),
      forks: (metadata.forks || 0).toLocaleString(),
      trending_days: repo.trending_days,
      peak_rank: peakRank,
      current_rank: null, // Would need current trending data
      first_seen: this.formatDate(repo.first_seen),
      last_seen: this.formatDate(repo.last_seen),
      latest_release: null, // Not tracked yet
      
      // Best for
      best_for: useCases.best_for || [],
      
      // Ecosystem
      works_with: worksWith.map(fullName => ({
        name: fullName,
        slug: this.toSlug(fullName)
      })),
      
      // Alternatives
      alternatives: alternatives.map(alt => ({
        name: alt.full_name,
        slug: this.toSlug(alt.full_name),
        note: alt.note
      })),
      
      primary_topic: repo.latest_topics && repo.latest_topics[0] ? repo.latest_topics[0] : 'similar-topics',
      
      // Timeline
      timeline: timeline,
      longest_streak: longestStreak,
      
      // Topics and categories
      topics: (repo.latest_topics || []).map(topic => ({
        name: topic,
        slug: this.slugify(topic)
      })),
      categories: categories,
      
      // Developer Card (embedded)
      developer_card: developerCard,
      
      // Metadata
      last_updated: new Date().toISOString(),
      data_points: repo.trending_days
    };
  }

  getAlternatives(fullName) {
    const altData = this.ecosystemData.alternatives.mappings[fullName];
    if (!altData || !altData.alternatives || altData.alternatives.length === 0) {
      return [];
    }
    
    return altData.alternatives.map(altFullName => ({
      full_name: altFullName,
      note: altData.note || ''
    }));
  }

  calculatePeakRank(repo) {
    if (!repo.appearances_history || repo.appearances_history.length === 0) {
      return 'N/A';
    }
    
    const overallRanks = repo.appearances_history
      .filter(app => app.source_type === 'overall')
      .map(app => app.rank);
    
    return overallRanks.length > 0 ? Math.min(...overallRanks) : 'N/A';
  }

  calculateLongestStreak(repo) {
    if (!repo.appearance_dates || repo.appearance_dates.length === 0) {
      return 0;
    }
    
    const dates = repo.appearance_dates.map(d => new Date(d)).sort((a, b) => a - b);
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.round((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return longestStreak;
  }

  generateTimeline(repo) {
    if (!repo.appearances_history || repo.appearances_history.length === 0) {
      return [];
    }
    
    // Get overall appearances with dates
    const appearances = repo.appearances_history
      .filter(app => app.source_type === 'overall' && app.date)
      .slice(-10); // Last 10 appearances
    
    return appearances.map(app => ({
      date: this.formatDate(app.date),
      rank: app.rank,
      stars_gained: app.stars_gained
    }));
  }

  async generateDeveloperCard(repo) {
    const metadata = repo.latest_metadata || {};
    const fullName = repo.full_name;
    
    // Calculate ratings based on available data
    const difficulty = this.assessDifficulty(repo);
    const documentation = this.assessDocumentation(repo);
    const community = this.assessCommunity(repo);
    const maturity = this.assessMaturity(repo);
    const maintenance = this.assessMaintenance(repo);
    const learningCurve = this.assessLearningCurve(repo);
    
    // Get use cases
    const useCases = this.ecosystemData.useCases.mappings[fullName]?.use_cases || ['General purpose'];
    
    // Get works with
    const worksWith = this.ecosystemData.worksWith.mappings[fullName]?.works_with || [];
    
    // Get alternatives
    const alternatives = this.getAlternatives(fullName).map(alt => alt.full_name);
    
    // Check if hidden gem
    const isHiddenGem = await this.isHiddenGem(repo);
    
    // Calculate scores
    const trendingScore = Math.min(Math.round(repo.trending_days * 15 + (repo.current_consecutive_days * 5)), 100);
    const historicalPerformance = this.getHistoricalPerformance(repo);
    
    const cardData = {
      difficulty: difficulty.rating,
      difficulty_note: difficulty.note,
      documentation: documentation.rating,
      documentation_note: documentation.note,
      community: community.rating,
      community_note: community.note,
      maturity: maturity.rating,
      maturity_note: maturity.note,
      maintenance: maintenance.rating,
      maintenance_note: maintenance.note,
      learning_curve: learningCurve.rating,
      learning_curve_note: learningCurve.note,
      use_cases: useCases,
      works_with: worksWith,
      alternatives: alternatives.length > 0 ? alternatives : ['Check similar projects in ' + (repo.latest_language || 'this category')],
      is_hidden_gem: isHiddenGem,
      trending_score: trendingScore,
      historical_performance: historicalPerformance
    };
    
    const template = await this.loadTemplate('developer-card.md');
    return mustache.render(template, cardData);
  }

  assessDifficulty(repo) {
    const stars = repo.latest_stars;
    const language = repo.latest_language || '';
    
    // Low-level languages are typically harder
    if (['Rust', 'C', 'C++', 'Assembly'].includes(language)) {
      return { rating: 'Advanced', note: 'Requires systems programming knowledge' };
    }
    
    // Frameworks with large ecosystems
    if (stars > 50000) {
      return { rating: 'Intermediate', note: 'Well-documented but extensive API' };
    }
    
    return { rating: 'Beginner', note: 'Approachable with good examples' };
  }

  assessDocumentation(repo) {
    const topics = repo.latest_topics || [];
    const stars = repo.latest_stars;
    
    // Popular projects typically have better docs
    if (stars > 100000) {
      return { rating: 'Excellent', note: 'Comprehensive guides and examples' };
    } else if (stars > 50000) {
      return { rating: 'Good', note: 'Well-maintained documentation' };
    } else if (stars > 10000) {
      return { rating: 'Average', note: 'Basic documentation available' };
    }
    
    return { rating: 'Limited', note: 'May require reading source code' };
  }

  assessCommunity(repo) {
    const stars = repo.latest_stars;
    const forks = repo.latest_metadata?.forks || 0;
    const topics = repo.latest_topics || [];
    
    const forkRatio = stars > 0 ? forks / stars : 0;
    
    if (stars > 100000 || forkRatio > 0.3) {
      return { rating: 'Very Active', note: `${stars.toLocaleString()}+ stars, strong contributor base` };
    } else if (stars > 50000 || forkRatio > 0.2) {
      return { rating: 'Active', note: 'Regular contributions and discussions' };
    } else if (stars > 10000) {
      return { rating: 'Growing', note: 'Emerging community' };
    }
    
    return { rating: 'Small', note: 'Niche but dedicated community' };
  }

  assessMaturity(repo) {
    const metadata = repo.latest_metadata || {};
    const createdAt = metadata.created_at ? new Date(metadata.created_at) : null;
    const stars = repo.latest_stars;
    
    if (createdAt) {
      const ageYears = (new Date() - createdAt) / (1000 * 60 * 60 * 24 * 365);
      
      if (ageYears > 5 && stars > 50000) {
        return { rating: 'Production Ready', note: 'Battle-tested and stable' };
      } else if (ageYears > 2 && stars > 10000) {
        return { rating: 'Stable', note: 'Mature with proven track record' };
      } else if (ageYears < 1) {
        return { rating: 'Experimental', note: 'New project, evolving rapidly' };
      }
    }
    
    return { rating: 'Stable', note: 'Established project' };
  }

  assessMaintenance(repo) {
    const metadata = repo.latest_metadata || {};
    const pushedAt = metadata.pushed_at ? new Date(metadata.pushed_at) : null;
    
    if (pushedAt) {
      const daysSinceUpdate = (new Date() - pushedAt) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) {
        return { rating: 'Very Active', note: 'Updated within last week' };
      } else if (daysSinceUpdate < 30) {
        return { rating: 'Active', note: 'Regular updates' };
      } else if (daysSinceUpdate < 180) {
        return { rating: 'Slow', note: 'Occasional updates' };
      }
      
      return { rating: 'Inactive', note: 'No recent updates' };
    }
    
    return { rating: 'Unknown', note: 'Update frequency unavailable' };
  }

  assessLearningCurve(repo) {
    const language = repo.latest_language || '';
    const stars = repo.latest_stars;
    const topics = repo.latest_topics || [];
    
    // Check for complexity indicators
    const complexTopics = ['compiler', 'kernel', 'cryptography', 'blockchain', 'systems-programming'];
    const isComplex = topics.some(t => complexTopics.includes(t));
    
    if (isComplex || ['Rust', 'C++', 'Assembly'].includes(language)) {
      return { rating: 'Hard', note: 'Requires domain expertise' };
    } else if (['Go', 'TypeScript', 'Python'].includes(language) && stars > 50000) {
      return { rating: 'Easy', note: 'Beginner-friendly with tutorials' };
    }
    
    return { rating: 'Medium', note: 'Moderate learning investment' };
  }

  async isHiddenGem(repo) {
    try {
      const configContent = await fs.readFile('config/hidden-gems.json', 'utf8');
      const config = JSON.parse(configContent);
      const thresholds = config.thresholds;
      
      return repo.latest_stars < thresholds.maximum_stars &&
             repo.latest_stars >= thresholds.minimum_stars &&
             repo.trending_days >= thresholds.minimum_trending_days;
    } catch (error) {
      return false;
    }
  }

  getHistoricalPerformance(repo) {
    const peakRank = this.calculatePeakRank(repo);
    if (peakRank === 'N/A') return 'No ranking data';
    
    if (peakRank === 1) return 'Reached #1';
    if (peakRank <= 5) return `Top 5 (Peak: #${peakRank})`;
    if (peakRank <= 10) return `Top 10 (Peak: #${peakRank})`;
    return `Peak: #${peakRank}`;
  }

  async getCuratedCategories(repo) {
    try {
      const categoriesContent = await fs.readFile('config/categories.json', 'utf8');
      const categoriesData = JSON.parse(categoriesContent);
      const categories = categoriesData.categories;
      
      const repoTopics = repo.latest_topics || [];
      const matchedCategories = [];
      
      for (const [key, category] of Object.entries(categories)) {
        const aliases = category.aliases || [];
        const hasMatch = repoTopics.some(topic => 
          aliases.some(alias => topic.toLowerCase().includes(alias.toLowerCase()))
        );
        
        if (hasMatch && !matchedCategories.includes(category.name)) {
          matchedCategories.push(category.name);
        }
      }
      
      return matchedCategories.length > 0 ? matchedCategories : ['General'];
    } catch (error) {
      return ['General'];
    }
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  toSlug(fullName) {
    return fullName.replace('/', '/');
  }

  async loadTemplate(templateName) {
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }
    
    const templatePath = `templates/${templateName}`;
    const template = await fs.readFile(templatePath, 'utf8');
    this.templateCache[templateName] = template;
    return template;
  }
}

// CLI usage
if (require.main === module) {
  const generator = new PassportGenerator();
  
  generator.generateAllPassports()
    .then(() => {
      console.log('\n🎉 Passport generation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Passport generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = PassportGenerator;
