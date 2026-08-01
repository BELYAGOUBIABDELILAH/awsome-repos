# {{full_name}}

> {{description}}

[View on GitHub]({{url}}) {{#homepage}}• [Homepage]({{homepage}}){{/homepage}}

---

## Quick Facts

| | |
|---|---|
| **Language** | {{language}} |
| **License** | {{license}} |
| **Stars** | ⭐ {{stars}} |
| **Forks** | 🍴 {{forks}} |
| **Trending Days** | {{trending_days}} |
| **Peak Rank** | #{{peak_rank}} |
{{#current_rank}}| **Current Rank** | #{{current_rank}} |{{/current_rank}}
| **First Seen** | {{first_seen}} |
| **Last Seen** | {{last_seen}} |
{{#latest_release}}| **Latest Release** | {{latest_release}} |{{/latest_release}}

---

## Best For

{{#best_for}}
`{{.}}` {{/best_for}}

---

## Works Great With

{{#works_with}}
- [{{name}}](../{{slug}}.md)
{{/works_with}}
{{^works_with}}
*Ecosystem data coming soon*
{{/works_with}}

---

## Alternatives

{{#alternatives}}
- [{{name}}](../{{slug}}.md){{#note}} — {{note}}{{/note}}
{{/alternatives}}
{{^alternatives}}
*Similar: Check repositories in {{language}} or {{primary_topic}}*
{{/alternatives}}

---

## Trending Timeline

{{#timeline}}
**{{date}}** — Rank #{{rank}}{{#stars_gained}} (+{{stars_gained}} ⭐){{/stars_gained}}  
{{/timeline}}

### Highlights

- **Peak Rank**: #{{peak_rank}}
- **Trending Days**: {{trending_days}}
- **Longest Streak**: {{longest_streak}} days

---

## Categories

### Topics
{{#topics}}
[`{{name}}`](../../topics/{{slug}}.md) {{/topics}}

### Curated Categories
{{#categories}}
`{{.}}` {{/categories}}

---

## Developer Card

{{developer_card}}

---

*Last updated: {{last_updated}}*  
*Data from {{data_points}} trending reports*
