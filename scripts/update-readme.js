#!/usr/bin/env node

/**
 * Update README Script
 * 
 * Updates the main README.md with latest statistics and trending data.
 */

const fs = require('fs').promises;
const path = require('path');

class ReadmeUpdater {
  async updateReadme() {
    console.log('📝 Updating README.md...');
    
    try {
      // Load data sources
      const brand = await this.loadBrand();
      const overview = await this.loadOverviewStats();
      const topStarred = await this.loadTopStarred();
      const todaySnapshot = await this.loadTodaySnapshot();
      
      // Generate README content
      const readme = this.generateReadmeContent(brand, overview, topStarred, todaySnapshot);
      
      // Write README
      await fs.writeFile('README.md', readme);
      
      console.log('✅ Updated README.md');
      
    } catch (error) {
      console.error(`❌ README update failed: ${error.message}`);
      throw error;
    }
  }

  async loadBrand() {
    try {
      const content = await fs.readFile('config/brand.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Brand config not found, using defaults');
      return {
        name: 'GitHub Trending Explorer',
        creator: 'Abdelilah Belyagoubi',
        github: 'BELYAGOUBIABDELILAH',
        repository: 'awsome-repos',
        tagline: 'Explore what developers are building'
      };
    }
  }

  async loadOverviewStats() {
    try {
      const content = await fs.readFile('stats/overview.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Overview stats not found, using defaults');
      return this.getDefaultOverview();
    }
  }

