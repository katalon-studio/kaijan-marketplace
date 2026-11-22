const unavailable =
  "Kaijan could not open the form. Check your Kaijan connection and try again.";

const requests = {
  feedback:
    "Open a private Kaijan feedback draft. I will write and review the feedback.",
  issue:
    "Help me report a problem with Kaijan itself to katalon-studio/kaijan-marketplace. Prepare a draft for me to review. Do not publish it.",
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

  function actions(host, id, active) {
    const { Box, Button } = host.elements;
    const open = async (kind) => {
      if (!active() || opening) return;
      const current = generation;
      opening = true;
      try {
        const result = await host.submit(requests[kind]);
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

  async function openDraft(host, callId, kind, active) {
    if (!active() || forms.get(selectedForm)?.busy) return false;
    const state = forms.get(kind) ?? { kind, edits: {} };
    state.callId = callId;
    state.visible = true;
    state.busy = true;
    forms.set(kind, state);
    selectedForm = kind;
    try {
      const opened = await host.openForm(kind);
      if (opened?.deny || !active()) return false;
      if (!state.draft) {
        const draft = await request(host, { kind, operation: "open" });
        state.draft = draft.draft;
        state.error = draft.error ? draft.message : undefined;
      }
      return active() && Boolean(state.draft) && !state.error;
    } catch {
      state.error = unavailable;
      return false;
    } finally {
      state.busy = false;
      if (active()) host.redraw();
    }
  }

  function view(host, active) {
    const state = forms.get(selectedForm);
    if (!state?.visible) return undefined;
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
    const closed = ["saved", "published"].includes(state.draft?.status);
    const receipt = state.draft?.receipt;
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
      await host.closeForm();
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
            return Input({
              key: `kaijan-form-${key}-${id}`,
              label,
              value: text,
              rows,
              onInput: edit,
              onSubmit: edit,
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
            ? "Selected text and images will be public in katalon-studio/kaijan-marketplace."
            : "Draft kept on this device. Select Send when ready.",
        ),
        ...(host.terminal && !closed && !recover
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
            ]
          : []),
        ...(state.error ? [caption(state.error)] : []),
        ...(closed
          ? [
              issue && receipt?.url
                ? Link({ href: receipt.url, label: "Open published issue" })
                : caption(issue ? "Issue published." : "Feedback saved."),
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
                                ? "Publish issue"
                                : "Preview issue"
                              : "Send",
                          () => submit(shownAction, Boolean(recover)),
                        ),
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
