# Research notes — human review with AI agents (collected 2026-09-17)

Method: WebSearch + WebFetch only. X/Twitter pages return 402/403 to fetch; tweet text below comes from search-result previews and secondary articles that quote them. Marked [PREVIEW] or [SECONDARY] accordingly.

## A. Robert C. Martin (Uncle Bob), 2026

### Primary posts (X)
1. 2026-07-23 — https://x.com/unclebobmartin/status/2080257779395154409 [SECONDARY quotes: explainx.ai, raphamoura.dev, startupfortune]
   - "My current strategy is to not read any of the code written by my agents." "What I do instead is to surround the agents with extreme constraints."
   - "My agents write the unit tests. I don't review those. They also write the gherkin acceptance tests and the QA procedures. I review those."
   - Constraints: unit tests, Gherkin acceptance tests, QA procedures, quality metrics, mutation testing, test coverage, "a plethora of others". "Messy code slows my agents down ... So I don't let them create those tangles. I constrain the hell out [of function size and complexity]."
   - "Humans are slow at code. To get productivity we humans need to disengage from code and manage from a higher level."
   - "In the end, I have very high confidence in the code they produce because they've had to run the gauntlet of all these constraints and tests."
   - Admits: two years ago he did not believe AI would become this capable.
   - ~15K likes in a day; HN: https://news.ycombinator.com/item?id=49032822
2. 2026-07-30 — TDD stance [PREVIEW via pastorsoto.substack.com]: "TDD is a human discipline. I don't expect agents to follow it. I DO expect agents to write unit tests as carefully and comprehensively as a human would" — enforced by running coverage, CRAP, and mutation tests.
3. April 2026 — https://x.com/unclebobmartin/status/2044114698451476492 [PREVIEW]: "I don't review code written by agents. I measure things like test coverage, dependency structure, cyclomatic complexity, module sizes, mutation testing, etc. Much can be inferred about the quality of the code from those metrics. The code itself I leave to the AI. Humans …"
   - Grady Booch reply: "Trust but verify. As an experienced developer, I know the smell of what is good and what is not. And no agent has either the experience or the context to know those things." He reviews all generated code: metrics give confidence of functionality, none about vulnerabilities, dead code eroding understandability, missed factorizations with performance impact.
4. Early 2026 — https://x.com/unclebobmartin/status/2023158252700066287 [PREVIEW]: "TDD is very inefficient for AIs. Testing is essential for them but not in the micro steps that the three laws of TDD recommend. Principles remain the same but techniques must be adjusted to fit the different 'mind' of the AI. Think of the AI as a highly focused idiot savant…"
5. ~April 2026 — swarm-forge: https://github.com/unclebob/swarm-forge (tweet https://x.com/unclebobmartin/status/2046350013706523093). Agent roles = his review taxonomy made concrete: specifier (Gherkin), coder (TDD), cleaner (DRY + CRAP reviews), architect (guards dependency direction), hardener (mutation testing), QA (verifies). Human operator: starts work, inspects, handles approval gates, answers clarifications, stops swarm. Constitution articles: engineering (testability, acceptance pipeline, quality-tool guardrails), workflow (worktree discipline), handoffs.
6. O'Reilly live event "AI Agents for Clean Code with Uncle Bob Martin": https://www.oreilly.com/live-events/ai-agents-for-clean-code-with-uncle-bob-martin/0642572376765/ — covers TDD with agents, unit/acceptance/mutation testing, code-quality analysis, dependency checking, building from static specs, generating acceptance tests. (date not captured)
7. blog.cleancoder.com: NOT FOUND — last post Jan 2023; no 2025–2026 posts.

