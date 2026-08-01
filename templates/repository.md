# {{owner}}/{{name}}

[![GitHub stars](https://img.shields.io/github/stars/{{owner}}/{{name}}?style=social)]({{url}})
[![GitHub forks](https://img.shields.io/github/forks/{{owner}}/{{name}}?style=social)]({{url}})

---

## 📋 Repository Information

- **Description**: {{description}}
- **Homepage**: {{homepage}}
- **Language**: {{language}}
- **License**: {{license}}
- **Created**: {{created_at}}
- **Size**: {{size}} KB

### 📊 Current Stats
- **Stars**: ⭐ {{stars}}
- **Forks**: 🍴 {{forks}}
- **Watchers**: 👁️ {{watchers}}
- **Issues**: 🐛 {{open_issues}}

---

## 🏷️ Topics

{{#topics}}
- [{{name}}](../../topics/{{slug}}.md)
{{/topics}}

---

## 📈 Trending History

### Summary
- **First Trending**: {{first_trending}}
- **Last Trending**: {{last_trending}}
- **Total Days**: {{total_trending_days}}
- **Longest Streak**: {{longest_streak}} days

### Trending Timeline

{{#trending_history}}
#### {{date}} - [View Report](../../archive/{{year}}/{{month}}/{{date}}.md)
- **Position**: #{{position}}
- **Stars at time**: {{stars_then}}
- **Stars gained**: +{{stars_gained}}

{{/trending_history}}

---

## 📊 Growth Analysis

### Star History
- **Initial Stars** ({{first_trending}}): {{initial_stars}}
- **Current Stars**: {{current_stars}}
- **Total Growth**: +{{total_growth}} stars
- **Average Daily Growth**: +{{avg_daily_growth}} stars/day

### Trending Performance
- **Peak Position**: #{{peak_position}} ({{peak_date}})
- **Trending Frequency**: {{trending_frequency}}%
- **Category Rank**: #{{category_rank}} in {{language}}

---

## 🔍 Related Repositories

### Same Language ({{language}})
{{#related_language}}
- [{{owner}}/{{name}}]({{slug}}.md) - {{description}}
{{/related_language}}

### Similar Topics
{{#related_topics}}
- [{{owner}}/{{name}}]({{slug}}.md) - {{description}}
{{/related_topics}}

### Trending Together
*Repositories that trended on the same days*

{{#trending_together}}
- [{{owner}}/{{name}}]({{slug}}.md) - {{shared_days}} shared days
{{/trending_together}}

---

## 📅 Daily Reports Mentioned

{{#daily_mentions}}
- [{{date}}](../../archive/{{year}}/{{month}}/{{date}}.md) - {{context}}
{{/daily_mentions}}

---

## 🎯 Key Metrics

### Popularity Score
- **GitHub Score**: {{github_score}}/100
- **Trending Score**: {{trending_score}}/100
- **Community Score**: {{community_score}}/100

### Project Health
- **Last Commit**: {{last_commit}}
- **Contributors**: {{contributors}}
- **Release Frequency**: {{release_frequency}}
- **Issue Response Time**: {{avg_response_time}}

---

## 🔗 Links

- **Repository**: [{{url}}]({{url}})
- **Issues**: [{{issues_url}}]({{issues_url}})
- **Wiki**: [{{wiki_url}}]({{wiki_url}})
{{#homepage}}
- **Homepage**: [{{homepage}}]({{homepage}})
{{/homepage}}

---

## 📝 Notes

{{#notes}}
- {{date}}: {{note}}
{{/notes}}

---

*Repository profile last updated: {{last_updated}}*