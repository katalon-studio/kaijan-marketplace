import {
  dataPreparationInstruction,
  testSessionInstruction,
} from "@katalon-loki/computer-runner/agent-context";

// Current initial-planning instructions. Edit this template for fresh requests.
export const MODEL_INPUT_INSTRUCTIONS =
  "\nRead text_from_evidence_id from the named evidence_catalog quote as the full source text. Preserve its source attribution and references.";

export const RISK_MODEL_INPUT_INSTRUCTIONS =
  "\nRead text_from_evidence_id from the named evidence_catalog quote. Read context_from_evidence_id from risk_context as supporting context, not requirements; retain any stated gaps. Preserve the original source attribution and references.";

// General task-independent instructions. Case-specific regression tasks belong
// in test fixtures, not in every planning request.
export const GENERAL_INITIAL_PLANNING_INSTRUCTIONS = `${testSessionInstruction}

Derive realistic user scenarios from the caller’s task and the available application context. For each distinct user goal, plan high-level black-box tests of the observable outcome. Preserve distinct observed ways to perform an operation. Prioritize common, fully populated workflows, followed by meaningful variations in data and state.

Plan the outcome users depend on. For lasting changes, include a check from where the user can later retrieve or use the result. Cover the relevant effects on existing state. Establish meaningful starting data for comparison. Treat missing examples or routes in the app model as preparation or discovery gaps. Keep those tests in the plan.

Separate the prerequisites, core actions and expected result. Specify the data that makes each check meaningful. Leave concrete values and UI procedures to Runner. ${dataPreparationInstruction}

Use supplied requirements when available. Otherwise state the normal user expectation and identify material assumptions. Preserve the original intent, source attribution and restrictions. Report gaps in what can be checked. Plan only and return the required JSON.`;

export const PLANNING_OUTPUT_INSTRUCTIONS = `

JSON contract
Use T1, T2, ... for tests and O1, O2, ... for objectives. Give each test_outline ID one test definition. Link tests to their objectives and relevant requirement_inventory IDs; give each inventory entry one requirement_coverage row with a coverage or gap reason.
Use exact evidence_catalog IDs for references. Objective references identify the caller's intent. Write expected.text as a direct statement of expected application behavior. Record its source classification separately in expected.authority and refs: use requirement when the cited intent supports the expected result; otherwise use hypothesis.
Describe prerequisites, core steps and expected results separately. Put missing information in execution_gaps. Order distinct applicable tests by priority. Select each applicable, meaningful test for Runner in the recommended order, including tests that need preparation or have a provisional expectation. Runner can exercise the scenario and report what happened even when intended behavior still needs confirmation. Use not_selected for tests outside the requested scope. Return needs_clarification if no meaningful test can be formed. Selection does not authorize execution.`;

export function renderPlanningInstructions(
  modelViewVersion = null,
  requirementInputVersion = null,
) {
  if (
    modelViewVersion !== null &&
    !["planning-source-text/1", "planning-source-text/2"].includes(
      modelViewVersion,
    )
  )
    throw Error("Unsupported planning model-input version");
  if (
    requirementInputVersion !== null &&
    requirementInputVersion !== "source-reference/1"
  )
    throw Error("Unsupported requirement-input version");
  return (
    GENERAL_INITIAL_PLANNING_INSTRUCTIONS +
    PLANNING_OUTPUT_INSTRUCTIONS +
    (modelViewVersion === null
      ? ""
      : modelViewVersion === "planning-source-text/2"
        ? RISK_MODEL_INPUT_INSTRUCTIONS
        : MODEL_INPUT_INSTRUCTIONS) +
    (requirementInputVersion === null
      ? ""
      : "\nFor requirement_input_version source-reference/1, read each omitted requirement quote from its source_id's full text or text_from_evidence_id.")
  );
}