### Secondary analyses
- explainx.ai (July 2026): https://www.explainx.ai/blog/uncle-bob-ai-coding-gauntlet-tests-not-reviews-july-2026 — table: impl code & unit tests: agent writes, nobody reviews; Gherkin + QA procedures: agent writes, Martin reviews; final manual test: Martin.
- cctest.ai: https://cctest.ai/en/articles/uncle-bob-s-ai-coding-experiment-less-line-by-line-review-but-architecture-still-needs-humans — cites "a recent podcast conversation" (no link): AI still produces flawed architecture/module boundaries/dependency structure; favoured loop = implement small slice → human reviews and refactors the architecture → next slice. Metrics don't prove requirements complete or catch security/perf/evolution risk.
- raphamoura.dev: https://raphamoura.dev/en/blog/o-direito-de-nao-ler-o-codigo/ — reading moves to "oracles" (spec, acceptance criteria, test contracts, mutation scores); spec changes still need a human approval gate.
- note.com/masakielastic: https://note.com/masakielastic/n/n7e99b032df74 — "not reading code" is an outcome of a mature gauntlet, not a starting point; order: requirements/risks → acceptance criteria as tests → verify test effectiveness → QA + observability → then shrink manual review.
- pastorsoto.substack: https://pastorsoto.substack.com/p/how-to-trust-ai-code-without-actually — Bob's beginner recipe: toy project, inspect for dead code/long functions/duplication, then coverage → mutation (mutmut) → CRAP < 6.
- startupfortune: https://startupfortune.com/uncle-bob-martin-says-he-no-longer-reads-ai-generated-code-and-the-developer-world-is-split/
- akitaonrails 2026-04-20: https://akitaonrails.com/en/2026/04/20/clean-code-for-ai-agents/ — not Bob's own words; reframes Clean Code for agent readers (small files <500 lines, why-comments kept).

### NOT FOUND
- No explicit Bob list about naming/readability review for agent code — his position is that those are enforced by metrics (CRAP, complexity, module size), not human eyes.
- No verbatim full-thread text (X blocked); no podcast transcript link.

## B. Thariq Shihipar (@trq212) — "The Unreasonable Effectiveness of HTML"
- Personal page + 20 examples: https://thariqs.github.io/html-effectiveness/ (2026-05-08; Simon Willison linked it 2026-05-08: https://simonwillison.net/2026/May/8/)
- claude.com blog version "Using Claude Code: The Unreasonable Effectiveness of HTML" (2026-05-20): https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html
- X article mirror: https://x.com/trq212/article/2052809885763747935 ; follow-up tweet: https://x.com/trq212/status/2053632475294040084 ("I've been using HTML for planning, speccing, exploration, code review, reports and a lot more.")
- Coverage: InfoQ 2026-06-24 https://www.infoq.com/news/2026/06/anthropic-html-markdown-agent/ ; explainx https://explainx.ai/blog/unreasonable-effectiveness-html-claude-code-thariq-2026 ; blakecrosley https://blakecrosley.com/blog/html-is-the-format-agents-want ; critique thread Eric Wang https://x.com/ericwang42/status/2053034389244973252 ("half right ... we don't really edit what agents spit out anymore, we just review it. So yeah, optimize the output for the reviewer.")

Core argument:
- We no longer edit agent output; we review it and prompt for edits. So optimise the artifact for the reviewer. "I tend to not actually read more than a 100-line Markdown file." "there is almost no set of information that Claude can read that you cannot efficiently represent with HTML."
- Good for: code review (rendered diffs with severity-coded inline annotations, module flowcharts, PR explainers), specs/planning (side-by-side option comparison, timelines), reports/research (tabs, collapsibles, SVG diagrams), custom throwaway editors (draggable boards, flag toggles) with export buttons (copy-as-JSON / copy-as-prompt) to feed decisions back into the loop.
- Costs: 2–4× tokens vs Markdown (he argues large context windows make this cheap relative to the readability gain); HTML diffs clutter git; security/infra risk of unsafe HTML (raised by critics); worse source readability.
- Warnings: don't use HTML everywhere — Markdown stays right for short factual answers, terminal-bound output, and version-controlled docs where clean diffs matter. Keep artifacts out of the main tree (`.artifacts/` dir) or export to Markdown. Don't build one god-file: multiple files per project, not one giant page. Motive is engagement: "I wanted a way to stay engaged with its choices rather than just hand them off."
- Principle on size: single-file, self-contained, purpose-built, throwaway artifacts for one decision — not reusable tools. Example set is 20 independent .html files opened directly in a browser.
- InfoQ notes: personal view, not official Anthropic guidance; secondary posts claim Claude Code changed defaults toward HTML (pasqualepillitteri.it — unverified, fetch failed).

