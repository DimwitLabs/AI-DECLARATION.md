# AI-DECLARATION.md API

Schema, validation, and detection API for the AI-DECLARATION.md spec. FastAPI, deployed to Vercel.

## Run locally

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn index:app --reload --port 8787
```

Docs at `http://localhost:8787/docs`

## Endpoints

- `GET /api/versions`: current spec version and every published version.
- `GET /api/levels`: valid levels, ordered by `rank`, with verbatim descriptions.
- `GET /api/processes`: valid processes with verbatim descriptions.
- `GET /api/schema`: JSON Schema for valid frontmatter. `?format=yaml` for YAML.
- `POST /api/validate`: body is raw file content, returns `{ valid, errors, warnings, notes, level, version }`.
- `GET /api/detect?owner=&repo=`: checks a GitHub repo for `AI-DECLARATION.md`/`CANDOR.md` and validates it.
- `GET /api/openapi.json`: the OpenAPI doc itself.
