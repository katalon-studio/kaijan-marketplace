const commands = /^[a-z0-9-]+:(?:demo|mod-demo)$/;

// Probe only an explicit demo request. Report rendering and normal tools must
// neither start this helper nor admit presentation-demo handlers.
async function key($) {
  return `${$.plugin.root}\0${await $.session.id()}`;
}

async function profile($) {
  const result = await $.process.run([
    `${$.plugin.root}/capabilities/runtime/node`,
    `${$.plugin.root}/hooks/demo-profile.mjs`,
  ]);
  if (result.exitCode !== 0) return undefined;
  return JSON.parse(result.stdout).profile;
}

export async function qaDemoEnabled($, { sessions }) {
  return sessions.get(await key($))?.profile === "qa";
}

export function createQaDemoState() {
  const sessions = new Map();
  return { sessions };
}

export function registerQaDemos(on, { sessions }) {
  on("command.run", { command: commands }, async ($, event, next) => {
    if (
      ![`${$.plugin.name}:demo`, `${$.plugin.name}:mod-demo`].includes(
        event.command,
      )
    )
      return next();
    const session = await key($);
    let selected = sessions.get(session);
    if (!selected) {
      selected = {};
      selected.read = profile($).catch(() => undefined);
      sessions.set(session, selected);
    }
    selected.profile = await selected.read;
    if (selected.profile === undefined) sessions.delete(session);
    if (selected.profile !== "qa")
      return {
        text: selected.profile
          ? "This demo is available only in QA. Start a new Local or CLI session with KAIJAN_PROFILE=qa."
          : "Kaijan could not confirm QA for this session. Check the session profile before using this demo.",
      };
    return next();
  });
}
