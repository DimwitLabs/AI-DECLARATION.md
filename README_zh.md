# AI-DECLARATION.md

[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)

## 概述

现实是我们已经无法避免AI生成代码。它既带来了巨大的便利，也带来了问题。问题不在于代码本身，而在于透明度和清晰度。至少，这份规范正是基于这一前提。我们的建议非常简单：正如你在项目仓库中包含其他文件一样，也请包含一份结构化的 `AI-DECLARATION.md` 文件。通过这种方式，你可以清晰透明地声明 AI 的使用情况，更重要的是，我们希望将这种实践推广为开发者社区的普遍共识。

这并非要阻止未来使用 LLM 或其他代码生成工具。恰恰相反，这是一项促进因素。当你声明了代码的哪些部分确实是由 AI 生成的，持怀疑态度的人就可以直接聚焦于这些部分，进行复核与交叉验证。同时，它也让创作者能够同时、清晰地展示自己的编码能力以及规划和其他软技能。

### 规范

`AI-DECLARATION.md` 文件使用 YAML Front Matter 定义结构化数据，随后在 Markdown 正文中必须包含 `## Notes`（备注）部分，以提供人类可读的上下文。至少需要包含 `version`、`level`和 `## Notes` 部分。

你也可以选择声明开发 `processes`，并为每个过程指定独立的级别。全局 `level` 必须是其中最高的级别。未列出的过程将隐式视为 `none`。你还可以按 `components`（文件路径或目录）列出级别。

本规范正式定义了 `version`、`level`、`processes` 和 `components`。

#### Level (AI辅助级别)

这些级别不仅涵盖代码生成，还包括代码审查等相关活动。它们由 `Human`（人类）、`AI`、`task`（任务）等实体，以及 `act`（执行）和 `prompt`（提示）等动词组合定义。

- `none`：人类独立完成任务，无 AI 参与。
- `hint`：人类执行任务，AI 被动提供建议。
- `assist`：人类给出提示，AI 执行任务的某一部分。
- `pair`：人类给出提示，人类与 AI 平等协作完成任务；人类对内部实现有清晰理解。
- `copilot`：人类给出提示，AI 执行整个任务，并向人类请求许可或澄清。
- `auto`：人类给出提示，AI 自主完成任务直至结束。

#### Processes (开发阶段)

- `design`：架构设计、系统设计与决策。
- `implementation`：编写生产代码。
- `testing`：编写测试、测试计划与质量保证。
- `documentation`：编写文档、注释、README 和变更日志。
- `review`：代码审查与 Pull Request 反馈。
- `deployment`：CI/CD 配置、基础架构与发布脚本。

### Schema

以下 YAML Schema 正式定义了 `AI-DECLARATION.md` 文件的结构。请使用此 Schema 验证声明文件或构建相关工具。

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

### 示例

以下是不同场景的示例。

#### 基础示例

最简单的 `AI-DECLARATION.md` 需要包含 `version`、`level` 和 `## Notes` 部分。

```markdown
---
version: "0.1.1"
level: none
---

本文件基于 [AI-DECLARATION.md](https://ai-declaration.md/zh/0.1.1) 规范编写。

## Notes

- 未使用任何 AI 工具。
```

```markdown
---
version: "0.1.1"
level: auto
---

本文件基于 [AI-DECLARATION.md](https://ai-declaration.md/zh/0.1.1) 规范编写。

## Notes

- 使用 Claude Code 开发了整个应用。
```

#### 使用 `processes`

使用 `processes` 为各开发阶段精细声明 AI 参与度。全局 `level` 必须是所列过程中最高的级别。未列出的过程将隐式视为 `none`。

```markdown
---
version: "0.1.1"
level: auto
processes:
  design: auto
  testing: copilot
---

本文件基于 [AI-DECLARATION.md](https://ai-declaration.md/zh/0.1.1) 规范编写。

## Notes

- AI 主导了架构决策和测试代码生成。所有输出均经过人工审查。
```

#### 使用 `components`

使用 `components` 为特定文件或目录声明 AI 参与度。

```markdown
---
version: "0.1.1"
level: auto
components:
  src/helpers: auto
---

本文件基于 [AI-DECLARATION.md](https://ai-declaration.md/zh/0.1.1) 规范编写。

## Notes

- helpers 目录下的代码完全由 AI 生成。其余代码均为人工编写。
```

## 徽章

将徽章添加到项目的 `README` 中，可让人一目了然地了解 `AI-DECLARATION` 级别。请注意，徽章仅为便利的可视化工具，为符合规范，你**必须**在项目中包含 `AI-DECLARATION.md` 文件。

- [![AI-DECLARATION: none](https://img.shields.io/badge/䷼%20AI--DECLARATION-none-dcfce7?labelColor=dcfce7)](https://ai-declaration.md)
- [![AI-DECLARATION: hint](https://img.shields.io/badge/䷼%20AI--DECLARATION-hint-ecfccb?labelColor=ecfccb)](https://ai-declaration.md)
- [![AI-DECLARATION: assist](https://img.shields.io/badge/䷼%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3)](https://ai-declaration.md)
- [![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)
- [![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)
- [![AI-DECLARATION: auto](https://img.shields.io/badge/䷼%20AI--DECLARATION-auto-ede9fe?labelColor=ede9fe)](https://ai-declaration.md)

## 常见问题

### 如果在声明文件中撒谎会怎样？
那样的话，这项声明就毫无意义了，不是吗？这项倡议的核心在于我们所有人能够建立一种可信赖的社会契约。如果仓库中包含了 `AI-DECLARATION.md`，任何人都可以将其作为单一的真实来源来信赖。

### 我可以构建工具来自动生成该文件吗？
请便。我预计会有人构建自动生成和解析的工具。虽然我迟早也会做，但对于任何和所有的贡献，我深表感激。

### 我想贡献翻译，该怎么做？
当然可以！请随时贡献。只需 Fork 本仓库，添加 `README_<语言代码>.md` 文件，例如 `README_es.md`，然后提交 PR，我会跟进处理。

### 我想对规范提出修改建议？
很好，这就是它开源的原因。我认为规范会随着反馈和 PR 自然地演进。所以，让我们一起讨论吧。

### 如果已在 README 中添加了徽章，还需要包含声明文件吗？
是的，建议将 `AI-DECLARATION.md` 文件作为首要的真实来源。README 中的徽章只是一种快速浏览的方式，让访问者确认 (A) 项目中有 `AI-DECLARATION.md`，以及 (B) 项目的 AI 使用级别。

### 徽标有什么含义？
䷼ 是第 61 卦——中孚卦（Unicode: `U+4DFC`），是《易经》六十四卦之一，每一爻为阴（断线）或阳（实线）。（[来源](https://en.wikipedia.org/wiki/List_of_hexagrams_of_the_I_Ching#Hexagram_61)）
