"use strict";

const journeyStages = [
  "RUNTIME",
  "TRIGGER",
  "COORDINATOR",
  "AGENT_ECONOMY",
  "AGENT_SOCIAL",
  "AGENT_POLITICS",
  "PACKAGE_VALIDATION",
  "TRANSPORT",
  "HANDOFF",
  "PAWPAW_VALIDATION",
  "SEMANTIC_INTEGRITY",
  "CYCLE"
];

const stateFiles = {
  normal: "data/states/normal.json",
  failure: "data/states/failure.json",
  governance: "data/states/governance.json"
};

const stateLabels = {
  normal: "Normal Operation",
  failure: "Failure Escalation",
  governance: "Governance Escalation"
};

let contract = null;
let currentStateId = "normal";


function classification(value) {

  if (
    value === "PASS" ||
    value === "HEALTHY" ||
    value === "NORMAL"
  ) {
    return "state-good";
  }

  if (
    value === "DEGRADED" ||
    value === "RECOVERING"
  ) {
    return "state-warning";
  }

  if (
    value === "FAILED" ||
    value === "ESCALATION_REQUIRED"
  ) {
    return "state-critical";
  }

  if (
    value === "MISSING" ||
    value === null ||
    value === undefined
  ) {
    return "state-missing";
  }

  return "";
}


function setValue(id, value) {

  const node =
    document.getElementById(id);

  if (!node) {
    return;
  }

  node.textContent =
    value ?? "UNKNOWN";

  node.className =
    classification(value);
}


function capabilityInfo(level) {

  if (
    !contract ||
    !contract.human_capability_model ||
    !contract.human_capability_model[level]
  ) {
    return {
      name: "UNKNOWN",
      role: "Unknown"
    };
  }

  return contract
    .human_capability_model[level];
}


function stageStatus(stage, state) {

  const missing =
    new Set(
      state.missing_stages || []
    );

  if (missing.has(stage)) {
    return "MISSING";
  }

  switch (stage) {

    case "TRANSPORT":
      return state.transport;

    case "HANDOFF":
      return state.handoff;

    case "PAWPAW_VALIDATION":
      return state.pawpaw;

    case "SEMANTIC_INTEGRITY":
      return state.semantic_integrity;

    case "CYCLE":
      return state.cycle;

    default:
      return (
        state.system === "HEALTHY"
          ? "PASS"
          : (
              missing.has(stage)
                ? "MISSING"
                : "UNKNOWN"
            )
      );
  }
}


function renderJourney(state) {

  const journey =
    document.getElementById(
      "journey"
    );

  journey.innerHTML = "";

  journeyStages.forEach(
    (stage, index) => {

      const status =
        stageStatus(stage, state);

      const div =
        document.createElement("div");

      div.className = "stage";

      div.innerHTML =
        `<span>${String(index + 1)
          .padStart(2, "0")}</span>
         <strong>${stage}</strong>
         <small class="${classification(status)}">
           ${status ?? "UNKNOWN"}
         </small>`;

      journey.appendChild(div);
    }
  );
}


function renderCapabilityModel(state) {

  const root =
    document.getElementById(
      "capabilityModel"
    );

  root.innerHTML = "";

  Object.entries(
    contract.human_capability_model
  ).forEach(([level, value]) => {

    const div =
      document.createElement("div");

    div.className =
      "capability" +
      (
        level ===
        state.human_capability
          ? " current"
          : ""
      );

    div.innerHTML =
      `<strong>${level} — ${value.name}</strong>
       <small>${value.role}</small>`;

    root.appendChild(div);
  });
}


function renderAlertPolicy() {

  const root =
    document.getElementById(
      "alertPolicy"
    );

  root.innerHTML = "";

  Object.entries(
    contract.alert_policy
  ).forEach(([level, policy]) => {

    const div =
      document.createElement("div");

    div.className = "policy";

    div.innerHTML =
      `<strong>${level}</strong>
       <small>${policy}</small>`;

    root.appendChild(div);
  });
}


function renderState(stateId, state) {

  currentStateId = stateId;

  const capability =
    capabilityInfo(
      state.human_capability
    );

  document.getElementById(
    "scenarioTitle"
  ).textContent =
    stateLabels[stateId];


  setValue(
    "systemState",
    state.system
  );

  setValue(
    "resilienceState",
    state.resilience
  );


  document.getElementById(
    "humanCapability"
  ).textContent =
    state.human_capability;


  document.getElementById(
    "humanCapabilityName"
  ).textContent =
    `${capability.name} — ${capability.role}`;


  document.getElementById(
    "humanAction"
  ).textContent =
    state.human_action_required
      ? "REQUIRED"
      : "NOT REQUIRED";


  const healthy =
    state.agents?.healthy;

  const expected =
    state.agents?.expected;


  const agentStatus =
    healthy === expected &&
    expected === 3
      ? "PASS"
      : (
          healthy === 0
            ? "MISSING"
            : "DEGRADED"
        );


  setValue(
    "economy",
    agentStatus
  );

  setValue(
    "social",
    agentStatus
  );

  setValue(
    "politics",
    agentStatus
  );


  setValue(
    "transport",
    state.transport
  );

  setValue(
    "handoff",
    state.handoff
  );

  setValue(
    "pawpaw",
    state.pawpaw
  );

  setValue(
    "semantic",
    state.semantic_integrity
  );


  renderJourney(state);
  renderCapabilityModel(state);


  document
    .querySelectorAll(
      ".scenario-button"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.state === stateId
      );

    });
}


async function loadState(stateId) {

  const url =
    stateFiles[stateId];

  if (!url) {
    throw new Error(
      "Unknown presentation state"
    );
  }

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "State dataset unavailable"
    );
  }

  const state =
    await response.json();

  renderState(
    stateId,
    state
  );
}


async function initializePortal() {

  const contractResponse =
    await fetch(
      "data/monitoring-contract.json"
    );

  if (!contractResponse.ok) {
    throw new Error(
      "Monitoring contract unavailable"
    );
  }

  contract =
    await contractResponse.json();


  renderAlertPolicy();


  document
    .querySelectorAll(
      ".scenario-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          loadState(
            button.dataset.state
          ).catch(error => {
            console.error(error);
          });

        }
      );

    });


  document.getElementById(
    "generatedAt"
  ).textContent =
    contract.generated_at;


  await loadState(
    "normal"
  );
}


initializePortal().catch(error => {

  console.error(error);

  document.getElementById(
    "systemState"
  ).textContent =
    "DATA UNAVAILABLE";

});
