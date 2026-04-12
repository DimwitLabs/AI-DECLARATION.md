# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2-rc] - Unreleased

### Added

- Add `This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.2)` attribution line in examples above the `## Notes` section. ([#11](https://github.com/DimwitLabs/AI-DECLARATION.md/pull/11))
- Site improvements: dropdowns, missing translation page, missing version page, mobile site tweaks. ([#9](https://github.com/DimwitLabs/AI-DECLARATION.md/pull/9))
- YAML schema for tooling and validation. ([#12](https://github.com/DimwitLabs/AI-DECLARATION.md/pull/12))

## [0.1.1] - 2026-04-06

### Changed

- Renamed from `CANDOR.md` to `AI-DECLARATION.md` after feedback from the [Reddit Discussion](https://www.reddit.com/r/selfhosted/comments/1sgizki/suggestion_candormd_an_open_convention_to_declare/).

## [0.1.0] - 2026-04-06

### Added

- Initial specification defining six AI involvement levels: `none`, `hint`, `assist`, `pair`, `copilot`, `auto`.
- Six process categories: `design`, `implementation`, `testing`, `documentation`, `review`, `deployment`.
- YAML frontmatter format with required `version`, `level`, and `## Notes` section.
- Optional `processes` and `components` fields for granular declarations
- Shields.io badges support for all six levels.
- Landing page at `site/` with full specification, examples, badges, and FAQ.
- `CANDOR.md` self-declaration for this repository.
- MIT License.
