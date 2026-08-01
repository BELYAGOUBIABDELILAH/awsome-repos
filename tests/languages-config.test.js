/**
 * Tests for language configuration
 */

const fs = require('fs');
const path = require('path');

describe('Languages Configuration', () => {
  let config;

  beforeAll(() => {
    const configPath = path.join(process.cwd(), 'config/languages.json');
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  });

  test('config file exists and is valid JSON', () => {
    expect(config).toBeDefined();
    expect(config.schema_version).toBe(1);
    expect(config.languages).toBeDefined();
  });

  test('all languages have required fields', () => {
    for (const [key, lang] of Object.entries(config.languages)) {
      expect(lang.name).toBeDefined();
      expect(lang.slug).toBeDefined();
      expect(lang.github_trending_slug).toBeDefined();
      expect(lang.enabled).toBeDefined();
      expect(Array.isArray(lang.aliases)).toBe(true);
    }
  });

  test('at least 30 languages are defined', () => {
    const languageCount = Object.keys(config.languages).length;
    expect(languageCount).toBeGreaterThanOrEqual(30);
  });

  test('all enabled languages have unique github_trending_slug', () => {
    const slugs = new Set();
    for (const lang of Object.values(config.languages)) {
      if (lang.enabled) {
        expect(slugs.has(lang.github_trending_slug)).toBe(false);
        slugs.add(lang.github_trending_slug);
      }
    }
  });

  test('includes commonly used languages', () => {
    const commonLanguages = [
      'python', 'javascript', 'typescript', 'go', 'rust',
      'java', 'c', 'cpp', 'csharp', 'php', 'ruby'
    ];

    for (const lang of commonLanguages) {
      expect(config.languages[lang]).toBeDefined();
      expect(config.languages[lang].enabled).toBe(true);
    }
  });
});
