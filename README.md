# AI-DECLARATION.md

[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)

## Summary
AI-generated code is a reality of our time and it is both a blessing and a curse. The problem is not the code in itself but transparency and clarity. At least, that is the working theory of this specification. The suggestion is simple: to invite everyone to include a structured `AI-DECLARATION.md` file like they include other files in a repository to make the AI-usage crystal clear _and_, more importantly, to make it a widespread convention to do so.

This is not to discourage usage of LLM- and other code-generation in the future. On the contrary, it is an enabler. When you declare what parts of the code were, in fact, generated, a skeptic can immediately look into just those parts to satisfy their urge to re-verify and double-check. And, it lets the creator showcase their skillset with code and their skillset with planning and other soft skills simultaneously and with clarity.

### Specification

An `AI-DECLARATION.md` file uses YAML frontmatter for structured fields, followed by a required `## Notes` section in the markdown body for human context. At minimum, it requires `version`, `level`, and a `## Notes` section.

Optionally, you can declare `processes`, each with their own level. The global `level` must be the highest level present. Any process not listed is assumed to be `none` implicitly. You can also list `components` (file paths or directories) with individual levels.

The specification formally defines `version`, `level`, `processes`, and `components`.

#### Levels

- `none`: No AI tools were used at any point.
- `hint`: AI autocomplete or inline suggestions only. The human writes all code. AI occasionally completes a line or block.
- `assist`: Human-led. AI is used on demand for specific tasks (generating a function, explaining code, drafting a test) but does not drive the work.
- `pair`: Active human-AI collaboration throughout. Contribution is roughly equal.
- `copilot`: AI implements while the human plans and reviews. The human defines what to build and validates the output, but the AI does most of the writing.
- `auto`: AI acts autonomously with minimal human direction. The human may steer at a high level or approve outcomes, but does not write or closely direct the code.

#### Processes

- `design`: Architecture, system design, and decision-making.
- `implementation`: Writing production code.
- `testing`: Writing tests, test plans, and quality assurance.
- `documentation`: Writing docs, comments, READMEs, and changelogs.
- `review`: Code review and pull request feedback.
- `deployment`: CI/CD configuration, infrastructure, and release scripts.

### Schema

The following YAML schema formally defines the structure of an `AI-DECLARATION.md` file. Use this to validate declarations or build tooling.

```yaml
type: object
required: [version, level]
definitions:
  level:
    type: string
    enum: [none, hint, assist, pair, copilot, auto]
properties:
  version:
    type: string
    pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$"
  level:
    $ref: "#/definitions/level"
  processes:
    type: object
    propertyNames:
      enum: [design, implementation, testing, documentation, review, deployment]
    additionalProperties:
      $ref: "#/definitions/level"
  components:
    type: object
    additionalProperties:
      $ref: "#/definitions/level"
additionalProperties: false
```

### Examples

Below, you will find some examples of different scenarios.

#### Simple

The simplest `AI-DECLARATION.md` requires `version`, `level`, and a `## Notes` section.

```markdown
---
version: "0.1.1"
level: none
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notes

- No AI tools were used.
```

```markdown
---
version: "0.1.1"
level: auto
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notes

- Claude Code was used to create the whole application.
```

#### With Processes

Use `processes` to granularly declare AI involvement per development phase. The global `level` must be the highest level present. Any process not listed is assumed to be `none` implicitly.

```markdown
---
version: "0.1.1"
level: auto
processes:
  design: auto
  testing: copilot
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notes

- AI drove architecture decisions and test generation. All output was reviewed by a human.
```

#### With Components

Use `components` to declare AI involvement for specific files or directories.

```markdown
---
version: "0.1.1"
level: auto
components:
  src/helpers: auto
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notes

- The helpers directory was fully generated. All other code is human-written.
```

## Badges

Add a badge to your `README` to declare your `AI-DECLARATION` level at a glance. Please note, this is just for convenience and to comply with the specification, you _must_ include an `AI-DECLARATION.md` file.

- [![AI-DECLARATION: none](https://img.shields.io/badge/䷼%20AI--DECLARATION-none-dcfce7?labelColor=dcfce7)](https://ai-declaration.md)
- [![AI-DECLARATION: hint](https://img.shields.io/badge/䷼%20AI--DECLARATION-hint-ecfccb?labelColor=ecfccb)](https://ai-declaration.md)
- [![AI-DECLARATION: assist](https://img.shields.io/badge/䷼%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3)](https://ai-declaration.md)
- [![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)
- [![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)
- [![AI-DECLARATION: auto](https://img.shields.io/badge/䷼%20AI--DECLARATION-auto-ede9fe?labelColor=ede9fe)](https://ai-declaration.md)

## FAQ

### What if I lie?
Well, that defeats the purpose entirely, doesn't it? The idea is for all of us to have a social contract that we can trust. If you see a repo with an `AI-DECLARATION.md` in it, you can use it as a single source of truth.

### Can I build tooling to generate this automatically?
Be my guest. I envision tooling to build it automatically as well as parse it. While I will do it at some point, I appreciate any or all contributions.

### Can I contribute a translation?
Absolutely! Please. Just fork the repository and add a `README_<locale>.md` e.g. `README_es.md`. Then, raise a PR. I'll take it from there.

### I want to suggest a change to the specification?
Well, good thing it is open-source then. I see the specification evolving naturally with feedback and PRs. So, let us all discuss.

### Do I need to include the file if I added a badge to my README?
Yes, the recommendation is to include an `AI-DECLARATION.md` as the primary source of truth. The badge in the `README` is just a glanceable way for someone to check that A, the `AI-DECLARATION.md` would be available and B, the level.

### What is the logo?
䷼ Hexagram 61 or Hexagram For Inner Truth (Unicode: `U+4DFC`) is one of 64 hexagrams in the Yi (I) Ching to illustrate principles where each line is either Yin (broken) or Yang (solid). ([source](https://en.wikipedia.org/wiki/List_of_hexagrams_of_the_I_Ching#Hexagram_61))
