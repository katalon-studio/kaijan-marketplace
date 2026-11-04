# Continue after a Kaijan update

An update can install new instructions while an open chat still uses the earlier
Kaijan connection. Installed files do not prove which version answers this chat.

## Check before new work

1. Read `loki-build.json` from the installed package that supplies this skill.
   Keep its version, build identity and source revision as the expected package.
2. Inspect this chat's callable tools. If `loki_capabilities_list` is available,
   read its runtime identity and the requirements for the selected action.
   Compare the returned identity with the expected package. A missing identity
   is unknown, not a match.
3. Check that the tools required by the installed owning skill are callable in
   this chat. For normal test execution, these include `loki_test_execute`,
   `loki_test_get` and `loki_test_stop`. Do not run a paid test to probe availability.

If the identities differ or required tools are absent, explain the exact problem
once. For a confirmed older version: “This chat still uses the earlier Kaijan
version. Open a new chat in this project to use the update.” If no tool responds:
“Kaijan is installed, but its tools are not available in this chat. Open a new
chat in this project and check the connection there.” Do not call an unknown
connection an old version. Keep exact versions in the diagnostic record; do not
make the tester interpret build hashes. Claim that saved results remain
available only after reading the original records through the recovered route.

Do not fall back to an older multi-tool test flow, copy code into the installed
cache, delete saved state, or request Core sign-in to fix missing local tools.

## Preserve the work

Before any reconnect or restart, record the original goal, selected application,
source revision, target, action limits and actual run/report/configuration IDs.
Keep secrets in their approved private source. Do not copy keys or passwords
into a handoff message.

If execution is active or its effects are unknown, reconcile it through the
original connection's advertised read or Stop tools first. Preserve the original
request key and result. If that connection is unavailable, state the unresolved
run and its possible effects. Do not start a replacement run or stop an unrelated
worker. A new chat does not prove that an earlier run stopped.

## Use a fresh chat

The verified workaround is to keep the old chat and open a new chat in the same
project, with the same Kaijan profile. Give it the original task, action limits
and retained IDs. Ask it to check the loaded Kaijan version and read saved work
before continuing. Do not ask it to repeat completed actions.

The user can select **New chat** in the project. Create a chat for the user only
when that action is authorized. Check the actual tool inventory and responding
runtime identity in the new chat before analysis or execution. Read the original
saved record or report to confirm continuity; a new record with the same title
does not prove retention.

Some records belong to the original chat's scope. The same private profile does
not grant a new chat access to them. If readback fails at that boundary, keep the
old chat and its IDs. Use it to review those results after a supported reconnect.
Do not change scope identifiers or recreate completed work to claim recovery.
A fresh chat can start separately authorized new work, but that does not prove
continuity of the old run.

## Recover in the same chat

On the tested desktop hosts, the plugin enable switch restored missing Kaijan
tools in the same chat. Use this route when the host exposes the switch:

1. Reconcile active work as described above. Check other chats that use this
   Kaijan installation too; the switch affects the plugin, not just this chat.
2. Open **Settings > Plugins**. Find the installed Kaijan profile, such as
   **Kaijan — QA**. Turn its enable switch off and wait for the disabled state.
3. Turn the same switch on and wait for the enabled state. Keep the same chat.
4. On the next turn, check the callable tools and responding package identity.
   Read the original saved configuration, run and report before continuing.

An enabled switch alone does not prove recovery. If tools remain unavailable or
the identity differs, keep the original work and use the fresh-chat route above.

Use a reconnect or refresh control only if the active host exposes it for this
connection. Name the actual control; do not invent a slash command or claim that
a marketplace refresh also replaces this chat's running connection. Afterward,
repeat the identity, tool and original-record checks above.

For a changed local plugin, OpenAI documents restarting the ChatGPT desktop app
to load the new files. A restart can interrupt other chats. Preserve work and use
the host's supported restart flow with the required human control. If a restart
cannot be done now, use a verified route above and report desktop restart
recovery as unverified. Do not edit host databases or force-kill the host.

## Evidence and limits

Merlin's installed trial in [#2680](https://github.com/katalon-studio/loki/issues/2680)
confirmed new chats used the updated package while an existing chat retained the
old connection. It did not establish same-chat reconnect or restart recovery.
Later, Kestrel restored same-chat discovery with the plugin enable switch on
VL26. Rowan repeated that route on nam mac with no active Runner process: native
discovery returned the selected `0.4.0-rowan.20261104.2` build, and native reads
returned the exact original Setup, completed test and report. This verifies that
route on these hosts; it does not prove desktop restart recovery or recovery
during active work.
Record the host, expected and responding package identities, retained record IDs,
control used and readback result for each new check. Do not claim acceptance from
this guide alone.

Official references: [install and use plugins](https://learn.chatgpt.com/docs/plugins)
and [update a local plugin](https://developers.openai.com/plugins/build/plugins).
