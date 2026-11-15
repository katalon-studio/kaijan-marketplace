# Update and recover

Use the installed marketplace's supported Claude Code commands:

```sh
claude plugin marketplace update kaijan-claude
claude plugin update kaijan@kaijan-claude
```

Use the corresponding QA marketplace name for a QA package. The local Desktop
Code tab shares this user-scoped installation. Its plugin manager can also
enable, disable or uninstall the same plugin. Check `/status` in a new local
Code session after updating Desktop; its embedded host version is separate
from the global CLI. Start or resume
the original session after an update and verify the actual responding package.
An old process can retain old bytes. Reconcile active work before replacing it.
Keep the same report/run IDs and request keys; never replay uncertain work to
refresh discovery. Do not edit Claude's cache or copy credentials.
