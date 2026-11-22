# Private login parameters

## Save an app login to Test Environment Config

In Codex, when the person chooses to save an approved app account from a local
environment file, run the installed Configuration command:

```sh
"$PLUGIN_ROOT/capabilities/runtime/node" "$PLUGIN_ROOT/scripts/configuration.mjs" save \
  --from-file /absolute/path/to/approved.env \
  --aut-id APPLICATION_ID \
  --name "App test account" --application https://app.example.com \
  --secret email=APP_TEST_EMAIL --secret password=APP_TEST_PASSWORD
```

Use the plugin directory containing this guide as `PLUGIN_ROOT` and the same
Kaijan environment as the chat. The command reads the named variables in the
file and saves exactly those values under the specified keys. If the site has
an authorized sign-in host on another domain, include it with `--host`. The
command prints the saved Configuration name, ID and revision.

To replace selected values, repeat `save --from-file ... --secret ...` with
`--id` and `--revision` from the latest Configuration read in place of
`--name`, `--application`, `--aut-id`, and `--host`. The remaining settings are retained.
Use the saved environment ID in the next Plan and choose the saved Configuration if
more than one matches. A save applies to new operations. See the
[Run steps](../skills/run-test/SKILL.md#restart-after-an-app-login-change) when
the person needs to continue testing after a login change.
