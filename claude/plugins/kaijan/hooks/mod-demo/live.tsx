// A surface module: drawn by a `Client` element, on the drawing thread, with
// its own state and frame clock. No `$` here: it talks to the hooks module by
// `surface.post`, which arrives there as a `ui.message` event.

import type { ClientModule, ClientSurface } from "claude-code";

type Props = { accent: string; label: string };

type S = {
  ticks: number;
  elapsed: number;
  isRunning: boolean;
  laps: number[];
  lastKey: string;
  pointer: string;
  isHot: boolean;
};

const TICK = 100;
const WAVE = "▁▂▃▄▅▆▇█▇▆▅▄▃▂";

const initial: S = {
  ticks: 0,
  elapsed: 0,
  isRunning: false,
  laps: [],
  lastKey: "—",
  pointer: "outside",
  isHot: false,
};

function fmt(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function get(surface: ClientSurface<S>): S {
  return surface.state ?? initial;
}

function act(surface: ClientSurface<S>, what: "toggle" | "lap" | "reset") {
  const s = get(surface);
  if (what === "toggle") surface.setState({ ...s, isRunning: !s.isRunning });
  if (what === "lap" && s.elapsed > 0) {
    surface.setState({ ...s, laps: [...s.laps, s.elapsed].slice(-5) });
    surface.post({ type: "lap", ms: s.elapsed });
  }
  if (what === "reset") {
    surface.setState({ ...s, elapsed: 0, isRunning: false, laps: [] });
    surface.post({ type: "reset" });
  }
}

const Live: ClientModule<Props, S> = (props, surface) => {
  const { Box, Text, Button } = surface.elements;

  if (surface.state === undefined) {
    surface.every(TICK, () => {
      const s = get(surface);
      surface.setState({
        ...s,
        ticks: s.ticks + 1,
        elapsed: s.isRunning ? s.elapsed + TICK : s.elapsed,
      });
    });
    surface.setState(initial);
  }

  surface.onKey((e) => {
    const s = get(surface);
    surface.setState({ ...s, lastKey: e.key });
    if (e.key === " " || e.key === "space") act(surface, "toggle");
    if (e.key === "l") act(surface, "lap");
    if (e.key === "r") act(surface, "reset");
  });

  surface.onPointer((e) => {
    const s = get(surface);
    surface.setState({
      ...s,
      isHot: e.type !== "leave",
      pointer:
        e.type === "leave"
          ? "outside"
          : `${e.type} at ${e.x},${e.y}${e.button ? ` (${e.button})` : ""}`,
    });
  });

  const s = get(surface);
  const width = Math.max(12, Math.min(48, (surface.columns || 40) - 4));
  let wave = "";
  for (let i = 0; i < width; i += 1) {
    const idx = (i + s.ticks) % WAVE.length;
    wave += WAVE[idx] ?? " ";
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={s.isHot ? props.accent : "subtle"}
      paddingX={1}
    >
      <Box flexDirection="row" gap={2} alignItems="center">
        <Text
          weight="bold"
          size="title"
          tabular
          color={s.isRunning ? props.accent : "text"}
        >
          ⏱ {fmt(s.elapsed)}
        </Text>
        <Button
          key="toggle"
          variant="primary"
          label={s.isRunning ? "Stop" : "Start"}
          onPress={() => act(surface, "toggle")}
        />
        <Button key="lap" label="Lap" onPress={() => act(surface, "lap")} />
        <Button
          key="reset"
          dimColor
          label="Reset"
          onPress={() => act(surface, "reset")}
        />
      </Box>
      <Text color={s.isRunning ? props.accent : "inactive"}>{wave}</Text>
      <Text dimColor size="footnote">
        {props.label} · frame {s.ticks} · key: {s.lastKey} · pointer:{" "}
        {s.pointer}
      </Text>
      {s.laps.length > 0 ? (
        <Text dimColor size="footnote" tabular>
          laps: {s.laps.map(fmt).join("  ")}
        </Text>
      ) : null}
    </Box>
  );
};

export default Live;
