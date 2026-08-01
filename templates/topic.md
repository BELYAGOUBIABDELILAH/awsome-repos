# {{topic_name}} Repositories

*{{description}}*

---

## 📊 Overview

- **Total Repositories**: {{total_count}}
- **First Seen**: {{first_date}}
- **Last Updated**: {{last_date}}
- **Average Stars**: {{avg_stars}}

---

## 🔥 Trending Today

{{#trending_today}}
| Repository | Stars | Language | Last Trending |
|------------|-------|----------|---------------|
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{language}} | {{last_trending}} |
{{/trending_today}}

{{^trending_today}}
*No {{topic_name}} repositories trending today*
{{/trending_today}}

---

## ⭐ Most Starred

| Repository | Stars | Language | First Seen | Trending Days |
|------------|-------|----------|------------|---------------|
{{#most_starred}}
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{language}} | {{first_seen}} | {{trending_count}} |
{{/most_starred}}

---

## 📈 Trending This Week

{{#trending_week}}
| Repository | Stars | Language | Days Trending |
|------------|-------|----------|---------------|
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{language}} | {{days_trending}} |
{{/trending_week}}

---

## 🆕 New This Month

{{#new_month}}
| Repository | Stars | Language | First Seen |
|------------|-------|----------|------------|
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{language}} | {{first_seen}} |
{{/new_month}}

---

## 📅 Recent History

{{#recent_days}}
### [{{date}}](../archive/{{year}}/{{month}}/{{date}}.md)
- {{count}} repositories trending
- Top: {{top_repo}}

{{/recent_days}}

---

## 🏆 Hall of Fame

*Most frequently trending {{topic_name}} repositories*

| Repository | Trending Count | First Seen | Latest |
|------------|----------------|------------|--------|
{{#hall_of_fame}}
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | {{trending_count}} days | {{first_seen}} | {{last_seen}} |
{{/hall_of_fame}}

---

## 📊 Statistics

### Language Breakdown
{{#languages}}
- **{{name}}**: {{count}} repositories ({{percentage}}%)
{{/languages}}

### Trending Frequency
- **Daily Average**: {{daily_avg}} repositories
- **Peak Day**: {{peak_date}} ({{peak_count}} repositories)
- **Growth Rate**: {{growth_rate}}% this month

---

## 🔗 Related Topics

{{#related_topics}}
- [{{name}}]({{slug}}.md) ({{shared_repos}} shared repositories)
{{/related_topics}}

---

## 🔍 Browse All Repositories

{{#all_repositories}}
- [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) - {{description}}
{{/all_repositories}}

---

*Last updated: {{last_updated}}*