## C. OpenAI Symphony
- Post 2026-04-27: https://openai.com/index/open-source-codex-orchestration-symphony/ ; repo https://github.com/openai/symphony ; SPEC https://github.com/openai/symphony/blob/main/SPEC.md
- Coverage: InfoQ 2026-05-17 https://www.infoq.com/news/2026/05/openai-symphony-agents/ ; tessl 2026-04-29 https://tessl.io/blog/openai-open-sources-symphony-a-spec-for-orchestrating-codex-agents ; Better Stack https://betterstack.com/community/guides/ai/openai-symphony/
- What: a SPEC.md (+ Elixir reference impl) for a daemon that polls an issue tracker (Linear/GitHub), takes tickets in configured "active states" with required labels, creates an isolated per-issue workspace, runs a Codex agent to completion, and updates the ticket. Workflow policy lives in-repo in WORKFLOW.md (prompt + runtime settings versioned with code).
- Philosophy quotes: "manage work instead of supervising coding agents"; "we were orienting our system around coding sessions and merged PRs, when PRs and sessions are really a means to an end"; "we stopped supervising agents directly and instead let them pull work from our task tracker"; "engineers became micromanagers for AI agents" was the problem. Zach Brock: agents' goal becomes "convince a human to merge this code".
- Where humans intervene: (1) writing the ticket (PM/designer can file directly; they "get back a review packet"); (2) a workflow-defined handoff state, e.g. `Human Review` — a successful run ends there, not at Done; (3) PR review with agent-supplied proof of work: CI status, review feedback, complexity analysis, walkthrough videos; (4) changing ticket state/labels to interrupt or re-dispatch. Everything else — CI watching, rebasing, conflict resolution, flaky-check retries, backoff — is agent/daemon work. Spec explicitly does not mandate an approval/sandbox policy; implementations document their trust posture.
- Claimed result: landed PRs +500% in first three weeks.

## D. mattpocock/skills
- README: https://github.com/mattpocock/skills/blob/main/README.md ; engineering README: https://github.com/mattpocock/skills/blob/main/skills/engineering/README.md ; router: skills/engineering/ask-matt/SKILL.md ; to-tickets, implement SKILL.md
- Intro: "My agent skills that I use every day to do real engineering - not vibe coding." Skills are "small, easy to adapt, and composable." Two kinds: user-invoked (orchestrate, e.g. /grill-me) and model-invoked (reusable discipline the agent reaches for itself).
- Sequence (ask-matt map): /grill-with-docs → (optional /handoff → /prototype → /handoff back) → /to-spec → /to-tickets → /implement (runs /tdd at pre-agreed seams, typecheck + single test files often, full suite once at end) → /code-review (two axes: standards + spec) → commit. Periodic /improve-codebase-architecture. "Keep steps 1–3 in one unbroken context window." "Each /implement then starts fresh, working from the ticket."
- Single-session work: skip /to-spec and /to-tickets, go straight to /implement in the same context. Multi-session: spec + tickets must exist before splitting across windows.
- Planning docs vs code: specs are publish-to-tracker artifacts (/to-spec "Turn the current conversation into a spec and publish it to the issue tracker"), not repo files; tickets are tracer-bullet vertical slices "sized to fit in a single fresh context window", "demoable or verifiable on its own", with genuine blocking edges; published one-per-ticket to tracker or `.scratch/` local files — never as one combined doc; explicitly warns against planning docs longer than necessary. Shared vocabulary lives in CONTEXT.md (domain model), not in long plans. Guiding line: "Always take small, deliberate steps. The rate of feedback is your speed limit."
- NOT FOUND: a literal "the code is the plan" quote; his view is expressed structurally (spec→tickets→fresh-context implement) rather than as a slogan.
