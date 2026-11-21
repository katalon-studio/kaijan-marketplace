const unavailable =
  "Kaijan could not open the form. Check your Kaijan connection and try again.";

export function createReportForms() {
  const forms = new Map();
  let bridge, child, terminalForm;
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

  function view(host, id, active, atPrompt = false) {
    const { Box, Button, Input, Text, Link } = host.elements;
    const redraw = () => {
      if (active()) host.redraw();
    };
    let state = forms.get(id);
    const change = async (operation, changes) => {
      if (!active()) return false;
      const draft = state.draft;
      const result = await request(host, {
        kind: state.kind,
        operation,
        ...(draft && { draftId: draft.id, revision: draft.revision }),
        ...(changes && { changes }),
      });
      if (result.draft) state.draft = result.draft;
      state.error = result.error ? result.message : undefined;
      return !result.error;
    };
    const act = async (callback) => {
      if (state.busy || !active() || !state.visible || forms.get(id) !== state)
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
    const open = (kind) => {
      if (!active() || state?.busy || state?.visible) return;
      if (host.terminal) {
        const previous = forms.get(terminalForm);
        if (previous?.busy) return;
        if (previous) previous.visible = false;
        terminalForm = id;
      }
      if (state?.kind !== kind) {
        state = { kind, visible: true, edits: {} };
        forms.set(id, state);
      } else state.visible = true;
      return act(async () => {
        if (!state.draft) await change("open");
      });
    };
    const actions = [
      ["feedback", "Kaijan feedback"],
      ["issue", "Report issue"],
    ].map(([kind, label]) =>
      Button({
        key: `kaijan-${kind}-${id}`,
        label,
        plain: true,
        onPress: () => open(kind),
      }),
    );
    // Claude routes terminal keyboard input to the prompt or a focused mod
    // band. The historical tool row can open the form but cannot edit it.
    if (!state?.visible || (host.terminal && !atPrompt))
      return [Box({ flexDirection: "row", gap: "md", children: actions })];

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
          forms.delete(id);
        } else if (!(await update())) return;
      }
      state.visible = false;
      if (terminalForm === id) terminalForm = undefined;
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
                forms.get(id) !== state ||
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
    return [
      ...(!atPrompt
        ? [Box({ flexDirection: "row", gap: "md", children: actions })]
        : []),
      Box({
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
              ? "Selected text will be public in katalon-studio/kaijan-marketplace."
              : "Private feedback to Kaijan. Draft kept on this device.",
          ),
          ...(atPrompt && !closed && !recover
            ? [caption("Ctrl+X then Tab to edit.")]
            : []),
          ...inputs,
          ...(state.draft?.context && !issue && !closed
            ? [
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
              ]),
        ],
      }),
    ];
  }

  async function close() {
    generation++;
    forms.clear();
    terminalForm = undefined;
    const current = child;
    child = undefined;
    bridge = undefined;
    await current?.return().catch(() => {});
  }

  function promptView(host, active) {
    if (!terminalForm) return undefined;
    return view(host, terminalForm, active, true).at(-1);
  }

  return { view, promptView, close, request };
}
