/**
 * Tests for TrendingCollector configuration loading
 */

const TrendingCollector = require('../scripts/collect-trending');

describe('TrendingCollector Config Loading', () => {
  let collector;

  beforeEach(() => {
    collector = new TrendingCollector();
  });

  test('can load languages configuration', async () => {
    const config = await collector.loadLanguagesConfig();
    
    expect(config).toBeDefined();
    expect(config.languages).toBeDefined();
    expect(Object.keys(config.languages).length).toBeGreaterThan(0);
  });

  test('getEnabledLanguages returns array with overall trending', async () => {
    const config = await collector.loadLanguagesConfig();
    const languages = collector.getEnabledLanguages(config);
    
    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThan(0);
    expect(languages[0]).toBe(''); // Overall trending (empty string)
  });

  test('getEnabledLanguages includes all enabled languages', async () => {
    const config = await collector.loadLanguagesConfig();
    const languages = collector.getEnabledLanguages(config);
    
    // Should include common languages
    expect(languages).toContain('python');
    expect(languages).toContain('javascript');
    expect(languages).toContain('typescript');
    expect(languages).toContain('go');
    expect(languages).toContain('rust');
  });

  test('getEnabledLanguages filters disabled languages', async () => {
    const mockConfig = {
      languages: {
        python: { enabled: true, github_trending_slug: 'python' },
        disabled_lang: { enabled: false, github_trending_slug: 'disabled' }
      }
    };
    
    const languages = collector.getEnabledLanguages(mockConfig);
    
    expect(languages).toContain('python');
    expect(languages).not.toContain('disabled');
  });

  test('configuration caching works', async () => {
    const config1 = await collector.loadLanguagesConfig();
    const config2 = await collector.loadLanguagesConfig();
    
    expect(config1).toBe(config2); // Same object reference
  });
});
