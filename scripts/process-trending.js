#!/usr/bin/env node

/**
 * Process Trending Data Script
 * 
 * Takes validated incoming data and processes it into the permanent archive:
 * 1. Creates snapshot in data/snapshots/
 * 2. Updates repository index in data/index/
 * 3. Maintains historical tracking
 */

const fs = require('fs').promises;
const path = require('path');
const { format, parseISO } = require('date-fns');
const DeduplicationUtil = require('./utils/deduplication');
const TopicIndexer = require('./utils/topic-indexer');

class TrendingProcessor {
  constructor() {
    this.force = false;
    this.topicIndexer = new TopicIndexer();
  }

  async processFile(incomingPath, options = {}) {
    this.force = options.force || false;
    
    console.log(`🔄 Processing ${incomingPath}${this.force ? ' (force mode)' : ''}`);
    
    try {
      // Read and validate incoming data
      const incomingData = await this.loadIncomingData(incomingPath);
      
      // Deduplicate repositories within incoming data
      const deduplicatedRepos = DeduplicationUtil.mergeRepositories(incomingData.repositories);
      console.log(`   📊 Deduplicated: ${incomingData.repositories.length} → ${deduplicatedRepos.length} repositories`);
      
      incomingData.repositories = deduplicatedRepos;
      incomingData.repository_count = deduplicatedRepos.length;
      
      // Create snapshot
      await this.createSnapshot(incomingData);
      
      // Update repository index
      await this.updateRepositoryIndex(incomingData);
      
      // Update topic index
      await this.topicIndexer.updateIndex(deduplicatedRepos, incomingData.date);
      console.log(`   🏷️  Updated topic index`);
      
      console.log(`✅ Successfully processed trending data for ${incomingData.date}`);
      
      return {
        date: incomingData.date,
        repositoryCount: incomingData.repository_count,
        snapshotPath: this.getSnapshotPath(incomingData.date),
        success: true
      };
      
    } catch (error) {
      console.error(`❌ Processing failed: ${error.message}`);
      throw error;
    }
  }

