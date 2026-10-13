# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This repository is a freshly initialized skeleton: it contains only `README.md` (title only), `.gitignore` (the standard GitHub Python template) and `.gitattributes`. There is no source code, build system, test suite or linter yet, so there are no build/test commands or architecture to document.

The `.gitignore` suggests the project is intended to be Python, but no language or tooling has been chosen in the repo itself.

## Skills and agents

- `.claude/skills/karpathy-guidelines/`: behavioral guidelines for writing, reviewing and refactoring code (think before coding, simplicity first, surgical changes, goal-driven execution).
- `.claude/agents/`: `pr-review` (diff review) and `test-writer` (writes tests in the project's existing style).
- `.claude/rules/`: path-gated rule files go here (e.g. one per directory once the codebase has structure); none yet.
- `.mcp.json`: team-shared MCP servers (empty). `CLAUDE.local.md` and `.claude/settings.local.json` are personal and gitignored.

Update this file once code lands, adding the build/lint/test commands (including how to run a single test) and the high-level architecture.
