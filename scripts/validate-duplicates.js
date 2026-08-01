#!/usr/bin/env node

/**
 * Validate Duplicates Script
 * 
 * Detects and reports any duplicate repositories in the dataset.
 * Validates data integrity across snapshots and repository index.
 */

const fs = require('fs').promises;
const path = require('path');
const DeduplicationUtil = require('./utils/deduplication');

class DuplicateValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    console.log('🔍 Validating for duplicates...\n');

    try {
      // Validate repository index
      await this.validateRepositoryIndex();

      // Validate latest snapshot if exists
      await this.validateLatestSnapshot();

      // Validate topic index if exists
      await this.validateTopicIndex();

      // Report results
      this.printReport();

      return {
        valid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings
      };

    } catch (error) {
      console.error(`❌ Validation failed: ${error.message}`);
      throw error;
    }
  }

  async validateRepositoryIndex() {
    console.log('📊 Validating repository index...');

    try {
      const content = await fs.readFile('data/index/repositories.json', 'utf8');
      const index = JSON.parse(content);

      const report = DeduplicationUtil.validateIndex(index);

      console.log(`   Total repositories: ${report.total_repositories}`);

      if (report.duplicate_github_ids.length > 0) {
        this.errors.push({
          type: 'DUPLICATE_GITHUB_ID',
          count: report.duplicate_github_ids.length,
          details: report.duplicate_github_ids
        });
        console.log(`   ❌ Found ${report.duplicate_github_ids.length} duplicate GitHub IDs`);
      } else {
        console.log(`   ✅ No duplicate GitHub IDs`);
      }

      if (report.duplicate_full_names.length > 0) {
        this.errors.push({
          type: 'DUPLICATE_FULL_NAME',
          count: report.duplicate_full_names.length,
          details: report.duplicate_full_names
        });
        console.log(`   ❌ Found ${report.duplicate_full_names.length} duplicate full names`);
      } else {
        console.log(`   ✅ No duplicate full names`);
      }

      // Check for duplicate appearances within repositories
      const repositories = Object.values(index.repositories);
      let duplicateAppearances = 0;

      repositories.forEach(repo => {
        if (repo.appearances && repo.appearances.length > 0) {
          const original = repo.appearances.length;
          const deduplicated = DeduplicationUtil.deduplicateAppearances(repo);
          const duplicates = original - deduplicated.appearances.length;

          if (duplicates > 0) {
            duplicateAppearances++;
            this.warnings.push({
              type: 'DUPLICATE_APPEARANCES',
              repository: repo.full_name,
              duplicates
            });
          }
        }
      });

      if (duplicateAppearances > 0) {
        console.log(`   ⚠️  ${duplicateAppearances} repositories have duplicate appearances`);
      } else {
        console.log(`   ✅ No duplicate appearances`);
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`   ⚠️  Repository index not found (this is OK if it's a new installation)`);
      } else {
        throw error;
      }
    }

    console.log('');
  }

  async validateLatestSnapshot() {
    console.log('📸 Validating latest snapshot...');

    try {
      // Find the most recent snapshot
      const snapshotsDir = 'data/snapshots';
      const years = await fs.readdir(snapshotsDir);
      
      if (years.length === 0) {
        console.log(`   ⚠️  No snapshots found\n`);
        return;
      }

      // Get the latest snapshot file
      const latestYear = years.sort().reverse()[0];
      const months = await fs.readdir(path.join(snapshotsDir, latestYear));
      const latestMonth = months.sort().reverse()[0];
      const files = await fs.readdir(path.join(snapshotsDir, latestYear, latestMonth));
      const latestFile = files.sort().reverse()[0];

      const snapshotPath = path.join(snapshotsDir, latestYear, latestMonth, latestFile);
      console.log(`   Checking: ${snapshotPath}`);

      const content = await fs.readFile(snapshotPath, 'utf8');
      const snapshot = JSON.parse(content);

      if (!snapshot.repositories || snapshot.repositories.length === 0) {
        console.log(`   ⚠️  No repositories in snapshot\n`);
        return;
      }

      // Check for duplicates within snapshot
      const duplicates = DeduplicationUtil.findDuplicates(snapshot.repositories);

      if (duplicates.length > 0) {
        this.errors.push({
          type: 'DUPLICATE_IN_SNAPSHOT',
          snapshot: snapshotPath,
          count: duplicates.length,
          details: duplicates.map(d => ({
            key: d.key,
            original_index: d.original.index,
            duplicate_index: d.duplicate.index,
            repository: d.original.repository.full_name
          }))
        });
        console.log(`   ❌ Found ${duplicates.length} duplicate repositories in snapshot`);
      } else {
        console.log(`   ✅ No duplicates in snapshot (${snapshot.repositories.length} repositories)`);
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`   ⚠️  Snapshots directory not found\n`);
      } else {
        throw error;
      }
    }

    console.log('');
  }

  async validateTopicIndex() {
    console.log('🏷️  Validating topic index...');

    try {
      const content = await fs.readFile('data/index/topics.json', 'utf8');
      const topicIndex = JSON.parse(content);

      if (!topicIndex.topics) {
        console.log(`   ⚠️  No topics found\n`);
        return;
      }

      const topics = Object.keys(topicIndex.topics);
      console.log(`   Total topics: ${topics.length}`);

      // Check for duplicate repository references within topics
      let duplicateRefs = 0;

      topics.forEach(topicSlug => {
        const topic = topicIndex.topics[topicSlug];
        if (topic.repositories) {
          const seen = new Set();
          const duplicates = [];

          topic.repositories.forEach(repoName => {
            try {
              const normalized = DeduplicationUtil.normalizeIdentifier(repoName);
              if (seen.has(normalized)) {
                duplicates.push(repoName);
              } else {
                seen.add(normalized);
              }
            } catch (error) {
              // Ignore invalid names
            }
          });

          if (duplicates.length > 0) {
            duplicateRefs++;
            this.warnings.push({
              type: 'DUPLICATE_TOPIC_REFERENCE',
              topic: topicSlug,
              duplicates
            });
          }
        }
      });

      if (duplicateRefs > 0) {
        console.log(`   ⚠️  ${duplicateRefs} topics have duplicate repository references`);
      } else {
        console.log(`   ✅ No duplicate repository references`);
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`   ⚠️  Topic index not found\n`);
      } else {
        throw error;
      }
    }

    console.log('');
  }

  printReport() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 VALIDATION REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ NO ISSUES FOUND\n');
      console.log('All validations passed. No duplicates detected.');
      return;
    }

    if (this.errors.length > 0) {
      console.log(`❌ ERRORS: ${this.errors.length}\n`);
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}`);
        console.log(`   Count: ${error.count}`);
        if (error.details && error.details.length <= 5) {
          error.details.forEach(detail => {
            console.log(`   - ${JSON.stringify(detail, null, 2).substring(0, 200)}`);
          });
        } else if (error.details) {
          console.log(`   (Showing first 5 of ${error.details.length})`);
          error.details.slice(0, 5).forEach(detail => {
            console.log(`   - ${JSON.stringify(detail, null, 2).substring(0, 200)}`);
          });
        }
        console.log('');
      });
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  WARNINGS: ${this.warnings.length}\n`);
      console.log('These issues should be reviewed but do not block processing.\n');
      
      // Group warnings by type
      const warningTypes = new Map();
      this.warnings.forEach(warning => {
        if (!warningTypes.has(warning.type)) {
          warningTypes.set(warning.type, []);
        }
        warningTypes.get(warning.type).push(warning);
      });

      warningTypes.forEach((warnings, type) => {
        console.log(`${type}: ${warnings.length} occurrences`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════\n');
  }
}

// CLI usage
if (require.main === module) {
  const validator = new DuplicateValidator();
  
  validator.validate()
    .then(result => {
      if (result.valid) {
        console.log('🎉 Validation completed: NO DUPLICATES FOUND\n');
        process.exit(0);
      } else {
        console.log('⚠️  Validation completed: ISSUES FOUND\n');
        console.log('Please review the errors above and fix them before proceeding.\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = DuplicateValidator;