  async loadIncomingData(incomingPath) {
    try {
      const content = await fs.readFile(incomingPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load incoming data: ${error.message}`);
    }
  }

  getSnapshotPath(date) {
    const dateObj = parseISO(date);
    const year = format(dateObj, 'yyyy');
    const month = format(dateObj, 'MM');
    
    return `data/snapshots/${year}/${month}/${date}.json`;
  }

  async createSnapshot(incomingData) {
    const snapshotPath = this.getSnapshotPath(incomingData.date);
    
    // Check if snapshot already exists
    try {
      await fs.access(snapshotPath);
      if (!this.force) {
        console.log(`📄 Snapshot already exists: ${snapshotPath} (use --force to overwrite)`);
        return;
      } else {
        console.log(`🔄 Overwriting existing snapshot: ${snapshotPath}`);
      }
    } catch (error) {
      // File doesn't exist, continue with creation
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    
    // Process data for snapshot
    const snapshotData = {
      ...incomingData,
      processed_at: new Date().toISOString(),
      snapshot_version: 1,
      repositories: incomingData.repositories.map(repo => ({
        ...repo,
        // Add processing metadata
        processed_at: new Date().toISOString(),
        trending_date: incomingData.date
      }))
    };

    // Write snapshot
    await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2));
    console.log(`💾 Created snapshot: ${snapshotPath}`);
  }

  async updateRepositoryIndex(incomingData) {
    const indexPath = 'data/index/repositories.json';
    
    // Load existing index
    let repositoryIndex = {};
    try {
      const content = await fs.readFile(indexPath, 'utf8');
      repositoryIndex = JSON.parse(content);
    } catch (error) {
      console.log('📝 Creating new repository index');
      repositoryIndex = {
        schema_version: 1,
        last_updated: null,
        total_repositories: 0,
        repositories: {}
      };
    }

    const currentDate = incomingData.date;
    let updatedCount = 0;
    let newCount = 0;

    // Process each repository
    for (const repo of incomingData.repositories) {
      try {
        // Use deduplication utility to get canonical key
        const canonicalKey = DeduplicationUtil.normalizeIdentifier(repo.full_name);
        
        if (!repositoryIndex.repositories[canonicalKey]) {
          // New repository
          repositoryIndex.repositories[canonicalKey] = {
            full_name: repo.full_name,
            owner: repo.owner,
            name: repo.name,
            github_id: repo.github_id || null,
            first_seen: currentDate,
            last_seen: currentDate,
            trending_days: 1,
            current_consecutive_days: 1,
            appearance_dates: [currentDate],
            latest_stars: repo.stars,
            previous_stars: 0,
            star_change_since_last_seen: repo.stars,
            latest_language: repo.primary_language,
            latest_topics: repo.topics || [],
            latest_metadata: {
              description: repo.description,
              url: repo.url,
              license: repo.license,
              forks: repo.forks,
              created_at: repo.created_at,
              updated_at: repo.updated_at,
              pushed_at: repo.pushed_at
            },
            appearances_history: repo.appearances || []
          };
          newCount++;
        } else {
          // Existing repository
          const existing = repositoryIndex.repositories[canonicalKey];
          
          // Check if this date already exists (avoid duplicates)
          if (!existing.appearance_dates.includes(currentDate)) {
            // Update tracking
            existing.last_seen = currentDate;
            existing.trending_days += 1;
            existing.appearance_dates.push(currentDate);
            
            // Update consecutive days
            const lastDate = existing.appearance_dates[existing.appearance_dates.length - 2];
            if (lastDate && this.isConsecutiveDay(lastDate, currentDate)) {
              existing.current_consecutive_days += 1;
            } else {
              existing.current_consecutive_days = 1;
            }
            
            // Update stars tracking
            existing.previous_stars = existing.latest_stars;
            existing.latest_stars = repo.stars;
            existing.star_change_since_last_seen = repo.stars - existing.previous_stars;
            
            // Update latest metadata
            existing.latest_language = repo.primary_language;
            existing.latest_topics = repo.topics || [];
            existing.latest_metadata = {
              description: repo.description,
              url: repo.url,
              license: repo.license,
              forks: repo.forks,
              created_at: repo.created_at,
              updated_at: repo.updated_at,
              pushed_at: repo.pushed_at
            };
            
            // Add to appearances history
            if (repo.appearances) {
              existing.appearances_history = existing.appearances_history.concat(
                repo.appearances.map(app => ({
                  ...app,
                  date: currentDate
                }))
              );
            }
            
            // Deduplicate appearances history
            const deduped = DeduplicationUtil.deduplicateAppearances({ appearances: existing.appearances_history });
            existing.appearances_history = deduped.appearances;
          }
          updatedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not process repository ${repo.full_name}: ${error.message}`);
      }
    }

    // Update index metadata
    repositoryIndex.last_updated = new Date().toISOString();
    repositoryIndex.total_repositories = Object.keys(repositoryIndex.repositories).length;

    // Ensure directory exists
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    
    // Write updated index
    await fs.writeFile(indexPath, JSON.stringify(repositoryIndex, null, 2));
    
    console.log(`📊 Updated repository index:`);
    console.log(`   📈 New repositories: ${newCount}`);
    console.log(`   🔄 Updated repositories: ${updatedCount}`);
    console.log(`   📋 Total repositories: ${repositoryIndex.total_repositories}`);
  }

  isConsecutiveDay(dateStr1, dateStr2) {
    const date1 = parseISO(dateStr1);
    const date2 = parseISO(dateStr2);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  async getRepositoryIndex() {
    try {
      const content = await fs.readFile('data/index/repositories.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
}

// CLI usage
if (require.main === module) {
  const incomingPath = process.argv[2];
  const forceFlag = process.argv.includes('--force');
  
  if (!incomingPath) {
    console.error('Usage: node process-trending.js <incoming-file-path> [--force]');
    console.error('Example: node process-trending.js data/incoming/2026/07/2026-07-31.json');
    process.exit(1);
  }

  const processor = new TrendingProcessor();
  
  processor.processFile(incomingPath, { force: forceFlag })
    .then(result => {
      console.log(`\n🎉 Processing completed successfully!`);
      console.log(`📅 Date: ${result.date}`);
      console.log(`📊 Repositories: ${result.repositoryCount}`);
      console.log(`💾 Snapshot: ${result.snapshotPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Processing failed:', error.message);
      process.exit(1);
    });
}

module.exports = TrendingProcessor;