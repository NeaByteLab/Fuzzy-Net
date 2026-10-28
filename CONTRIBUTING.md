# Contributing to Fuzzy-Net

This page says what we take, where to send it, and the few rules that keep the repo easy to maintain.

## Types of Contributions

### Documentation

Typo fixes, clearer wording, better examples, and extra guides for [`README.md`](./README.md) are welcome, as long as the change stays small and keeps the current tone.

### Bug Reports

Found a missed match, a false hit, a score that does not match the documented rules, or a broken example? [Open an issue](https://github.com/NeaByteLab/Fuzzy-Net/issues) with a small reproduction: the document list, the query, and the `FuzzyResult[]` you expected next to the one you got.

### Proposals, Questions, and Feedback

Want a new option, an API change, or a design discussion? [Start a discussion](https://github.com/NeaByteLab/Fuzzy-Net/discussions) instead of opening an issue, because issues are for defects we can fix and discussions are for ideas.

Start from a search that actually failed, since every new option is something every caller has to learn and the bar for adding one is high. If you are unsure, leave it out.

> **Not sure where to post?** Use Discussions, and if it turns out to be a real defect we will turn it into an issue.

### The Engine (`src/`)

`src/` is small on purpose: it turns strings into packed document bits and ranks a query by how many hashed features overlap, without reading files or making network calls. The only runtime dependency is `@neabyte/byte-tokenizer`.

A refactor that keeps search results the same and makes the code easier to read is welcome, but a new scoring stage or a new kind of feature needs a discussion first. If you say typo coverage got better, show a query the current engine misses, because an edit-distance argument is not enough.

### Not Accepted Yet

While the engine is still early, these are out of scope:

- **Files and network**, because loading a corpus is the caller's job.
- **Edit-distance scoring**, because rank comes from feature overlap, so Levenshtein, Jaro, and n-gram distance are out.
- **Saved or incremental indexes**, because the table is built once in the constructor.
- **Large rewrites**, because we only take small changes.

If you are not sure something fits, open a Discussion before writing the code.

## Development Setup

The engine and the tests run on Deno:

```bash
# Format, lint, and type-check the source
deno task check

# Run the tests
deno task test
```

The npm build uses [unbuild](https://github.com/unjs/unbuild):

```bash
npm install
npm run build
```

## Submitting Changes

1. Fork the repository.
2. Branch off `main`.
3. Make the change, then run `deno task check` and `deno task test`.
4. Open a pull request against `main`, and say what changed and why.

Keep each pull request to one change and link the related issue or discussion. If the change alters which string wins, paste the `search()` result before and after.

## AI-Assisted Contributions

Using an AI assistant to help with a contribution is fine if you say so in the pull request or the issue, and say roughly how you used it, for example: "An assistant drafted the digest loop, then I reviewed it and rewrote the score path."

This is enough:

> Parts of this PR were drafted with an AI assistant, then reviewed and edited by hand.

Typos, whitespace, and dead links do not need a disclosure.

Code that looks generated and is not disclosed is hard to review, and we may close it without merging.

### What Makes Review Easier

- Say if an assistant helped.
- Understand every line you changed, well enough to explain it.
- Say why the change is needed, in a few lines.
- Include a query and a document list that show the new behaviour, or the bug it fixes.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](./LICENSE).
