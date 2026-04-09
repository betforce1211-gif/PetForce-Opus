# PetForce Documentation

## Overview

This directory contains all project documentation: developer guides, API references, user guides, runbooks, and configuration guides.

For agent-specific context about the Documentation team's role and conventions, see `docs/CLAUDE.md`.

## Sections

| Section | Purpose | Start here |
|---------|---------|------------|
| **API Reference** | All 15 tRPC router endpoints | [docs/api/README.md](api/README.md) |
| **Developer Guides** | Architecture, conventions, standards | [docs/dev/architecture.md](dev/architecture.md) |
| **User Guide** | End-user documentation | [docs/user-guide/README.md](user-guide/README.md) |
| **Configuration** | Environment, auth, database, deployment | [docs/config/](config/) |
| **Runbooks** | Operational procedures | [docs/runbooks/README.md](runbooks/README.md) |
| **ADRs** | Architecture Decision Records | [docs/adrs/README.md](adrs/README.md) |
| **Design Proposals** | In-progress architectural proposals | [docs/design/README.md](design/README.md) |
| **Execution Plans** | Implementation plans for active work | [docs/exec-plans/active/](exec-plans/active/) |

## Quick Reference

| I want to... | Read this |
|--------------|-----------|
| Add a new feature | `dev/conventions.md` + `api/README.md` |
| Understand the architecture | `dev/architecture.md` |
| Deploy to production | `runbooks/` |
| Set up my dev environment | `dev/setup.md` |
| Understand a past decision | `adrs/README.md` |

## Generated Content

If automated doc generation is added in the future (e.g., API docs from tRPC schemas, type docs from Zod), generated files go in `docs/generated/` and must not be manually edited. That directory will be created when the first generated content exists.
