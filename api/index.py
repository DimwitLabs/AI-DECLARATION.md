import logging
import os
import re
import sys
from pathlib import Path
from typing import Literal, Optional

import httpx
import yaml
from fastapi import Body, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

_logger = logging.getLogger("ai-declaration")
if not _logger.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_handler)
    _logger.setLevel(logging.INFO)
    _logger.propagate = False


def log(component: str, message: str, *, level: int = logging.INFO) -> None:
    _logger.log(level, "[%s]: %s", component, message)


PUBLISHED_VERSIONS = ["0.1.0", "0.1.1", "0.1.2"]
SPEC_VERSION = PUBLISHED_VERSIONS[-1]

app = FastAPI(
    title="AI-DECLARATION.md API",
    version=SPEC_VERSION,
    docs_url=None,
    openapi_url="/api/openapi.json",
    servers=[
        {"url": "https://ai-declaration.md"},
    ],
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])

log("api", f"starting, spec version {SPEC_VERSION}")
if not os.environ.get("GITHUB_TOKEN"):
    log("api", "GITHUB_TOKEN is not set; /api/detect will use unauthenticated rate limits", level=logging.WARNING)

CSS_PATH = Path(__file__).parent / "swagger-theme.css"
NO_CACHE = {"Cache-Control": "no-store"}


@app.get("/docs", include_in_schema=False)
def custom_docs():
    html = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title}: Docs",
        swagger_ui_parameters={"docExpansion": "list"},
    ).body.decode()
    head = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800'
        '&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
        '<link rel="stylesheet" href="/swagger-theme.css">'
    )
    html = html.replace("</head>", f"{head}</head>")
    return HTMLResponse(html, headers=NO_CACHE)


@app.get("/swagger-theme.css", include_in_schema=False)
def swagger_theme():
    return Response(content=CSS_PATH.read_text(), media_type="text/css", headers=NO_CACHE)

LEVEL_DESCRIPTIONS = {
    "none": "Human acts on the task alone with no AI involvement.",
    "hint": "Human acts on the task and the AI surfaces suggestions passively.",
    "assist": "Human prompts and the AI acts on a part of the task.",
    "pair": "Human prompts as both human and AI both act on the task equally; Human understands internals clearly.",
    "copilot": "Human prompts and AI acts on the whole task, prompting the Human for permission or clarification.",
    "auto": "Human prompts and AI acts autonomously bringing the task to completion.",
}

PROCESS_DESCRIPTIONS = {
    "design": "Architecture, system design, and decision-making.",
    "implementation": "Writing production code.",
    "testing": "Writing tests, test plans, and quality assurance.",
    "documentation": "Writing docs, comments, READMEs, and changelogs.",
    "review": "Code review and pull request feedback.",
    "deployment": "CI/CD configuration, infrastructure, and release scripts.",
}

LEVELS = list(LEVEL_DESCRIPTIONS)
PROCESSES = list(PROCESS_DESCRIPTIONS)
SOURCE_FILES = ["AI-DECLARATION.md", "CANDOR.md"]
Level = Literal["none", "hint", "assist", "pair", "copilot", "auto"]


class Frontmatter(BaseModel):
    model_config = {"extra": "forbid"}

    version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$")
    level: Level
    processes: Optional[dict[str, str]] = None
    components: Optional[dict[str, str]] = None


class ValidationResult(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "valid": False,
                "errors": ['A "## Notes" section is required in the body of the file.'],
                "warnings": [],
                "notes": ['Extra heading "## Usage" found.'],
                "level": "copilot",
                "version": "0.1.2",
            }
        }
    }

    valid: bool
    errors: list[str]
    warnings: list[str]
    notes: list[str]
    level: Optional[str]
    version: Optional[str]


class DetectResult(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "repo": "DimwitLabs/AI-DECLARATION.md",
                "found": True,
                "sourceFile": "AI-DECLARATION.md",
                "result": {
                    "valid": True,
                    "errors": [],
                    "warnings": [],
                    "notes": [],
                    "level": "copilot",
                    "version": "0.1.2",
                },
            }
        }
    }

    repo: str
    found: bool
    sourceFile: Optional[str]
    result: Optional[ValidationResult]


