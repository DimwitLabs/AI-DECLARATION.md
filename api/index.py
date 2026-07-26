import os
import re
from pathlib import Path
from typing import Literal, Optional

import httpx
import yaml
from fastapi import Body, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

app = FastAPI(
    title="AI-DECLARATION.md API",
    version="0.1.2",
    docs_url=None,
    openapi_url="/api/openapi.json",
    servers=[
        {"url": "https://ai-declaration.md"},
    ],
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])

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

LEVELS = ["none", "hint", "assist", "pair", "copilot", "auto"]
PROCESSES = ["design", "implementation", "testing", "documentation", "review", "deployment"]
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
def schema(format: Literal["json", "yaml"] = "json"):
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
    return validate(content)


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
    headers = {}
    if token := os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(headers=headers) as client:
        for source_file in SOURCE_FILES:
            res = await client.get(f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{source_file}")
            if res.status_code == 200:
                return {"repo": f"{owner}/{repo}", "found": True, "sourceFile": source_file, "result": validate(res.text)}

    return JSONResponse(status_code=404, content={"repo": f"{owner}/{repo}", "found": False, "sourceFile": None, "result": None})
