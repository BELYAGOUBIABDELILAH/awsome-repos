#!/usr/bin/env node

/**
 * Validate Ecosystem Data Script
 * 
 * Validates ecosystem JSON files:
 * - JSON syntax correctness
 * - Schema compliance
 * - Repository reference validity
 */

const fs = require('fs').promises;
const path = require('path');

class EcosystemValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.repositoryIndex = null;
  }

  async validate() {
    console.log('🔍 Validating ecosystem data...\n');
    
    try {
      // Load repository index for reference validation
      await this.loadRepositoryIndex();
      
      // Validate each ecosystem file
      await this.validateWorksWithFile();
      await this.validateAlternativesFile();
      await this.validateUseCasesFile();
      
      // Report results
      this.reportResults();
      
      return this.errors.length === 0;
      
    } catch (error) {
      console.error(`❌ Validation failed: ${error.message}`);
      return false;
    }
  }

  async loadRepositoryIndex() {
    try {
      const content = await fs.readFile('data/index/repositories.json', 'utf8');
      const index = JSON.parse(content);
      this.repositoryIndex = new Set(Object.keys(index.repositories));
      console.log(`📊 Loaded ${this.repositoryIndex.size} repositories from index\n`);
    } catch (error) {
      this.warnings.push(`Could not load repository index: ${error.message}`);
      this.repositoryIndex = new Set();
    }
  }

  async validateWorksWithFile() {
    console.log('Validating works-with.json...');
    
    try {
      const content = await fs.readFile('data/ecosystem/works-with.json', 'utf8');
      const data = JSON.parse(content);
      
      // Check schema version
      if (!data.schema_version) {
        this.warnings.push('works-with.json: Missing schema_version');
      }
      
      // Check mappings
      if (!data.mappings || typeof data.mappings !== 'object') {
        this.errors.push('works-with.json: Missing or invalid mappings object');
        return;
      }
      
      // Validate each mapping
      for (const [repo, mapping] of Object.entries(data.mappings)) {
        if (!this.repositoryIndex.has(repo)) {
          this.warnings.push(`works-with.json: Repository "${repo}" not in index`);
        }
        
        if (!Array.isArray(mapping.works_with)) {
          this.errors.push(`works-with.json: "${repo}" works_with must be an array`);
        }
        
        if (!Array.isArray(mapping.complements)) {
          this.errors.push(`works-with.json: "${repo}" complements must be an array`);
        }
      }
      
      console.log(`  ✓ Validated ${Object.keys(data.mappings).length} mappings\n`);
      
    } catch (error) {
      this.errors.push(`works-with.json: ${error.message}`);
    }
  }

  async validateAlternativesFile() {
    console.log('Validating alternatives.json...');
    
    try {
      const content = await fs.readFile('data/ecosystem/alternatives.json', 'utf8');
      const data = JSON.parse(content);
      
      // Check schema version
      if (!data.schema_version) {
        this.warnings.push('alternatives.json: Missing schema_version');
      }
      
      // Check mappings
      if (!data.mappings || typeof data.mappings !== 'object') {
        this.errors.push('alternatives.json: Missing or invalid mappings object');
        return;
      }
      
      // Validate each mapping
      for (const [repo, mapping] of Object.entries(data.mappings)) {
        if (!this.repositoryIndex.has(repo)) {
          this.warnings.push(`alternatives.json: Repository "${repo}" not in index`);
        }
        
        if (!Array.isArray(mapping.alternatives)) {
          this.errors.push(`alternatives.json: "${repo}" alternatives must be an array`);
        }
        
        if (!mapping.category) {
          this.warnings.push(`alternatives.json: "${repo}" missing category`);
        }
      }
      
      console.log(`  ✓ Validated ${Object.keys(data.mappings).length} mappings\n`);
      
    } catch (error) {
      this.errors.push(`alternatives.json: ${error.message}`);
    }
  }

  async validateUseCasesFile() {
    console.log('Validating use-cases.json...');
    
    try {
      const content = await fs.readFile('data/ecosystem/use-cases.json', 'utf8');
      const data = JSON.parse(content);
      
      // Check schema version
      if (!data.schema_version) {
        this.warnings.push('use-cases.json: Missing schema_version');
      }
      
      // Check mappings
      if (!data.mappings || typeof data.mappings !== 'object') {
        this.errors.push('use-cases.json: Missing or invalid mappings object');
        return;
      }
      
      // Validate each mapping
      for (const [repo, mapping] of Object.entries(data.mappings)) {
        if (!this.repositoryIndex.has(repo)) {
          this.warnings.push(`use-cases.json: Repository "${repo}" not in index`);
        }
        
        if (!Array.isArray(mapping.best_for)) {
          this.errors.push(`use-cases.json: "${repo}" best_for must be an array`);
        }
        
        if (!Array.isArray(mapping.use_cases)) {
          this.errors.push(`use-cases.json: "${repo}" use_cases must be an array`);
        }
      }
      
      console.log(`  ✓ Validated ${Object.keys(data.mappings).length} mappings\n`);
      
    } catch (error) {
      this.errors.push(`use-cases.json: ${error.message}`);
    }
  }

  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('Validation Results');
    console.log('='.repeat(60) + '\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All ecosystem data is valid!\n');
      return;
    }
    
    if (this.errors.length > 0) {
      console.log(`❌ Errors (${this.errors.length}):\n`);
      this.errors.forEach(error => console.log(`  • ${error}`));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  Warnings (${this.warnings.length}):\n`);
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
      console.log('');
    }
    
    if (this.errors.length > 0) {
      console.log('❌ Validation failed\n');
    } else {
      console.log('✅ Validation passed with warnings\n');
    }
  }
}

// CLI usage
if (require.main === module) {
  const validator = new EcosystemValidator();
  
  validator.validate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Validation error:', error.message);
      process.exit(1);
    });
}

module.exports = EcosystemValidator;
