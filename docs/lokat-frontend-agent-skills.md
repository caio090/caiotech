# Lokat frontend agent skills

## Purpose

This setup gives Codex and Claude Code project-scoped guidance for GSAP and Three.js. It does not install either runtime library and does not change application code.

Audit date: 2026-07-28.

## Audited sources

### GSAP

- Repository: `https://github.com/greensock/gsap-skills.git`
- Audited commit: `aed9cfd3277740755f6bfc1155c7aa645403b760`
- Declared license: MIT, with a root `LICENSE` file.
- Skills: `gsap-core`, `gsap-frameworks`, `gsap-performance`, `gsap-plugins`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils`.
- Intended use: animation fundamentals, timelines, ScrollTrigger, React cleanup, framework lifecycle, utilities and performance.

### Three.js

- Repository: `https://github.com/CloudAI-X/threejs-skills.git`
- Audited commit: `b1c623076c661fc9b03dac19292e825a5d106823`
- Declared license: MIT in the README; the audited commit does not include a root `LICENSE` file.
- Skills: `threejs-animation`, `threejs-fundamentals`, `threejs-geometry`, `threejs-interaction`, `threejs-lighting`, `threejs-loaders`, `threejs-materials`, `threejs-postprocessing`, `threejs-shaders`, `threejs-textures`.
- Intended use: scenes, geometry, materials, lighting, textures, animation, loaders, shaders, post-processing and interaction.

The Three.js README incorrectly recommends cloning `pinkforest/threejs-playground`. Lokat must not follow that instruction. Only `CloudAI-X/threejs-skills` is approved here.

## Security audit

The skill files are Markdown instructions and examples. No repository script was executed. The audit found no secret-reading request, environment-variable printing, upload command, destructive Git command, force push, database change, binary, hook or automatic dependency installer.

The Three.js loader examples contain public CDN URLs for Draco and Basis decoders. They are examples, not commands run by this setup. Any future implementation must review asset provenance, Content Security Policy, cleanup/disposal, render loops, resize behavior, device pixel ratio, SSR and reduced motion.

The skills CLI reported elevated heuristic risk for `threejs-interaction` and medium heuristic risk for loader/texture guidance. Manual review found ordinary event-listener, raycasting and external asset-loading examples, with no agent-side execution instruction. These skills remain approved as guidance, but generated code still requires normal code review.

## Installation

Run from the repository root:

```powershell
.\scripts\install-lokat-frontend-skills.ps1
```

Preview the commands without changing files:

```powershell
.\scripts\install-lokat-frontend-skills.ps1 -DryRun
```

The script uses `npx skills add` with `--copy`, `--yes`, explicit agents and no `--global`. Expected destinations are:

- Codex: `.agents/skills/`
- Claude Code: `.claude/skills/`

Installed copies and `skills-lock.json` are intentionally ignored. The script and this document are the reproducible source of truth.

## Updating

1. Resolve and record the new repository SHAs.
2. Clone both repositories under ignored `.tmp/` paths.
3. Re-audit every `SKILL.md`, executable, manifest, URL and shell instruction.
4. Run `npx skills add <repository> --list` and compare the detected names.
5. Update the SHAs and risks in this document.
6. Run the installer script and restart Codex and Claude Code.

Do not update skills and implement animation in the same agent session. A restart is required so the new guidance is loaded cleanly.