def _version_is_quoted(raw: str) -> Optional[bool]:
    """Whether the frontmatter's version value is written as a quoted string.

    YAML reads an unquoted `0.1.2` as a string anyway (two dots is not a number), so this
    cannot be detected after parsing -- it has to be read off the raw text.
    """
    m = re.search(r"^\s*version\s*:\s*(.*)$", raw, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip().startswith(('"', "'"))


SAMPLE_DECLARATION = (
    '---\n'
    'version: "0.1.2"\n'
    'level: copilot\n'
    'processes:\n'
    '  design: pair\n'
    '  implementation: copilot\n'
    '---\n'
    '\n'
    '## Notes\n'
    '\n'
    '- Describe how AI was used in this project.\n'
)


def validate(text: str) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    stripped = text.strip()
    m = re.match(r"^---\r?\n(.*?)\r?\n---(?:\r?\n|$)", stripped, re.DOTALL)
    if not m:
        return ValidationResult(valid=False, errors=["No valid YAML frontmatter found. The file must begin with ---."], warnings=[], notes=[], level=None, version=None)

    raw, body = m.group(1), stripped[m.end():]

    try:
        data = yaml.safe_load(raw) or {}
    except yaml.YAMLError as e:
        return ValidationResult(valid=False, errors=[f"Frontmatter could not be parsed as YAML: {e}"], warnings=[], notes=[], level=None, version=None)

    if not isinstance(data, dict):
        data = {}

    level = data.get("level") if isinstance(data.get("level"), str) else None
    version = data.get("version") if isinstance(data.get("version"), str) else None
    fm: Optional[Frontmatter] = None

    try:
        fm = Frontmatter(**data)
    except Exception as e:
        if hasattr(e, "errors"):
            errors.extend(err["msg"] for err in e.errors())
        else:
            errors.append(str(e))

    if fm:
        order = {l: i for i, l in enumerate(LEVELS)}
        max_proc = -1
        for name, lvl in (fm.processes or {}).items():
            if name not in PROCESSES:
                errors.append(f'Unknown process "{name}"; allowed processes are: {", ".join(PROCESSES)}.')
            elif lvl not in LEVELS:
                errors.append(f'Invalid level "{lvl}" for process "{name}".')
            else:
                max_proc = max(max_proc, order[lvl])

        for path, lvl in (fm.components or {}).items():
            if lvl not in LEVELS:
                errors.append(f'Invalid level "{lvl}" for component "{path}".')

        if fm.level in order and max_proc > order[fm.level]:
            warnings.append(f'Global "level" is "{fm.level}" but a process has level "{LEVELS[max_proc]}". The global level must be the highest level present.')

        if fm.version not in PUBLISHED_VERSIONS:
            warnings.append(
                f'"{fm.version}" is not a published version of the specification. '
                f'The current version is "{SPEC_VERSION}".'
            )

        if _version_is_quoted(raw) is False:
            warnings.append(f'"version" should be a quoted string, e.g. version: "{fm.version}".')

    headings = []
    for line in body.splitlines():
        hm = re.match(r"^(#{1,6})\s+(.+)$", line)
        if hm:
            headings.append((len(hm.group(1)), hm.group(2).strip()))

    notes_h = next((h for h in headings if h[1].lower() == "notes"), None)
    if not notes_h:
        errors.append('A "## Notes" section is required in the body of the file.')
    elif notes_h[0] != 2:
        errors.append(f'"Notes" must be an h2 heading (##). Found at level {notes_h[0]} ({"#" * notes_h[0]}).')

    for lvl, htext in headings:
        if htext.lower() != "notes":
            notes.append(f'Extra heading "{"#" * lvl} {htext}" found.')

    return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings, notes=notes, level=level, version=version)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


class VersionsResult(BaseModel):
    model_config = {"json_schema_extra": {"example": {"current": "0.1.2", "published": ["0.1.0", "0.1.1", "0.1.2"]}}}

    current: str
    published: list[str]


class LevelInfo(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"name": "copilot", "rank": 4, "description": LEVEL_DESCRIPTIONS["copilot"]}
        }
    }

    name: str
    rank: int
    description: str


class ProcessInfo(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"name": "design", "description": PROCESS_DESCRIPTIONS["design"]}
        }
    }

    name: str
    description: str


