# {{language_name}} Repositories

*All trending {{language_name}} repositories tracked in this archive*

---

## 📊 Overview

- **Total Repositories**: {{total_count}}
- **First Seen**: {{first_date}}
- **Last Updated**: {{last_date}}

---

## 🔥 Trending Today

{{#trending_today}}
| Repository | Stars | First Seen | Trending Days |
|------------|-------|------------|---------------|
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{first_seen}} | {{trending_count}} |
{{/trending_today}}

{{^trending_today}}
*No {{language_name}} repositories trending today*
{{/trending_today}}

---

## 🆕 New Repositories (Last 30 Days)

{{#new_repositories}}
| Repository | Stars | First Seen | Description |
|------------|-------|------------|-------------|
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{first_seen}} | {{description}} |
{{/new_repositories}}

{{^new_repositories}}
*No new {{language_name}} repositories in the last 30 days*
{{/new_repositories}}

---

## ⭐ Most Starred

| Repository | Stars | First Seen | Trending Days |
|------------|-------|------------|---------------|
{{#most_starred}}
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | ⭐ {{stars}} | {{first_seen}} | {{trending_count}} |
{{/most_starred}}

---

## 🔥 Most Frequently Trending

| Repository | Trending Days | Stars | First Seen | Last Seen |
|------------|---------------|-------|------------|-----------|
{{#most_frequent}}
| [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) | {{trending_count}} | ⭐ {{stars}} | {{first_seen}} | {{last_seen}} |
{{/most_frequent}}

---

## 📋 All {{language_name}} Repositories

{{#all_repositories}}
- [{{owner}}/{{name}}](../repos/{{owner}}/{{name}}.md) - {{description}}
{{/all_repositories}}

---

*Last updated: {{last_updated}}*