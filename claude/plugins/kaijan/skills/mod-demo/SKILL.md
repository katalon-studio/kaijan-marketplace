---
name: mod-demo
description: QA-only Kaijan Claude mods UI showcase when the person explicitly invokes this skill or asks for that UI demo. This is a simulated presentation demo, separate from the real TodoMVC testing demo.
disable-model-invocation: true
---

# Claude mods UI demo

This showcase is enabled only when the installed plugin's effective runtime
profile is QA. Its command handler checks that profile before opening UI or
registering demo tools. An unavailable or non-QA profile leaves the showcase
closed; do not switch the person's profile or claim a demo appeared.

Open the plugin's native UI showcase. In a supported Claude local Code session,
the mod handles this command directly and shows its menu. The person can try
cards, the details pane, charts, forms, code, Markdown, live controls and
backdrops. Follow their selected action rather than starting every example.

All sample cases and results are simulated UI data. They do not represent a
Kaijan Plan, browser test, assessment, saved report or application defect. Do
not call the real Kaijan testing tools, change Setup or request sign-in for this
showcase. The separate `demo` skill performs the real TodoMVC workflow.

The command accepts `report`, `chart`, `form`, `code`, `markdown`, `live`, `all`,
`pane`, `run` and `theme aurora|grid|sunset|off`. Running the demo suite changes
only its scripted sample state. Clipboard, prompt and notification examples act
only when the person selects their labelled controls. “Send a prompt to Claude”
and “Ask Claude to draw a card” start a normal Claude model turn. Opening the
showcase and running its scripted sample suite do not.

If mods or native surfaces are unavailable, explain that this is a presentation
demo and describe its available examples in text. Do not claim that a card,
pane or backdrop appeared. Keep normal Claude and Kaijan work available.
