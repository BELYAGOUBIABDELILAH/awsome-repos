#!/usr/bin/env node

/**
 * Validate Generated Content Script
 * 
 * Validates all generated Markdown files and JSON outputs to ensure quality.
 */

const fs = require('fs').promises;
const path = require('path');

class GeneratedContentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async validateAll() {
    console.log('🔍 Validating generated content...');
    
    try {
      // Validate JSON files
      await this.validateJsonFiles();
      
      // Validate Markdown files
      await this.validateMarkdownFiles();
      
      // Validate repository structure
      await this.validateRepositoryStructure();
      
      // Report results
      this.reportResults();
      
      return this.errors.length === 0;
      
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      this.reportResults();
      return false;
    }
  }

  async validateJsonFiles() {
    console.log('  Validating JSON files...');
    
    // Validate stats files
    const statsFiles = [
      'stats/overview.json',
      'stats/top-starred.json',
      'stats/most-frequent.json',
      'stats/fastest-growing.json',
      'stats/languages.json',
      'stats/topics.json'
    ];
    
    for (const file of statsFiles) {
      await this.validateJsonFile(file);
    }
    
    // Validate repository index
    await this.validateJsonFile('data/index/repositories.json');
  }

  async validateJsonFile(filePath) {
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      if (content.trim().length === 0) {
        this.errors.push(`Empty JSON file: ${filePath}`);
        return;
      }
      
      JSON.parse(content);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.warnings.push(`JSON file not found: ${filePath}`);
      } else {
        this.errors.push(`Invalid JSON in ${filePath}: ${error.message}`);
      }
    }
  }

  async validateMarkdownFiles() {
    console.log('  Validating Markdown files...');
    
    // Validate README
    await this.validateMarkdownFile('README.md');
    
    // Validate archive files
    await this.validateDirectory('archive', '.md');
    
    // Validate topic pages
    await this.validateDirectory('topics', '.md');
    
    // Validate language pages
    await this.validateDirectory('languages', '.md');
    
    // Validate repository profiles
    await this.validateDirectory('repos', '.md');
  }

  async validateMarkdownFile(filePath) {
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      if (content.trim().length === 0) {
        this.errors.push(`Empty Markdown file: ${filePath}`);
        return;
      }
      
      // Check for placeholder text
      const placeholders = [
        'TODO',
        'FIXME',
        'placeholder',
        'coming soon',
        'not implemented'
      ];
      
      for (const placeholder of placeholders) {
        if (content.toLowerCase().includes(placeholder)) {
          this.warnings.push(`Possible placeholder text in ${filePath}: "${placeholder}"`);
        }
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.warnings.push(`Markdown file not found: ${filePath}`);
      } else {
        this.errors.push(`Error reading ${filePath}: ${error.message}`);
      }
    }
  }

  async validateDirectory(dirPath, extension) {
    try {
      await fs.access(dirPath);
      const files = await this.getFilesRecursively(dirPath, extension);
      
      for (const file of files) {
        await this.validateMarkdownFile(file);
      }
      
      if (files.length === 0) {
        this.warnings.push(`No ${extension} files found in ${dirPath}`);
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.warnings.push(`Directory not found: ${dirPath}`);
      }
    }
  }

  async getFilesRecursively(dir, extension) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  async validateRepositoryStructure() {
    console.log('  Validating repository structure...');
    
    const requiredDirs = [
      'data/incoming',
      'data/snapshots',
      'data/index',
      'archive',
      'topics',
      'languages',
      'repos',
      'stats',
      'config',
      'templates',
      'scripts'
    ];
    
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        this.errors.push(`Required directory missing: ${dir}`);
      }
    }
  }

  reportResults() {
    // Report warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} warnings:`);
      this.warnings.slice(0, 10).forEach(warning => console.log(`   ${warning}`));
      if (this.warnings.length > 10) {
        console.log(`   ... and ${this.warnings.length - 10} more warnings`);
      }
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
  const validator = new GeneratedContentValidator();
  
  validator.validateAll()
    .then(isValid => {
      process.exit(isValid ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = GeneratedContentValidator;