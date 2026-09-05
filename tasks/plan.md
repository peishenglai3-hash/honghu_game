# Implementation Plan: Chapter 2 Choice Posters and Phaser Baseline Handoff

## Overview

Complete the three Chapter 2 choice-result poster flows using the supplied poster assets and the existing Chapter 1/Chapter 3 result-panel pattern. Keep the current Phaser build behavior and story/state systems unchanged outside this narrow presentation addition. After verification, publish the stable Phaser baseline to GitHub and the existing public server. Only after that handoff, perform three read-only architecture/engine/strategy audits for a possible Cocos Creator to Electron transition; migration work is explicitly out of scope until human review.

## Architecture Decisions

- Preserve the current Phaser 3.90 + Vite + Vue/Pinia runtime as the production baseline for this change.
- Map posters by semantic node (`GROUP`, `MATERIALS`, `FLASHBACK`) instead of ambiguous numeric order; the source folder names identify the three authored nodes.
- Reuse `showResult`/`advanceResult` so the poster is shown before the existing authored feedback and does not alter choice values, flags, saves, or convergence.
- Keep the supplied PEM at `C:\Users\35636\Downloads\更新.pem`; use only a restricted temporary working copy during deployment and remove that copy afterward.
- Treat the Cocos Creator/Electron work as a decision-support investigation only. No engine conversion, Electron shell, or production routing change is authorized in this phase.

## Task List

### Phase 1: Source and baseline lock

- [ ] Task 1: Reconcile the Chapter 2 source document, choice definitions, and supplied A-D poster folders.
- [ ] Task 2: Confirm the clean baseline commit, existing user files, build/test entry points, and deployment rollback target.

### Checkpoint: Baseline

- [ ] Three Chapter 2 formal choice nodes are identified without changing their authored order or state effects.
- [ ] Existing untracked release artifacts remain untouched.
- [ ] Any source/code name discrepancy is recorded instead of silently rewritten.

### Phase 2: Chapter 2 poster presentation

- [ ] Task 3: Copy the 12 supplied poster images into stable project asset paths without modifying the originals.
- [ ] Task 4: Add semantic Chapter 2 poster mapping and call the existing result panel after each of the three choices.
- [ ] Task 5: Add focused poster contract/runtime assertions for all A-D paths and the result-to-feedback handoff.

### Checkpoint: Feature verification

- [ ] All poster files are non-empty PNGs with expected authored dimensions or documented exceptions.
- [ ] Selecting any A-D choice in each Chapter 2 node displays the matching poster.
- [ ] Advancing the poster resumes the pre-existing feedback and subsequent scene transition.
- [ ] Build and relevant content/system/E2E checks pass; unrelated failures are reported separately.

### Phase 3: Stable Phaser handoff

- [ ] Task 6: Review the focused diff across correctness, readability, architecture, security, and performance.
- [ ] Task 7: Commit and push the verified Phaser baseline to GitHub.
- [ ] Task 8: Build locally, upload an incremental release, validate hashes, atomically switch the public server, and retain the previous release for rollback.

### Checkpoint: Stable release

- [ ] GitHub `main` points to the verified commit.
- [ ] Public HTTP checks return the new index and representative Chapter 2 poster assets.
- [ ] Previous server release remains available and the original PEM is unchanged.

### Phase 4: Decision-support investigation

- [ ] Task 9: Dispatch one read-only subagent for code architecture and migration seams.
- [ ] Task 10: Dispatch one read-only subagent for engine/runtime/platform compatibility and current Cocos Creator facts.
- [ ] Task 11: Dispatch one read-only subagent for maintenance, release operations, and long-term Phaser → Cocos Creator → Electron strategy.
- [ ] Task 12: Synthesize evidence, risks, staged PoC scope, exit criteria, rollback plan, and open decisions for human review.

### Checkpoint: Human decision gate

- [ ] Three reports are returned and reconciled.
- [ ] No migration or Electron production code has been changed.
- [ ] The user explicitly approves or rejects the proposed transition plan before any conversion work.

## Risks and Mitigations

| Risk                                                             | Impact | Mitigation                                                                                                                          |
| ---------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Poster node numbering is confused with story chronology          | Medium | Use semantic node names and verify each scene's actual choice handler.                                                              |
| Poster dimensions differ between supplied folders                | Low    | Preserve source pixels, use the existing `object-fit: contain` result panel, and assert each delivered file.                        |
| Result input advances the wrong state                            | High   | Add result-mode handling to the two Chapter 2 scene paths and verify feedback begins only after the poster is dismissed.            |
| Large asset upload or incomplete server copy                     | High   | Build locally, upload only changed files, compare local/remote SHA-256, stage from current, and atomically switch after `nginx -t`. |
| Cocos/Electron research drifts or overstates support             | High   | Use current primary documentation, label unknowns, and keep the plan gated behind a bounded PoC and human approval.                 |
| Source document and existing code use different historical names | Medium | Do not silently rewrite stable content in a poster-only change; record the discrepancy for a separate content decision.             |

## Open Questions

- Which historical name should be authoritative for the Chapter 2 target in a future content-lock revision: the document's `涂老五`, its earlier `余老三`, or the current runtime's `杜老三`?
- Which Cocos Creator version, WeChat/Douyin account path, and desktop packaging targets should be used if the user approves a bounded migration PoC?
