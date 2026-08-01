# Hidden Gems

> Discover promising repositories with low stars but high potential

---

## {{period_name}}

**Period**: {{period_start}} to {{period_end}}  
**Gems Found**: {{gem_count}}

---

{{#gems}}
### {{rank}}. [{{full_name}}](../../repos/{{owner}}/{{name}}.md)

**{{description}}**

| | |
|---|---|
| ⭐ **Stars** | {{stars}} |
| 💻 **Language** | {{language}} |
| 🏆 **Gem Score** | {{gem_score}}/100 |
| 📈 **Trending Days** | {{trending_days}} |
| 📅 **First Seen** | {{first_seen}} |

**Why it's a gem**: {{gem_reason}}

**Best for**: {{#best_for}}`{{.}}` {{/best_for}}

[View Passport](../../repos/{{owner}}/{{name}}.md) • [GitHub]({{url}})

---

{{/gems}}

## Scoring Methodology

Hidden Gems are identified using a weighted scoring algorithm:

- **Low Popularity** (25%): Repositories with fewer than {{max_stars}} stars
- **Recent Growth** (25%): Strong star velocity and engagement
- **Trending Appearances** (20%): Featured on GitHub trending
- **Repository Activity** (15%): Recent commits and updates
- **Contributors** (10%): Active contributor base
- **Community Engagement** (5%): Forks, topics, and ecosystem integration

**Minimum criteria**: {{min_stars}}+ stars, {{min_trending_days}}+ trending days, active within {{commit_window}} days

---

*Generated: {{generated_at}}*  
*Configuration: [hidden-gems.json](../../config/hidden-gems.json)*