  async loadTopStarred() {
    try {
      const content = await fs.readFile('stats/top-starred.json', 'utf8');
      const data = JSON.parse(content);
      return data.repositories.slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  async loadTodaySnapshot() {
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    const month = today.split('-')[1];
    
    try {
      const content = await fs.readFile(`data/snapshots/${year}/${month}/${today}.json`, 'utf8');
      const data = JSON.parse(content);
      return { date: today, repositories: data.repositories.slice(0, 5) };
    } catch (error) {
      // Try previous day
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const prevYear = yesterday.split('-')[0];
      const prevMonth = yesterday.split('-')[1];
      
      try {
        const content = await fs.readFile(`data/snapshots/${prevYear}/${prevMonth}/${yesterday}.json`, 'utf8');
        const data = JSON.parse(content);
        return { date: yesterday, repositories: data.repositories.slice(0, 5) };
      } catch {
        return { date: today, repositories: [] };
      }
    }
  }

  formatStars(stars) {
    if (!stars) return 'N/A';
    if (stars >= 1000) {
      return Math.round(stars / 1000) + 'k';
    }
    return stars.toString();
  }

  generateReadmeContent(brand, overview, topStarred, todaySnapshot) {
    const repoUrl = `https://github.com/${brand.github}/${brand.repository}`;
    const daysSince = this.calculateDaysSince(overview.first_collection);
    const latestRows = todaySnapshot.repositories.map(repo => {
      const stars = '⭐ ' + this.formatStars(repo.stars);
      const lang = repo.primary_language || repo.language || 'Unknown';
      const description = (repo.description || 'No description').substring(0, 80);
      return `| [${repo.full_name}](https://github.com/${repo.full_name}) | ${stars} | ${lang} | ${description} |`;
    }).join('\n');

    const latestDate = todaySnapshot.date;
    const archivePath = `./archive/${latestDate.substring(0, 4)}/${latestDate.substring(5, 7)}/${latestDate}.md`;

    return `<div align="center">

# GitHub Trending Archive

**Daily archive of GitHub trending repositories with historical data and analytics**

[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/${brand.github}/${brand.repository}/process-trending.yml?branch=main&label=Daily%20Updates&logo=github)](${repoUrl}/actions)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Repositories](https://img.shields.io/badge/Repositories-${overview.total_repositories}-green.svg)](./stats/)
[![Languages](https://img.shields.io/badge/Languages-${overview.language_count}-orange.svg)](./languages/)

</div>

---

## 📅 Today's Trending - ${new Date(latestDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

| Repository | ⭐ Stars | Language | Description |
|------------|------:|----------|-------------|
${latestRows || '| No data available | — | — | — |'}

[📄 View full daily report →](${archivePath})

---

## 🗂️ Browse the Archive

### [📅 Daily Archive](./archive/)
Browse trending repositories organized by date. Each day captures the most popular projects across all languages and topics, providing a historical view of what was trending when.

**[View daily reports →](./archive/)**

---

### [💻 Languages](./languages/)
Explore repositories grouped by programming language. Find trending projects in your favorite language, from Python and JavaScript to Rust and Go.

**Popular Languages:**
- [Python](./languages/python.md) | [JavaScript](./languages/javascript.md) | [TypeScript](./languages/typescript.md)
- [Go](./languages/go.md) | [Rust](./languages/rust.md) | [Java](./languages/java.md)

**[View all ${overview.language_count} languages →](./languages/)**

---

### [🏷️ Topics](./topics/)
Discover projects organized by category and domain. Topics include AI, web development, blockchain, security, and more.

**Popular Topics:**
- [Artificial Intelligence](./topics/artificial-intelligence.md)
- [Web Development](./topics/web-development.md)
- [Systems Programming](./topics/systems-programming.md)
- [Blockchain](./topics/blockchain.md)

**[View all topics →](./topics/)**

---

### [📦 Repository Profiles](./repos/)
Detailed pages for each repository with complete metrics, trending history, related projects, and growth analysis.

**Examples:**
- [tensorflow/tensorflow](./repos/tensorflow/tensorflow.md)
- [microsoft/vscode](./repos/microsoft/vscode.md)
- [rust-lang/rust](./repos/rust-lang/rust.md)

**[Browse all ${overview.total_repositories} repositories →](./repos/)**

---

### [💎 Hidden Gems](./hidden-gems/)
Discover underrated projects with high growth potential. These repositories show strong momentum but haven't reached mainstream attention yet.

**[Find hidden gems →](./hidden-gems/)**

---

### [📊 Statistics](./stats/)
Historical trends, growth analysis, and data insights across all tracked repositories. Includes top starred, fastest growing, and most frequent trending projects.

**Available Statistics:**
- [Top Starred Repositories](./stats/top-starred.json)
- [Fastest Growing Projects](./stats/fastest-growing.json)
- [Most Frequent Trending](./stats/most-frequent.json)
- [Languages Distribution](./stats/languages.json)
- [Topics Analysis](./stats/topics.json)

**[View all statistics →](./stats/)**

---

## 📈 Archive Overview

- **${overview.total_repositories}** repositories indexed
- **${overview.language_count}** programming languages covered
- **${overview.topic_count}** topics tracked
- **Daily updates** via automated workflow
- **Historical data** since ${new Date(overview.first_collection).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

---

## 🤝 Contributing

This is an open data project. Contributions are welcome:

- Report data quality issues
- Suggest new topics or categories  
- Improve documentation
- Add ecosystem data ([Contributing Guide](./CONTRIBUTING_ECOSYSTEM.md))

See [CONTRIBUTING.md](./CONTRIBUTING.md) for complete guidelines.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Created by [${brand.creator}](https://github.com/${brand.github})**

*Automated daily updates powered by n8n and GitHub Actions*

</div>
`;
  }

  formatTodaysTrending(repositories) {
    if (!repositories || repositories.length === 0) {
      return '*No data available for today yet*';
    }

    return '### Top Repositories\n\n' + repositories.map((repo, index) => {
      const stars = repo.stars ? `⭐ ${repo.stars.toLocaleString()}` : '';
      const description = repo.description || 'No description';
      return `${index + 1}. **[${repo.full_name}](https://github.com/${repo.full_name})** ${stars}  
   ${description}`;
    }).join('\n\n');
  }

  calculateDaysSince(startDate) {
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDefaultOverview() {
    return {
      total_repositories: 0,
      total_stars: 0,
      avg_stars: 0,
      language_count: 0,
      topic_count: 0,
      first_collection: null
    };
  }
}

// CLI usage
if (require.main === module) {
  const updater = new ReadmeUpdater();
  
  updater.updateReadme()
    .then(() => {
      console.log('\n🎉 README update completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 README update failed:', error.message);
      process.exit(1);
    });
}

module.exports = ReadmeUpdater;
