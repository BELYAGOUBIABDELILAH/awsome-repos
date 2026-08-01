# Contributing to Ecosystem Data

Help improve repository passports and hidden gem discovery.

---

## What is Ecosystem Data?

Ecosystem data powers:
- **"Works Great With"** sections in passports
- **"Alternatives"** listings
- **"Best For"** use case tags
- Hidden gem relevance scoring

All data is **human-curated** and stored in editable JSON files.

---

## Quick Start

### 1. Find a Repository

Look at `repos/` folder for passports that need better ecosystem data.

### 2. Choose What to Add

- **Works With**: Complementary repositories and technologies
- **Alternatives**: Similar projects solving the same problem
- **Use Cases**: What the project is best for

### 3. Edit the JSON File

See examples below.

### 4. Validate

```bash
npm run validate-ecosystem
```

### 5. Submit Pull Request

Include context about your changes.

---

## File Structure

```
data/ecosystem/
├── works-with.json      ← Integrations and complements
├── alternatives.json    ← Alternative solutions
└── use-cases.json       ← Best use cases
```

---

## Adding Integrations

**File**: `data/ecosystem/works-with.json`

### Example Entry

```json
{
  "langchain-ai/langchain": {
    "works_with": [
      "openai/openai-python",
      "anthropics/anthropic-sdk-python",
      "chroma-core/chroma",
      "pinecone-io/pinecone-client"
    ],
    "complements": [
      "LLMs",
      "Vector Databases",
      "RAG",
      "AI Agents"
    ]
  }
}
```

### Rules

- Use **full repository names** (`owner/repo`)
- List projects that **integrate directly**
- Include **technology categories** in complements
- Focus on **complementary**, not competitive

---

## Adding Alternatives

**File**: `data/ecosystem/alternatives.json`

### Example Entry

```json
{
  "langchain-ai/langchain": {
    "alternatives": [
      "hwchase17/semantic-kernel",
      "prefecthq/marvin"
    ],
    "category": "LLM Framework",
    "note": "LangChain emphasizes chains; alternatives focus on different abstractions"
  }
}
```

### Rules

- Only list **true alternatives** (solve same problem)
- Keep `note` **objective** and **brief**
- Focus on **differences**, not comparisons
- **Do NOT** rank or judge quality

---

## Adding Use Cases

**File**: `data/ecosystem/use-cases.json`

### Example Entry

```json
{
  "langchain-ai/langchain": {
    "best_for": [
      "LLM Applications",
      "RAG",
      "AI Agents",
      "Chatbots",
      "Document Q&A"
    ],
    "use_cases": [
      "Building chatbots with memory",
      "Retrieval-augmented generation",
      "Multi-step AI workflows",
      "Document question answering"
    ]
  }
}
```

### Rules

- `best_for`: Short category tags
- `use_cases`: Specific applications (1-2 sentences)
- Focus on **what it excels at**
- Be **specific and actionable**

---

## Guidelines

### Do ✅

- Add projects you **personally use**
- Verify integrations **actually work**
- Keep descriptions **factual**
- Include **both popular and niche** projects
- Focus on **developer value**

### Don't ❌

- Add projects you haven't researched
- Make subjective quality judgments
- Include promotional language
- Add every remotely related project
- Copy descriptions from marketing materials

---

## Validation

Before submitting:

```bash
# Validate JSON syntax and schema
npm run validate-ecosystem
```

**Checks**:
- ✅ Valid JSON syntax
- ✅ Required fields present
- ✅ Repository references valid
- ✅ Arrays properly formatted

---

## Review Process

1. **Submit PR** with ecosystem changes
2. **Automatic validation** runs
3. **Maintainer review** for accuracy
4. **Merge** if valid
5. **Next generation run** incorporates changes

---

## Examples of Good Contributions

### Adding New Repository

```json
{
  "new/project": {
    "works_with": ["related/project"],
    "complements": ["Technology"],
    "alternatives": [],
    "best_for": ["Use Case"],
    "use_cases": ["Specific application"]
  }
}
```

### Improving Existing Entry

**Before**:
```json
{
  "works_with": ["vague/reference"]
}
```

**After**:
```json
{
  "works_with": [
    "specific/integration",
    "another/tool",
    "framework/library"
  ],
  "complements": ["Technology", "Platform", "Tool"]
}
```

---

## Common Questions

### How many "works with" entries should I add?

**3-8 is ideal**. Focus on the most important integrations.

### Should I add competitors to "works with"?

**No**. Use "alternatives" for competing projects.

### Can I add commercial products?

**Yes**, if they integrate with the repository. Focus on the integration, not promotion.

### What if I'm unsure about an alternative?

**Skip it**. Only add alternatives you're confident about.

### How do I handle multiple similar projects?

**Pick the most relevant**. Quality over quantity.

---

## Impact

Your contributions improve:
- 🎫 **Repository Passports** → Better ecosystem context
- 💎 **Hidden Gem Discovery** → More relevant matches
- 🔍 **Developer Research** → Faster decision-making

---

## Getting Help

- **Questions?** Open an issue
- **Uncertain?** Ask in PR comments
- **Examples?** Check existing entries

---

**Thank you for contributing!** 🙏

Every addition helps developers discover and evaluate projects faster.

---

*Part of GitHub Trending Explorer*