@app.get(
    "/api/levels",
    tags=["Endpoints"],
    summary="Levels",
    response_model=list[LevelInfo],
    response_description="Every level, ordered from least to most AI involvement.",
    description=(
        "The levels of AI involvement, with their descriptions taken verbatim from the "
        "specification. `rank` orders them from least (`0`) to most involvement, which is "
        "what the rule \"the global level must be the highest level present\" refers to. "
        "Present the descriptions as-is; do not rephrase them."
    ),
)
def levels():
    return [
        {"name": name, "rank": rank, "description": description}
        for rank, (name, description) in enumerate(LEVEL_DESCRIPTIONS.items())
    ]


@app.get(
    "/api/processes",
    tags=["Endpoints"],
    summary="Processes",
    response_model=list[ProcessInfo],
    response_description="Every process that may be declared, with its description.",
    description=(
        "The processes that may be given their own level under `processes`, with their "
        "descriptions taken verbatim from the specification. Any process not declared is "
        "implicitly `none`."
    ),
)
def processes():
    return [{"name": name, "description": description} for name, description in PROCESS_DESCRIPTIONS.items()]


@app.get(
    "/api/versions",
    tags=["Endpoints"],
    summary="Versions",
    response_model=VersionsResult,
    response_description="The current specification version, and every published version.",
    description=(
        "Which versions of the specification exist. Use `current` when writing a new "
        "`AI-DECLARATION.md`; `published` is every version ever released, oldest first."
    ),
)
def versions():
    return {"current": SPEC_VERSION, "published": PUBLISHED_VERSIONS}


@app.get(
    "/api/schema",
    tags=["Endpoints"],
    summary="Schema - JSON / YAML",
    description=(
        "The canonical JSON Schema for `AI-DECLARATION.md` frontmatter: the valid levels, "
        "processes, and required fields. Returns JSON by default; pass `format=yaml` for the "
        "same schema serialised as YAML."
    ),
    responses={
        200: {
            "description": "The frontmatter schema.",
            "content": {
                "application/json": {
                    "schema": {"type": "object"},
                    "example": Frontmatter.model_json_schema(),
                },
                "application/yaml": {
                    "schema": {"type": "string"},
                    "example": yaml.dump(Frontmatter.model_json_schema(), sort_keys=False),
                },
            },
        }
    },
)
def schema_endpoint(format: Literal["json", "yaml"] = "json"):
    data = Frontmatter.model_json_schema()
    if format == "yaml":
        return Response(content=yaml.dump(data, sort_keys=False), media_type="application/yaml")
    return data


@app.post(
    "/api/validate",
    response_model=ValidationResult,
    tags=["Endpoints"],
    summary="Validate",
    response_description="Validation result.",
    description=(
        "Validate raw `AI-DECLARATION.md` (or `CANDOR.md`) content against the specification. "
        "Send the file's contents as the plain-text request body."
    ),
)
async def validate_endpoint(
    content: str = Body(..., media_type="text/plain", examples=[SAMPLE_DECLARATION]),
):
    result = validate(content)
    log(
        "validate",
        f"{'valid' if result.valid else 'invalid'} "
        f"(level={result.level}, version={result.version}, "
        f"errors={len(result.errors)}, warnings={len(result.warnings)})",
    )
    return result


@app.get(
    "/api/detect",
    tags=["Endpoints"],
    summary="Detect",
    response_model=DetectResult,
    response_description="The repository's declaration file and its validation result.",
    description=(
        "Look up a public GitHub repository, fetch its `AI-DECLARATION.md` or `CANDOR.md` "
        "if present, and validate it. Returns 404 if the repo has neither file."
    ),
    responses={404: {"model": DetectResult, "description": "No declaration file found in the repository."}},
)
async def detect(owner: str, repo: str):
    full_name = f"{owner}/{repo}"
    headers = {}
    if token := os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"

    log("detect", f"looking up {full_name}")

    async with httpx.AsyncClient(headers=headers) as client:
        for source_file in SOURCE_FILES:
            try:
                res = await client.get(f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{source_file}")
            except httpx.HTTPError as e:
                log("detect", f"{full_name}/{source_file} fetch failed: {e}", level=logging.ERROR)
                continue
            if res.status_code == 200:
                result = validate(res.text)
                log("detect", f"{full_name} found {source_file} (valid={result.valid}, level={result.level})")
                return {"repo": full_name, "found": True, "sourceFile": source_file, "result": result}

    log("detect", f"{full_name} has no declaration file")
    return JSONResponse(status_code=404, content={"repo": full_name, "found": False, "sourceFile": None, "result": None})

