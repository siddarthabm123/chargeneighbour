# Pitch presentation source

The public ten-slide deck is `public/ChargeNeighbour-pilot-pitch.pptx`. It contains editable text, native comparison/economics tables and source notes. Targets are proposed; the deck claims no customer, host or session traction. The cover is the repository's AI concept image.

`create-deck.mjs` uses the Codex bundled `@oai/artifact-tool` runtime rather than adding a production dependency. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL_DIR` and `PYTHON_EXECUTABLE` to the installed runtime and Presentations skill directories. Run with Node 24:

```sh
node docs/pitch/create-deck.mjs . /path/to/pitch-build
```

Follow the installed Presentations skill's operation-start workflow before generating a new deliverable. The script renders ten slide PNGs and validates package integrity, geometry, typography and first-party import before publishing its output. Visually review every rendered slide. It does not execute native PowerPoint. Copy only the finalized output into `public/` and keep its assumptions synchronized with `public/pitch-brief.md`.

The 20 October 2026 mobile release updates slides 3 and 9 to the actual alternative-map journey and launch dependencies. The remaining eight rendered slides are pixel-identical to the previously reviewed version. The updated slides passed visual review and the finalized deck passed integrity/layout/import checks. Final SHA-256: `1340f0ca4d87abb99dc1592472962dfd4628b4803ebf10636d7aec798ea604d5`.
