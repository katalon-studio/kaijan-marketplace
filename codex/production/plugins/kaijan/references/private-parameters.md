# Private login parameters

Use this path when the caller has authorized an application login and supplied
approved environment variable names. It works for browser tests. It does not
grant access to another app, account or conversation.

Use the installed plugin directory that contains this file as `PLUGIN_ROOT`.
Use the current host conversation ID. Do not guess another chat's ID. Run the
bundled command with environment **names**, not expanded values:

```sh
"$PLUGIN_ROOT/capabilities/runtime/node" "$PLUGIN_ROOT/scripts/private-parameters.mjs" provision \
  --thread CURRENT_THREAD_ID --host app.example.com --host login.example.com \
  --param email=APP_TEST_EMAIL --param password=APP_TEST_PASSWORD
```

The variables must already be available to this command through the caller's
approved private environment. Do not use `echo`, `env`, `printenv`, shell tracing,
or a script that returns the values. Do not insert values into command arguments
or a chat message. If the approved environment is not available, report that
login setup is needed; do not search unrelated credentials.

The command prints `privateParams` references and host/field metadata only. Pass
the returned `privateParams` unchanged to `loki_test_execute`. Keep nonsecret inputs in `params`. Do not supply the same
name in both. Set `target.allowedHosts` to the approved app and sign-in hosts.
The initial URL and all target hosts must be in the saved binding.

Kaijan loads values in its private Runner process path and marks those parameters
secret for report protection. Do not include the values in the scenario,
guidance, context or clarification answers. For a missing login value, prepare
the binding before starting the test.

Each binding is fixed. To change a login, provision a new binding and use it for
a new authorized run. A retry with the same key and same references keeps the
original run, even after the binding is revoked. It never submits another login.

To block new runs from using a binding:

```sh
"$PLUGIN_ROOT/capabilities/runtime/node" "$PLUGIN_ROOT/scripts/private-parameters.mjs" revoke \
  --thread CURRENT_THREAD_ID --binding BINDING_ID
```

Revocation does not stop an admitted run. Use the run's existing Stop tool for
that. Existing evidence remains readable in its owning conversation.
