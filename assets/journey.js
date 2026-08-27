"use strict";

const MANIFEST = "data/history/journey-manifest.json";

async function getJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${path}`);
  }

  return response.json();
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderCapability(path) {
  const root = document.getElementById("capabilityTrace");
  root.replaceChildren();

  path.forEach((capability, index) => {
    if (index > 0) {
      const arrow = document.createElement("span");
      arrow.className = "capability-arrow";
      arrow.textContent = "→";
      root.appendChild(arrow);
    }

    const node = document.createElement("span");
    node.className = "capability-node";
    node.textContent = capability;
    root.appendChild(node);
  });
}

function renderTimeline(events) {
  const body = document.getElementById("timelineBody");
  body.replaceChildren();

  for (const event of events) {
    const row = document.createElement("tr");

    const values = [
      event.sequence,
      event.stage || "—",
      event.system_state || "—",
      event.resilience_state || "—",
      event.human_capability || "—",
      event.human_action_required ? "Required" : "No",
      event.milestone || "—"
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }

    body.appendChild(row);
  }
}

async function loadScenario(name) {
  const manifest = await getJSON(MANIFEST);
  const scenario = manifest.scenarios[name];

  if (!scenario) {
    throw new Error(`Unknown scenario: ${name}`);
  }

  const [timeline, capability] = await Promise.all([
    getJSON(scenario.timeline),
    getJSON(scenario.capability)
  ]);

  const path = capability.capability_path;

  if (!Array.isArray(path)) {
    throw new Error(`Invalid capability path: ${name}`);
  }

  setText("scenario", scenario.label);
  setText("events", timeline.event_count);
  setText("peak", timeline.peak_capability);
  setText("path", path.join(" → "));

  renderCapability(path);
  renderTimeline(timeline.timeline);

  document.querySelectorAll("[data-scenario]")
    .forEach(button => {
      button.disabled = button.dataset.scenario === name;
    });
}

document.querySelectorAll("[data-scenario]")
  .forEach(button => {
    button.addEventListener("click", () => {
      loadScenario(button.dataset.scenario)
        .catch(console.error);
    });
  });

loadScenario("normal").catch(console.error);
