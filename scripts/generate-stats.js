#!/usr/bin/env node

/**
 * Generate Statistics Script
 * 
 * Generates comprehensive statistics from the repository index.
 */

const fs = require('fs').promises;

class StatsGenerator {
  async generateAllStatistics() {
    console.log('📊 Generating statistics...');
    
    try {
      const repositoryIndex = await this.loadRepositoryIndex();
      const repositories = Object.values(repositoryIndex.repositories);
      
      // Generate different statistics files
      await this.generateOverviewStats(repositories);
      await this.generateTopStarredStats(repositories);
      await this.generateMostFrequentStats(repositories);
      await this.generateFastestGrowingStats(repositories);
      await this.generateLanguageStats(repositories);
      await this.generateTopicStats(repositories);
      
      console.log('✅ Generated all statistics files');
      
    } catch (error) {
      console.error(`❌ Statistics generation failed: ${error.message}`);
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

  async generateOverviewStats(repositories) {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate basic metrics
    const totalRepos = repositories.length;
    const trendingToday = repositories.filter(repo => repo.last_seen === today).length;
    const newRepos = repositories.filter(repo => this.isWithinDays(repo.first_seen, 30)).length;
    
    // Find extremes
    const mostStarred = repositories.reduce((max, repo) => 
      repo.latest_stars > max.latest_stars ? repo : max, repositories[0] || {latest_stars: 0});
    
    const mostFrequent = repositories.reduce((max, repo) => 
      repo.trending_days > max.trending_days ? repo : max, repositories[0] || {trending_days: 0});
    
    const newest = repositories.reduce((newest, repo) => 
      new Date(repo.first_seen) > new Date(newest.first_seen) ? repo : newest, repositories[0] || {first_seen: '1970-01-01'});
    
    // Calculate growth metrics
    const fastestGrowing = this.calculateFastestGrowing(repositories);
    
    const overview = {
      generated_at: new Date().toISOString(),
      total_repositories: totalRepos,
      trending_today: trendingToday,
      new_this_month: newRepos,
      
      // Date ranges
      first_collection: repositories.length > 0 ? 
        repositories.reduce((min, repo) => repo.first_seen < min ? repo.first_seen : min, repositories[0].first_seen) : null,
      last_collection: today,
      
      // Top performers
      most_starred: {
        full_name: mostStarred.full_name || 'N/A',
        stars: mostStarred.latest_stars || 0,
        first_seen: mostStarred.first_seen || 'N/A'
      },
      
      most_frequent: {
        full_name: mostFrequent.full_name || 'N/A',
        trending_days: mostFrequent.trending_days || 0,
        first_seen: mostFrequent.first_seen || 'N/A'
      },
      
      newest_discovery: {
        full_name: newest.full_name || 'N/A',
        stars: newest.latest_stars || 0,
        first_seen: newest.first_seen || 'N/A'
      },
      
      fastest_growing: fastestGrowing,
      
      // Aggregate stats
      total_stars: repositories.reduce((sum, repo) => sum + repo.latest_stars, 0),
      avg_stars: totalRepos > 0 ? Math.round(repositories.reduce((sum, repo) => sum + repo.latest_stars, 0) / totalRepos) : 0,
      avg_trending_days: totalRepos > 0 ? Math.round(repositories.reduce((sum, repo) => sum + repo.trending_days, 0) / totalRepos * 10) / 10 : 0,
      
      // Language breakdown
      language_count: this.getUniqueCount(repositories, 'latest_language'),
      
      // Topic breakdown  
      topic_count: this.getUniqueTopicCount(repositories),
      
      // Collection health
      collection_success_rate: 100, // Assume 100% for now
      data_quality_score: this.calculateDataQuality(repositories)
    };
    
    await fs.writeFile('stats/overview.json', JSON.stringify(overview, null, 2));
    console.log('  📊 Generated overview.json');
  }

  async generateTopStarredStats(repositories) {
    const topStarred = repositories
      .sort((a, b) => b.latest_stars - a.latest_stars)
      .slice(0, 100)
      .map((repo, index) => ({
        rank: index + 1,
        full_name: repo.full_name,
        owner: repo.owner,
        name: repo.name,
        stars: repo.latest_stars,
        language: repo.latest_language || 'Unknown',
        first_seen: repo.first_seen,
        trending_days: repo.trending_days
      }));
    
    const stats = {
      generated_at: new Date().toISOString(),
      total_count: topStarred.length,
      repositories: topStarred
    };
    
    await fs.writeFile('stats/top-starred.json', JSON.stringify(stats, null, 2));
    console.log('  ⭐ Generated top-starred.json');
  }

  async generateMostFrequentStats(repositories) {
    const mostFrequent = repositories
      .sort((a, b) => b.trending_days - a.trending_days)
      .slice(0, 100)
      .map((repo, index) => ({
        rank: index + 1,
        full_name: repo.full_name,
        owner: repo.owner,
        name: repo.name,
        trending_days: repo.trending_days,
        stars: repo.latest_stars,
        language: repo.latest_language || 'Unknown',
        first_seen: repo.first_seen,
        last_seen: repo.last_seen,
        current_streak: repo.current_consecutive_days
      }));
    
    const stats = {
      generated_at: new Date().toISOString(),
      total_count: mostFrequent.length,
      repositories: mostFrequent
    };
    
    await fs.writeFile('stats/most-frequent.json', JSON.stringify(stats, null, 2));
    console.log('  🔥 Generated most-frequent.json');
  }

  async generateFastestGrowingStats(repositories) {
    const fastestGrowing = this.calculateFastestGrowingList(repositories)
      .slice(0, 100)
      .map((repo, index) => ({
        rank: index + 1,
        full_name: repo.full_name,
        owner: repo.owner,
        name: repo.name,
        stars: repo.latest_stars,
        estimated_initial_stars: repo.estimated_initial_stars,
        growth: repo.growth,
        growth_rate: repo.growth_rate,
        language: repo.latest_language || 'Unknown',
        first_seen: repo.first_seen,
        trending_days: repo.trending_days
      }));
    
    const stats = {
      generated_at: new Date().toISOString(),
      total_count: fastestGrowing.length,
      repositories: fastestGrowing
    };
    
    await fs.writeFile('stats/fastest-growing.json', JSON.stringify(stats, null, 2));
    console.log('  🚀 Generated fastest-growing.json');
  }

  async generateLanguageStats(repositories) {
    const languageCounts = {};
    const languageStars = {};
    
    repositories.forEach(repo => {
      const lang = repo.latest_language || 'Unknown';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      languageStars[lang] = (languageStars[lang] || 0) + repo.latest_stars;
    });
    
    const languageStats = Object.entries(languageCounts)
      .map(([language, count]) => ({
        language,
        repository_count: count,
        total_stars: languageStars[language],
        avg_stars: Math.round(languageStars[language] / count),
        percentage: Math.round((count / repositories.length) * 100 * 10) / 10
      }))
      .sort((a, b) => b.repository_count - a.repository_count);
    
    const stats = {
      generated_at: new Date().toISOString(),
      total_languages: languageStats.length,
      languages: languageStats
    };
    
    await fs.writeFile('stats/languages.json', JSON.stringify(stats, null, 2));
    console.log('  💻 Generated languages.json');
  }

  async generateTopicStats(repositories) {
    const topicCounts = {};
    
    repositories.forEach(repo => {
      (repo.latest_topics || []).forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    const topicStats = Object.entries(topicCounts)
      .map(([topic, count]) => ({
        topic,
        repository_count: count,
        percentage: Math.round((count / repositories.length) * 100 * 10) / 10
      }))
      .sort((a, b) => b.repository_count - a.repository_count)
      .slice(0, 100); // Top 100 topics
    
    const stats = {
      generated_at: new Date().toISOString(),
      total_topics: topicStats.length,
      topics: topicStats
    };
    
    await fs.writeFile('stats/topics.json', JSON.stringify(stats, null, 2));
    console.log('  🏷️ Generated topics.json');
  }

  calculateFastestGrowing(repositories) {
    const growing = this.calculateFastestGrowingList(repositories);
    
    if (growing.length === 0) {
      return {
        full_name: 'N/A',
        growth: 0,
        growth_rate: 0,
        first_seen: 'N/A'
      };
    }
    
    const fastest = growing[0];
    return {
      full_name: fastest.full_name,
      growth: fastest.growth,
      growth_rate: fastest.growth_rate,
      first_seen: fastest.first_seen
    };
  }

  calculateFastestGrowingList(repositories) {
    return repositories
      .map(repo => {
        const daysSinceFirst = this.daysBetween(repo.first_seen, repo.last_seen) || 1;
        const estimatedInitialStars = Math.max(0, repo.latest_stars - (repo.trending_days * 50));
        const growth = repo.latest_stars - estimatedInitialStars;
        const growthRate = growth / daysSinceFirst;
        
        return {
          ...repo,
          estimated_initial_stars: estimatedInitialStars,
          growth,
          growth_rate: growthRate
        };
      })
      .filter(repo => repo.growth > 0)
      .sort((a, b) => b.growth_rate - a.growth_rate);
  }

  getUniqueCount(repositories, field) {
    return new Set(repositories.map(repo => repo[field]).filter(Boolean)).size;
  }

  getUniqueTopicCount(repositories) {
    const allTopics = new Set();
    repositories.forEach(repo => {
      (repo.latest_topics || []).forEach(topic => allTopics.add(topic));
    });
    return allTopics.size;
  }

  calculateDataQuality(repositories) {
    if (repositories.length === 0) return 100;
    
    let qualityScore = 0;
    let checks = 0;
    
    repositories.forEach(repo => {
      checks += 5; // 5 checks per repo
      
      // Check for required fields
      if (repo.full_name) qualityScore++;
      if (repo.latest_stars >= 0) qualityScore++;
      if (repo.first_seen) qualityScore++;
      if (repo.latest_language) qualityScore++;
      if (repo.latest_metadata?.description) qualityScore++;
    });
    
    return Math.round((qualityScore / checks) * 100);
  }

  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isWithinDays(dateStr, days) {
    const date = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date > cutoff;
  }
}

// CLI usage
if (require.main === module) {
  const generator = new StatsGenerator();
  
  generator.generateAllStatistics()
    .then(() => {
      console.log('\n🎉 Statistics generation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Statistics generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = StatsGenerator;