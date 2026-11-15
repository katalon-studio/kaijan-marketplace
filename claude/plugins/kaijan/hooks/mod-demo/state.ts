import type {
  CaseFilter,
  FormValue,
  PaneTab,
  Run,
  TestCase,
  ThemeName,
} from "./types";

export const PLUGIN = "kaijan";
export const PANE = "kaijan-mod-demo";

// -------------------------------------------------------------- scenario ----

export type Seed = Omit<TestCase, "status" | "ms" | "error"> & {
  ms: number;
  // The first run fails this case; a rerun passes it.
  failsFirst?: string;
  skip?: boolean;
};

export const SEEDS: Seed[] = [
  {
    id: "cart-add",
    group: "Cart",
    name: "Add an item to the cart",
    ms: 820,
    steps: [
      "Open /products",
      'Click "Add to cart" on Aero Mug',
      "Badge shows 1",
    ],
  },
  {
    id: "cart-qty",
    group: "Cart",
    name: "Change quantity updates subtotal",
    ms: 640,
    steps: ["Open /cart", "Set quantity to 3", "Subtotal reads $54.00"],
  },
  {
    id: "cart-coupon",
    group: "Cart",
    name: "Expired coupon shows an error",
    ms: 910,
    steps: [
      "Open /cart",
      "Apply coupon SPRING24",
      'See "This coupon has expired"',
    ],
    failsFirst:
      'Expected text "This coupon has expired"\n  but the page showed "Coupon applied: -10%"\n  at cart.spec.ts:48',
  },
  {
    id: "ship-address",
    group: "Shipping",
    name: "Address form validates postcode",
    ms: 700,
    steps: [
      "Open /checkout/shipping",
      'Enter postcode "ABC"',
      'Field shows "Invalid postcode"',
    ],
  },
  {
    id: "ship-rates",
    group: "Shipping",
    name: "Express rate is offered for EU",
    ms: 560,
    steps: ["Choose country Germany", 'Rates list includes "Express 2-day"'],
  },
  {
    id: "pay-card",
    group: "Payment",
    name: "Pay with a saved test card",
    ms: 1180,
    steps: [
      "Choose saved card ending 4242",
      'Click "Pay now"',
      "Order confirmation shows #",
    ],
  },
  {
    id: "pay-3ds",
    group: "Payment",
    name: "3-D Secure challenge completes",
    ms: 1320,
    steps: [
      "Use test card 4000 0027 6000 3184",
      "Approve the challenge",
      "Order confirmed",
    ],
    skip: true,
  },
  {
    id: "pay-receipt",
    group: "Payment",
    name: "Receipt email is queued",
    ms: 480,
    steps: ["Complete an order", 'Mail outbox holds "Your receipt"'],
  },
];

export function freshRun(id: number): Run {
  return {
    id,
    status: "idle",
    startedAt: 0,
    endedAt: 0,
    cases: SEEDS.map((seed) => ({
      id: seed.id,
      name: seed.name,
      group: seed.group,
      steps: seed.steps,
      status: "queued",
      ms: 0,
      error: "",
    })),
  };
}

function emptyForm(): FormValue {
  return {
    project: "checkout-web",
    env: "staging",
    browser: "chromium",
    notes: "",
    submittedAt: 0,
  };
}

export function resetForm(): FormValue {
  return emptyForm();
}

export function tally(r: Run) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let running = 0;
  let done = 0;
  let ms = 0;
  for (const c of r.cases) {
    if (c.status === "passed") passed += 1;
    if (c.status === "failed") failed += 1;
    if (c.status === "skipped") skipped += 1;
    if (c.status === "running") running += 1;
    if (c.status !== "queued" && c.status !== "running") done += 1;
    ms += c.ms;
  }
  return { passed, failed, skipped, running, done, total: r.cases.length, ms };
}

export function visibleCases(r: Run, f: CaseFilter): TestCase[] {
  if (f === "all") return r.cases;
  return r.cases.filter((c) => c.status === f);
}

export const TAB_LABELS: Record<PaneTab, string> = {
  report: "Report",
  gallery: "Gallery",
  controls: "Controls",
  live: "Live",
  theme: "Theme",
};

export const THEMES: { value: ThemeName; label: string }[] = [
  { value: "off", label: "Off (app default)" },
  { value: "aurora", label: "Aurora" },
  { value: "grid", label: "Blueprint grid" },
  { value: "sunset", label: "Sunset" },
];

export function summaryText(r: Run): string {
  const t = tally(r);
  const lines = [
    `Simulated UI checkout run #${r.id} (${r.status})`,
    `${t.passed} passed, ${t.failed} failed, ${t.skipped} skipped of ${t.total} (${(t.ms / 1000).toFixed(1)}s)`,
    ...r.cases.map(
      (c) =>
        `- [${c.status}] ${c.group} / ${c.name}${c.error ? `: ${c.error.split("\n")[0]}` : ""}`,
    ),
  ];
  return lines.join("\n");
}
