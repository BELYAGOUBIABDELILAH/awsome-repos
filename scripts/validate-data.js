#!/usr/bin/env node

/**
 * Data Validation Script
 * 
 * Validates incoming JSON files to ensure data integrity
 * before processing into the permanent archive.
 */

const fs = require('fs').promises;
const path = require('path');

class DataValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async validateFile(filePath) {
    console.log(`🔍 Validating ${filePath}`);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Read and parse JSON
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Validate schema structure
      this.validateSchema(data);
      
      // Validate date consistency
      this.validateDate(data, filePath);
      
      // Validate repositories data
      this.validateRepositories(data);
      
      // Validate appearances data
      this.validateAppearances(data);
      
      // Report results
      this.reportResults();
      
      return this.errors.length === 0;
      
    } catch (error) {
      this.errors.push(`Failed to read or parse file: ${error.message}`);
      this.reportResults();
      return false;
    }
  }

  validateSchema(data) {
    const requiredFields = [
      'schema_version',
      'date', 
      'generated_at',
      'period',
      'sources',
      'repository_count',
      'repositories'
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        this.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate schema version
    if (data.schema_version !== 1) {
      this.errors.push(`Unsupported schema version: ${data.schema_version}. Expected: 1`);
    }

    // Validate period
    if (data.period !== 'daily') {
      this.warnings.push(`Unexpected period: ${data.period}. Expected: daily`);
    }
  }

  validateDate(data, filePath) {
    if (!data.date) return;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      this.errors.push(`Invalid date format: ${data.date}. Expected: YYYY-MM-DD`);
      return;
    }

    // Extract date from file path and compare
    const filename = path.basename(filePath, '.json');
    if (filename !== data.date) {
      this.errors.push(`Date mismatch: file name ${filename} vs data.date ${data.date}`);
    }

    // Validate generated_at timestamp
    try {
      const generatedAt = new Date(data.generated_at);
      const dataDate = new Date(data.date);
      
      if (generatedAt < dataDate) {
        this.warnings.push(`Generated timestamp ${data.generated_at} is before data date ${data.date}`);
      }
    } catch (error) {
      this.errors.push(`Invalid generated_at timestamp: ${data.generated_at}`);
    }
  }

  validateRepositories(data) {
    if (!Array.isArray(data.repositories)) {
      this.errors.push('repositories field must be an array');
      return;
    }

    // Validate repository count matches
    if (data.repository_count !== data.repositories.length) {
      this.errors.push(`Repository count mismatch: declared ${data.repository_count}, actual ${data.repositories.length}`);
    }

    // Check for duplicates and validate each repository
    const seen = new Set();
    
    data.repositories.forEach((repo, index) => {
      // Check for duplicate full_name
      if (seen.has(repo.full_name)) {
        this.errors.push(`Duplicate repository at index ${index}: ${repo.full_name}`);
      } else {
        seen.add(repo.full_name);
      }

      // Validate required repository fields
      this.validateRepository(repo, index);
    });

    console.log(`📊 Validated ${data.repositories.length} repositories`);
  }

  validateRepository(repo, index) {
    const requiredFields = [
      'full_name',
      'owner',
      'name', 
      'url',
      'description',
      'primary_language',
      'topics',
      'license',
      'stars',
      'forks',
      'created_at',
      'updated_at',
      'pushed_at',
      'appearances'
    ];

    for (const field of requiredFields) {
      if (!(field in repo)) {
        this.errors.push(`Repository ${index}: missing required field '${field}'`);
      }
    }

    // Validate full_name format
    if (repo.full_name && !repo.full_name.includes('/')) {
      this.errors.push(`Repository ${index}: invalid full_name format '${repo.full_name}'. Expected: owner/repo`);
    }

    // Validate full_name consistency
    if (repo.owner && repo.name && repo.full_name !== `${repo.owner}/${repo.name}`) {
      this.errors.push(`Repository ${index}: full_name '${repo.full_name}' doesn't match '${repo.owner}/${repo.name}'`);
    }

    // Validate numeric fields
    if (repo.stars && (!Number.isInteger(repo.stars) || repo.stars < 0)) {
      this.errors.push(`Repository ${index}: invalid stars count '${repo.stars}'`);
    }

    if (repo.forks && (!Number.isInteger(repo.forks) || repo.forks < 0)) {
      this.errors.push(`Repository ${index}: invalid forks count '${repo.forks}'`);
    }

    // Validate topics array
    if (repo.topics && !Array.isArray(repo.topics)) {
      this.errors.push(`Repository ${index}: topics must be an array`);
    }

    // Validate appearances
    if (repo.appearances && !Array.isArray(repo.appearances)) {
      this.errors.push(`Repository ${index}: appearances must be an array`);
    }
  }

  validateAppearances(data) {
    let totalAppearances = 0;
    
    data.repositories.forEach((repo, repoIndex) => {
      if (!repo.appearances) return;
      
      const appearanceSources = new Set();
      
      repo.appearances.forEach((appearance, appIndex) => {
        totalAppearances++;
        
        // Check for required appearance fields
        const requiredFields = ['source_type', 'source_slug', 'rank'];
        for (const field of requiredFields) {
          if (!(field in appearance)) {
            this.errors.push(`Repository ${repoIndex}, appearance ${appIndex}: missing '${field}'`);
          }
        }

        // Check for duplicate appearances
        const appearanceKey = `${appearance.source_type}:${appearance.source_slug}`;
        if (appearanceSources.has(appearanceKey)) {
          this.errors.push(`Repository ${repoIndex}: duplicate appearance for ${appearanceKey}`);
        } else {
          appearanceSources.add(appearanceKey);
        }

        // Validate rank
        if (appearance.rank && (!Number.isInteger(appearance.rank) || appearance.rank <= 0)) {
          this.errors.push(`Repository ${repoIndex}, appearance ${appIndex}: invalid rank '${appearance.rank}'`);
        }

        // Validate stars_gained
        if ('stars_gained' in appearance) {
          if (!Number.isInteger(appearance.stars_gained) || appearance.stars_gained < 0) {
            this.errors.push(`Repository ${repoIndex}, appearance ${appIndex}: invalid stars_gained '${appearance.stars_gained}'`);
          }
        }
      });
    });

    console.log(`📈 Validated ${totalAppearances} total appearances across all repositories`);
  }

  reportResults() {
    // Report warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} warnings:`);
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    // Report errors
    if (this.errors.length > 0) {
      console.log(`\n❌ ${this.errors.length} validation errors:`);
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log(`\n💥 Validation failed!`);
    } else {
      console.log(`\n✅ Validation passed! ${this.warnings.length > 0 ? `(${this.warnings.length} warnings)` : ''}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: node validate-data.js <file-path>');
    process.exit(1);
  }

  const validator = new DataValidator();
  
  validator.validateFile(filePath)
    .then(isValid => {
      process.exit(isValid ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = DataValidator;