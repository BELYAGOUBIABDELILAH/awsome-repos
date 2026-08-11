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
      return { date: today, repositories: data.repositories };
    } catch (error) {
      // Try previous day
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const prevYear = yesterday.split('-')[0];
      const prevMonth = yesterday.split('-')[1];
      
      try {
        const content = await fs.readFile(`data/snapshots/${prevYear}/${prevMonth}/${yesterday}.json`, 'utf8');
        const data = JSON.parse(content);
        return { date: yesterday, repositories: data.repositories };
      } catch {
        // Fallback to overview's last_collection
        try {
          const overviewContent = await fs.readFile('stats/overview.json', 'utf8');
          const overview = JSON.parse(overviewContent);
          const lastDate = overview.last_collection;
          if (lastDate) {
            const lastYear = lastDate.split('-')[0];
            const lastMonth = lastDate.split('-')[1];
            const content = await fs.readFile(`data/snapshots/${lastYear}/${lastMonth}/${lastDate}.json`, 'utf8');
            const data = JSON.parse(content);
            return { date: lastDate, repositories: data.repositories };
          }
        } catch (err) {
          console.warn(`Could not load snapshot for last collection date: ${err.message}`);
        }
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
    const latestRows = todaySnapshot.repositories.map(repo => {
      const stars = '⭐ ' + this.formatStars(repo.stars);
      const lang = repo.primary_language || repo.language || 'Unknown';
      const descriptionText = repo.description || 'No description';
      const description = descriptionText.length > 80 ? descriptionText.substring(0, 80) + '...' : descriptionText;
      return `| [${repo.full_name}](https://github.com/${repo.full_name}) | ${stars} | ${lang} | ${description} |`;
    }).join('\n');

    const latestDate = todaySnapshot.date;
    const archivePath = `./archive/${latestDate.substring(0, 4)}/${latestDate.substring(5, 7)}/${latestDate}.md`;

    return `<div align="center">

# 🚀 Awesome Repos

**A daily archive of GitHub trending repositories, organized by date, language, topic, and repository history.**

[![Daily Updates](https://img.shields.io/github/actions/workflow/status/${brand.github}/${brand.repository}/process-trending.yml?branch=main&label=Daily%20Updates&style=flat-square&logo=github)](${repoUrl}/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-01696f?style=flat-square)](./LICENSE)
[![Repositories](https://img.shields.io/badge/Repositories-${overview.total_repositories}-2d6a4f?style=flat-square)](./stats/)
[![Languages](https://img.shields.io/badge/Languages-${overview.language_count}-e07b39?style=flat-square)](./languages/)

---

### 🔍 Quick Navigation (Filters)

**[📊 Statistics](./stats/)** &nbsp;•&nbsp; **[💎 Hidden Gems](./hidden-gems/)** &nbsp;•&nbsp; **[📦 Repository Profiles](./repos/)** &nbsp;•&nbsp; **[🏷️ Topics](./topics/)** &nbsp;•&nbsp; **[💻 Languages](./languages/)** &nbsp;•&nbsp; **[📅 Daily Archive](./archive/)**

---

## 📢 Stay Updated & Connected!

> 💡 **Never miss a breakthrough open-source project!** We analyze GitHub trends daily and share curated highlights, code analysis, and hidden software gems across our channels. Join our growing community of developers!

| Platform | Channel | Content Focus |
| :--- | :--- | :--- |
| **📢 Telegram** | [Join Telegram](https://t.me/+zR8KdEpaHLUwMWY0) | Real-time alerts, daily top charts, and hot updates. |
| **✉️ Substack** | [Subscribe to Newsletter](https://axiomrepo.substack.com/) | Deep-dives into code architecture, developer tools, and tech stacks. |
| **👥 Facebook** | [Follow Page](https://web.facebook.com/axiomrepo) | Byte-sized tips, developer memes, and open-source updates. |
| **🎥 TikTok** | [Follow on TikTok](https://www.tiktok.com/@axiomrepo) | 60-second reviews and visual walk-throughs of amazing repositories. |

</div>

---

## 📅 Today's Trending · ${new Date(latestDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

| Repository | Stars | Language | Description |
|---|---:|---|---|
${latestRows || '| No data available | — | — | — |'}

[📄 View full daily report →](${archivePath})

---

<div align="center">

## 📈 Archive Overview

| 🗂️ Repositories | 💻 Languages | 🏷️ Topics |
| :---: | :---: | :---: |
| <sub style="font-size:14px">Indexed & Analyzed</sub><br><strong style="font-size:28px;color:#2d6a4f">${overview.total_repositories}</strong> | <sub style="font-size:14px">Languages Covered</sub><br><strong style="font-size:28px;color:#e07b39">${overview.language_count}</strong> | <sub style="font-size:14px">Topics Tracked</sub><br><strong style="font-size:28px;color:#01696f">${overview.topic_count}</strong> |

> 🔄 **Daily updates** via automated workflow &nbsp;•&nbsp; ⏳ **Historical data** since ${new Date(overview.first_collection).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

</div>

---

## 🤝 Join the Ecosystem (Contributing)

Awesome Repos is an **open-data ecosystem**. We leverage crowd-sourced insights to build the most comprehensive catalog of trending software. Your contributions are vital!

| Opportunity | Description | Get Started |
| :--- | :--- | :--- |
| **🐛 Report Data Quality** | Notice a missing language classification or incorrect repo data? | [Open an Issue](${repoUrl}/issues/new?title=Data+Quality+Issue) |
| **💡 Suggest Categories/Topics** | Help us map topics better or recommend curated groupings. | [Suggest Topic](${repoUrl}/issues/new?title=Topic+Suggestion) |
| **✍️ Enhance Documentation** | Improve our formatting, script efficiency, or templates. | [Improve Docs](${repoUrl}/pulls) |
| **🌐 Add Ecosystem Data** | Learn how to feed repository data into external pipelines. | [Ecosystem Guide](./CONTRIBUTING_ECOSYSTEM.md) |

Refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines on coding standards, pull request processes, and data schemas.

---

## 📄 License & Terms

This project is open-source software licensed under the **[MIT License](./LICENSE)**. 

Feel free to use the data, scripts, and generated reports in your own applications, newsletters, or projects. Attribution is highly appreciated!

---

<div align="center">

<h3>Awesome Repos</h3>
<p>Curated and developed with ❤️ by <b><a href="https://github.com/${brand.github}">${brand.creator}</a></b></p>

[![GitHub followers](https://img.shields.io/github/followers/${brand.github}?style=social)](https://github.com/${brand.github})
&nbsp;&nbsp;
[![GitHub stars](https://img.shields.io/github/stars/${brand.github}/${brand.repository}?style=social)](https://github.com/${brand.github}/${brand.repository})

<p style="color: #6a737d; font-size: 11px; margin-top: 10px;">
   Automated daily database compilation powered by <b>n8n</b> & <b>GitHub Actions</b>.<br>
  All datasets and markdown reports are regenerated every 24 hours.
</p>

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
