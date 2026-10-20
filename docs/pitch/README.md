# Pitch presentation source

The public ten-slide deck is `public/ChargeNeighbour-pilot-pitch.pptx`. It contains editable text, native comparison/economics tables and source notes. Targets are proposed; the deck claims no customer, host or session traction. The cover is the repository's AI concept image.

`create-deck.mjs` uses the Codex bundled `@oai/artifact-tool` runtime rather than adding a production dependency. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL_DIR` and `PYTHON_EXECUTABLE` to the installed runtime and Presentations skill directories. Run with Node 24:

```sh
node docs/pitch/create-deck.mjs . /path/to/pitch-build
```

Follow the installed Presentations skill's operation-start workflow before generating a new deliverable. The script renders ten slide PNGs and validates package integrity, geometry, typography and first-party import before publishing its output. Visually review every rendered slide. It does not execute native PowerPoint. Copy only the finalized output into `public/` and keep its assumptions synchronized with `public/pitch-brief.md`.

The 20 October 2026 presentation passed those checks, all slides were reviewed, and the session arithmetic was independently checked. Final SHA-256: `00d7b6ef65a064af22a5fa813a6addc9dc1b19c8c64717db1801d505fc7500fd`.
