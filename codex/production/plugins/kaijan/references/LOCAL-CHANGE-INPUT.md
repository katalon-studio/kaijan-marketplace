# Freeze a local change for independent risk review

Use the actual current source available under the user's task authority. This is
input preparation for the existing provided-snapshot contract, not a new analysis
method or permission to read other repositories/history.

1. Inspect the local staged and unstaged diff and the task's authorized file scope.
   Retain the original task and diff as context. Choose current source files that
   let the review interpret the change and consequential interactions; include
   relevant callers/state owners rather than favorable snippets. Report untracked,
   binary, deleted, unavailable or omitted files explicitly in coverage. Do not
   silently truncate or claim complete repository coverage.
2. Freeze each selected file's complete UTF-8 text as {filename, content, sha256}.
   sha256 is the lowercase SHA-256 of those exact UTF-8 content bytes. An optional
   source_path is an attested local identity; the tool does not open it.
3. Set source to kind provided-snapshot, an actual caller-assigned snapshot_id,
   and manifest_sha256. The manifest hashes UTF-8 JSON of filename/hash objects
   sorted by filename in JavaScript code-unit order. Preserve the original task
   text in optional work_item.content. A local task needs no fabricated source_url.

The following Node expression implements the producer's manifest encoding. It
only hashes the already captured files; it does not acquire or analyze source.

```js
import { createHash } from "node:crypto";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = files
  .map(({ filename, sha256 }) => ({ filename, sha256 }))
  .sort((a, b) =>
    a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0,
  );
const packet = {
  source: {
    kind: "provided-snapshot",
    snapshot_id: snapshotId,
    manifest_sha256: sha256(JSON.stringify(manifest)),
  },
  coverage: coverageDescription,
  work_item: { content: originalTask },
  files,
};
```

Check loki_capabilities_list and submit the packet with optional requestKey correlation and
mode direct through loki_change_risk_analyze. Use its advertised schema and
owning skill for the returned answer, transport cancellation, completed-answer continuation, errors and fees. Reuse the same
input/key after a lost reply; a changed snapshot is a new review condition.

This full-file mode provides current-file evidence, not a historical patch or a
verified behavioral result. Keep that distinction in interpretation. If both
comparison revisions are actual supplied commits, the existing Git-change packet
can instead retain their exact original patches and metadata. Never assign a
commit SHA to uncommitted bytes merely to fit that mode.

In Git-change mode, each textual `patch` contains the complete per-file hunk text
starting with `@@`, as returned in GitHub's changed-file `patch` field. Keep Git
file headers (`diff --git`, `index`, `---`, `+++`) outside it. Preserve all hunk
lines and counts, file metadata, null patches and coverage; never truncate source.
See the owning skill for a separately identified correction after a completed
`invalid_patch` refusal proves zero provider calls and zero unknown effects.
Keep the original packet and receipt. A lost reply or provider failure does not
prove that input correction is safe.
