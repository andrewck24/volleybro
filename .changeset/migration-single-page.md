---
"volleybro": patch
---

### Changed

#### Infrastructure

- A Blueprint Migration Change is one page with a Review tab per shard; shard branches end in `-s<N>` and their commits carry a `Shard` trailer instead of `Migration`, and each shard's G2 checks only the scenarios assigned to it
- A Change page is written as one file per tab — `index.mdx` for the frontmatter, `proposal.mdx`, and `review.mdx` or `review-s<N>.mdx` — and the gate freezes each accepted file
- A Migration's header and card show its current shard, its gate, how many shards have merged and the totals; each shard's tab shows its own figures
- `pnpm blueprint:gate` starts a branch-preview build through the `cf` CLI after publishing, and prints the manual rebuild instruction when `cf` is not signed in
