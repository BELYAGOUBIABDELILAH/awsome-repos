/**
 * Basic validation tests for GitHub Trending Archive
 */

const fs = require('fs');
const path = require('path');

describe('GitHub Trending Archive', () => {
  test('package.json exists and is valid', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    expect(fs.existsSync(packagePath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(packageJson.name).toBe('github-trending-archive');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('required directories exist', () => {
    const requiredDirs = [
      'archive',
      'data',
      'languages', 
      'topics',
      'repos',
      'scripts',
      'stats',
      'config',
      'templates'
    ];

    requiredDirs.forEach(dir => {
      expect(fs.existsSync(dir)).toBe(true);
    });
  });

  test('main scripts are executable', () => {
    const scripts = [
      'scripts/validate-data.js',
      'scripts/process-trending.js',
      'scripts/generate-reports.js',
      'scripts/validate-duplicates.js',
      'scripts/validate-generated.js'
    ];

    scripts.forEach(script => {
      expect(fs.existsSync(script)).toBe(true);
    });
  });

  test('README.md exists and contains key sections', () => {
    const readmePath = path.join(process.cwd(), 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    
    const readme = fs.readFileSync(readmePath, 'utf8');
    expect(readme).toContain('# GitHub Trending Archive');
    expect(readme).toContain('## What is this?');
    expect(readme).toContain('## Contributing');
  });
});