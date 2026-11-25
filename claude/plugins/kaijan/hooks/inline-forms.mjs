const unavailable =
  "Kaijan could not open the form. Check your Kaijan connection and try again.";

const requests = {
  feedback:
    "Open a private Kaijan feedback draft. I will write and review the feedback.",
  issue:
    "Help me report a problem with Kaijan itself. Open a draft for me to review before I send it.",
};

export function createReportForms() {
  const forms = new Map();
  let bridge, child, selectedForm, opening;
  let generation = 0;

  async function connect(host) {
    const current = generation;
    const thread = await host.sessionId();
    if (current !== generation) throw Error(unavailable);
    const stream = host.start(thread);
    child = stream;
    let line = "";
    for await (const fragment of {
      [Symbol.asyncIterator]: () => ({ next: () => stream.next() }),
    }) {
      if (fragment.stream !== "stdout") continue;
      line += fragment.text;
      if (!line.includes("\n")) continue;
      const identity = JSON.parse(line);
      if (child !== stream) throw Error(unavailable);
      return identity;
    }
    throw Error(unavailable);
  }

  async function request(host, input) {
    if (!bridge) {
      const pending = connect(host).catch((error) => {
        if (bridge === pending) bridge = undefined;
        throw error;
      });
      bridge = pending;
    }
    const { socketPath, token } = await bridge;
    const reply = await host.fetch({
      socketPath,
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!reply.ok) throw Error(unavailable);
    return JSON.parse(reply.text);
  }

  const fields = {
    feedback: [
      ["title", "Title", 1],
      ["description", "Feedback", 4],
    ],
    issue: [
      ["title", "Title", 1],
      ["description", "Observed behavior", 4],
      ["context", "Context (optional)", 3],
      ["expectedBehavior", "Expected behavior (optional)", 3],
      ["steps", "Steps (optional, one per line)", 3],
    ],
  };

  function actions(host, id, active, runId) {
    const { Box, Button } = host.elements;
    const open = async (kind) => {
      if (!active() || opening) return;
      const current = generation;
      opening = true;
      try {
        const text =
          kind === "feedback" && runId
            ? `${requests.feedback} Offer the details for Run ${runId}.`
            : requests[kind];
        const result = await host.submit(text);
        if (result.drop) throw Error(result.drop);
      } catch {
        if (active()) host.warnForm();
      } finally {
        if (current === generation) opening = false;
      }
    };
    return [
      Box({
        flexDirection: "row",
        gap: "md",
        children: [
          ["feedback", "Kaijan feedback"],
          ["issue", "Report issue"],
        ].map(([kind, label]) =>
          Button({
            key: `kaijan-${kind}-${id}`,
            label,
            plain: true,
            onPress: () => open(kind),
          }),
        ),
      }),
    ];
  }

  async function openDraft(host, callId, kind, active, runId) {
    if (!active() || forms.get(selectedForm)?.busy) return false;
    const state = forms.get(kind) ?? { kind, edits: {} };
    state.callId = callId;
    state.error = undefined;
    state.placement = undefined;
    state.visible = false;
    state.busy = true;
    forms.set(kind, state);
    selectedForm = kind;
    try {
      if (!state.draft) {
        const draft = await request(host, {
          kind,
          operation: "open",
          ...(runId && { runId }),
        });
        state.draft = draft.draft;
        state.error = draft.error ? draft.message : undefined;
      }
      if (!active() || !state.draft || state.error) return false;
      const opened = await host.openForm(kind, callId);
      if (opened?.deny || !active()) return false;
      state.placement = opened?.requestId;
      state.visible = true;
      return true;
    } catch {
      state.error = unavailable;
      return false;
    } finally {
      state.busy = false;
      if (active()) host.redraw();
    }
  }

  function view(host, active, placement) {
    const state = forms.get(selectedForm);
    if (!state?.visible || state.placement !== placement) return undefined;
    const id = state.callId;
    const { Box, Button, Input, Text, Link } = host.elements;
    const redraw = () => {
      if (active()) host.redraw();
    };
    const change = async (operation, changes, imageId) => {
      if (!active()) return false;
      const draft = state.draft;
      const result = await request(host, {
        kind: state.kind,
        operation,
        ...(draft && { draftId: draft.id, revision: draft.revision }),
        ...(changes && { changes }),
        ...(imageId && { imageId }),
      });
      if (result.draft) state.draft = result.draft;
      state.error = result.error ? result.message : undefined;
      return !result.error;
    };
    const act = async (callback) => {
      if (
        state.busy ||
        !active() ||
        !state.visible ||
        selectedForm !== state.kind ||
        forms.get(state.kind) !== state ||
        id !== state.callId
      )
        return;
      state.busy = true;
      state.error = undefined;
      redraw();
      try {
        await callback();
      } catch {
        state.error = unavailable;
        if (state.draft && state.submission) {
          state.error =
            "Kaijan could not confirm the submission. Keep this draft and check its status.";
        }
      } finally {
        state.busy = false;
        redraw();
      }
    };
    const field = (key) => state.edits[key] ?? state.draft?.fields[key];
    const issue = state.kind === "issue";
    const trackedIssue = issue && state.draft?.publicationRoute === "tracking";
    const closed = ["saved", "published"].includes(state.draft?.status);
    const receipt = state.draft?.receipt;
    const reference = issue
      ? state.draft?.reportReceipt?.reference
      : receipt?.id;
    const run = issue ? undefined : state.draft?.context?.run;
    const includeRun = Boolean(field("includeRun"));
    const busy = state.busy;
    const recover = state.submission && !closed;
    const submissionAction = () => {
      if (!issue) return "send";
      if (state.submission) return "status";
      return state.reviewed ? "publish" : "preview";
    };
    const shownAction = submissionAction();
    const shownRevision = state.draft?.revision;
    const caption = (text) => Text({ children: [text] });
    const button = (key, label, callback) =>
      Button({
        key: `kaijan-${key}-${id}`,
        label,
        onPress: () => act(callback),
      });
    const update = async () => {
      const changes = { ...state.edits };
      if (changes.steps !== undefined)
        changes.steps = changes.steps
          .split("\n")
          .map((step) => step.trim())
          .filter(Boolean);
      if (Object.keys(changes).length && !(await change("update", changes)))
        return false;
      state.edits = {};
      return true;
    };
    const dismiss = async () => {
      if (!closed && !recover && state.draft) {
        if (issue) {
          if (!(await change("close_review"))) return;
          forms.delete(state.kind);
        } else if (!(await update())) return;
      }
      state.visible = false;
      if (selectedForm === state.kind) selectedForm = undefined;
      if (!placement) await host.closeForm();
    };
    const submit = async (action, recovering) => {
      // Bind the press to the action on the rendered button. A delayed or
      // repeated Preview callback cannot become a Publish confirmation.
      if (
        action !== submissionAction() ||
        shownRevision !== state.draft?.revision ||
        recovering !== Boolean(state.submission) ||
        ["saved", "published"].includes(state.draft?.status)
      )
        return;
      if (recovering) {
        await change(action);
        return;
      }
      if (!field("title")?.trim() || !field("description")?.trim()) {
        state.error = "Enter a title and a description.";
        return;
      }
      if (action !== "publish" && !(await update())) return;
      if (action === "preview") {
        if (await change("preview")) state.reviewed = true;
        return;
      }
      state.submission = true;
      await change(action);
    };
    const inputs =
      state.draft && !closed
        ? fields[state.kind].map(([key, label, rows]) => {
            const value = field(key);
            const text = Array.isArray(value)
              ? value.join("\n")
              : (value ?? "");
            if (state.reviewed || recover) return caption(`${label}\n${text}`);
            const edit = (value) => {
              if (
                !active() ||
                state.busy ||
                !state.visible ||
                selectedForm !== state.kind ||
                forms.get(state.kind) !== state ||
                id !== state.callId ||
                state.reviewed ||
                state.submission
              )
                return;
              state.edits[key] = value;
            };
            return Box({
              flexDirection: "column",
              alignItems: "stretch",
              gap: "sm",
              children: [
                caption(label),
                Input({
                  key: `kaijan-form-${key}-${id}`,
                  placeholder: label,
                  value: text,
                  // Desktop fixes single-row inputs to 180 px. Its text area
                  // fills the form width, including for the title.
                  rows: host.desktop && rows === 1 ? 2 : rows,
                  onInput: edit,
                  onSubmit: edit,
                }),
              ],
            });
          })
        : [];
    const selectedImages = state.draft?.fields.images ?? [];
    const images =
      issue && state.draft && !closed
        ? [
            Text({ weight: "semibold", children: ["Images"] }),
            ...selectedImages.map((image) =>
              Box({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "sm",
                children: [
                  caption(image.name),
                  ...(!state.reviewed && !recover && !busy
                    ? [
                        button(`remove-image-${image.id}`, "Remove", () =>
                          change("remove_image", undefined, image.id),
                        ),
                      ]
                    : []),
                ],
              }),
            ),
            ...(!state.reviewed && !recover && !busy
              ? [
                  button("choose-images", "Choose images", () =>
                    change("choose_images"),
                  ),
                  caption(
                    "PNG, JPEG or WebP. Up to 5 images, 5 MiB each and 20 MiB total.",
                  ),
                ]
              : []),
          ]
        : [];
    return Box({
      flexDirection: "column",
      borderStyle: "round",
      padding: "md",
      gap: "sm",
      children: [
        Text({
          weight: "semibold",
          children: [issue ? "Report a Kaijan issue" : "Kaijan feedback"],
        }),
        caption(
          issue
            ? state.draft?.repository
              ? "Selected text and images will be public in katalon-studio/kaijan-marketplace."
              : "Selected text and images will be shared with the Kaijan team."
            : "Draft kept on this device. Select Send when ready.",
        ),
        ...(host.terminal && !placement && !closed && !recover
          ? [caption("Ctrl+X then Tab to edit.")]
          : []),
        ...inputs,
        ...images,
        ...(state.draft?.context && !issue && !closed
          ? [
              caption("Private feedback to Kaijan."),
              caption(
                `Included: Kaijan ${state.draft.context.pluginVersion} · ${state.draft.context.os}.`,
              ),
              ...(run && !recover
                ? [
                    button(
                      "include-run",
                      `Include Run details: ${includeRun ? "On" : "Off"}`,
                      async () => {
                        state.edits.includeRun = !includeRun;
                      },
                    ),
                    ...(includeRun
                      ? [
                          caption(`Run reference: ${run.operationId}`),
                          ...(run.errorCode
                            ? [caption(`Error code: ${run.errorCode}`)]
                            : []),
                        ]
                      : []),
                  ]
                : []),
            ]
          : []),
        ...(state.error ? [caption(state.error)] : []),
        ...(closed
          ? [
              issue && receipt?.url
                ? Link({ href: receipt.url, label: "Open published issue" })
                : caption(issue ? "Issue saved." : "Feedback saved."),
              ...(reference ? [caption(`Reference: ${reference}`)] : []),
              ...(reference && host.copy
                ? [
                    button("copy-reference", "Copy reference", async () => {
                      const result = await host.copy(reference);
                      state.notice = result.isCopied
                        ? "Reference copied."
                        : "Select and copy the reference.";
                    }),
                  ]
                : []),
              ...(state.notice ? [caption(state.notice)] : []),
            ]
          : []),
        ...(busy
          ? [caption("Working…")]
          : [
              Box({
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "sm",
                children: [
                  button(
                    "form-dismiss",
                    closed ? "Close" : issue ? "Cancel" : "Not now",
                    dismiss,
                  ),
                  ...(state.draft && !closed
                    ? [
                        ...(state.reviewed && !recover
                          ? [
                              button("form-edit", "Edit", async () => {
                                state.reviewed = false;
                              }),
                            ]
                          : []),
                        button(
                          "form-submit",
                          recover
                            ? issue
                              ? "Check status"
                              : "Retry send"
                            : issue
                              ? state.reviewed
                                ? trackedIssue
                                  ? "Send issue"
                                  : "Publish issue"
                                : "Preview issue"
                              : "Send",
                          () => submit(shownAction, Boolean(recover)),
                        ),
                        ...(recover &&
                        trackedIssue &&
                        state.draft.status === "selected"
                          ? [
                              button("retry-issue", "Retry submission", () =>
                                change("publish"),
                              ),
                            ]
                          : []),
                      ]
                    : []),
                ],
              }),
            ]),
      ],
    });
  }

  async function close() {
    generation++;
    forms.clear();
    selectedForm = undefined;
    opening = false;
    const current = child;
    child = undefined;
    bridge = undefined;
    await current?.return().catch(() => {});
  }

  return { actions, openDraft, view, close, request };
}
