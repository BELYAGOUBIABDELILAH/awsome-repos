# GitHub Trending — {{date_formatted}}

Discover what developers were building on this day.

---

## 📊 Summary

- **Total Repositories**: {{total_count}}
- **Languages**: {{language_count}}
- **New Repositories**: {{new_count}}
- **Returning Repositories**: {{returning_count}}

---

{{#languages}}
## {{icon}} {{name}}

| Repository | Description | Stars | Language | Topics |
|------------|-------------|-------|----------|--------|
{{#repositories}}
| [{{owner}}/{{name}}]({{url}}) | {{description}} | ⭐ {{stars}} | {{language}} | {{topics}} |
{{/repositories}}

{{^repositories}}
*No {{name}} repositories trending today*
{{/repositories}}

{{/languages}}

---

## 🔥 Most Starred Today

| Repository | Stars | Language | Description |
|------------|-------|----------|-------------|
{{#top_starred}}
| [{{owner}}/{{name}}]({{url}}) | ⭐ {{stars}} | {{language}} | {{description}} |
{{/top_starred}}

---

## 🆕 New Discoveries

*First time trending*

| Repository | Stars | Language | Description |
|------------|-------|----------|-------------|
{{#new_repositories}}
| [{{owner}}/{{name}}]({{url}}) | ⭐ {{stars}} | {{language}} | {{description}} |
{{/new_repositories}}

---

## 🏷️ Trending Topics

{{#trending_topics}}
- **{{name}}** ({{count}} repositories)
{{/trending_topics}}

---

## 📈 Statistics

### Language Distribution
{{#language_stats}}
- **{{name}}**: {{count}} repositories ({{percentage}}%)
{{/language_stats}}

### Star Range
- **Highest**: {{max_stars}} stars
- **Average**: {{avg_stars}} stars
- **Lowest**: {{min_stars}} stars

---

## 🔗 Navigation

- **Previous Day**: [{{prev_date}}]({{prev_url}})
- **Next Day**: [{{next_date}}]({{next_url}})
- **Archive Index**: [Browse All Days](../../)
- **Topics**: [Browse by Topic](../../../topics/)
- **Languages**: [Browse by Language](../../../languages/)

---

*Browse other trending days: [Archive](../../) · [Topics](../../../topics/) · [Languages](../../../languages/)*