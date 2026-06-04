'use client'
import { useState, useCallback } from "react";
import ReviewAndGenerate from "./ReviewAndGenerate";
import WiringDiagram from "./WiringDiagram";
import { ETS64RDiagram } from "./SystemDiagram";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  navy:         "#00387B",
  blue:         "#1470B1",
  blueLight:    "#E8F2FA",
  orange:       "#ED6E02",
  orangeLight:  "#FEF3E8",
  green:        "#B1C638",
  greenDark:    "#8A9B2A",
  greenLight:   "#F4F7E0",
  red:          "#D63B3B",
  redLight:     "#FDF0F0",
  canvas:       "#F8F9FA",
  surface:      "#FFFFFF",
  surface2:     "#F2F4F7",
  border:       "#E2E8F0",
  borderStrong: "#C8D3E0",
  textPrimary:  "#0F1C2E",
  textBody:     "#374151",
  textMuted:    "#6B7280",
  textFaint:    "#9CA3AF",
  white:        "#FFFFFF",
};

const shadow = {
  xs: "0 1px 2px rgba(0,56,123,0.04)",
  sm: "0 2px 8px rgba(0,56,123,0.06), 0 1px 2px rgba(0,56,123,0.04)",
  md: "0 4px 16px rgba(0,56,123,0.08), 0 2px 4px rgba(0,56,123,0.04)",
  lg: "0 8px 32px rgba(0,56,123,0.10), 0 2px 8px rgba(0,56,123,0.06)",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SYSTEMS = {
  "ets64r-single": {
    id: "ets64r-single", name: "ETS 64-R", leafType: "single-leaf", isFireDoor: true, systemVariant: "ETS-64-R",
    components: [
      { id: "comp-1", position: "1", label: "Voltage supply", type: "power_supply", mandatory: true, cable: { defaultCable: "NYM 3 x 1.5 mm²", allowedCables: ["NYM 3 x 1.5 mm²"], allowOther: true }, remarks: "Motor must be supplied with 230 V" },
      { id: "comp-2", position: "2", label: "24 V DC E-opener, 100% ED, Protective diode", type: "e_opener", mandatory: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.6 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.6 mm²", "J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "" },
      { id: "comp-3", position: "3", label: "Bolt switch contact", type: "bolt_switch", mandatory: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.8 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "" },
      { id: "comp-4", position: "4", label: "Concealed cable connection", type: "cable_transition", mandatory: false, optional: true, cable: { defaultCable: "(integrated)", allowedCables: [], allowOther: false }, remarks: "Optional, in building" },
      { id: "comp-5", position: "5", label: "Flatscan set", type: "sensor_strip", mandatory: true, cable: { defaultCable: "Cables through ECO", allowedCables: ["Cables through ECO"], allowOther: true }, remarks: "Concealed cable laying in building, otherwise surface-mounted",
        subComponents: [
          { id: "comp-5-1", position: "5.1", label: "Sensor strips set", type: "sensor_strip", mandatory: true, cable: { defaultCable: "Cables through ECO", allowedCables: ["Cables through ECO"], allowOther: true }, remarks: "Concealed cable laying in building" }
        ]
      },
      { id: "comp-6", position: "6", label: "Flip switch (inside)", type: "flip_switch", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.6 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.6 mm²", "J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "In-wall socket, cable laying in building",
        subComponents: [
          { id: "comp-6-1", position: "6.1", label: "Flip switch (outside)", type: "flip_switch", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.6 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.6 mm²", "J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "In-wall socket, cable laying in building" }
        ]
      },
      { id: "comp-7", position: "7", label: "Radar sensor (inside)", type: "radar_sensor", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.6 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.6 mm²", "J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "Cable laying in building (in-wall if necessary)",
        subComponents: [
          { id: "comp-7-1", position: "7.1", label: "Radar sensor (outside)", type: "radar_sensor", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.6 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.6 mm²", "J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "Cable laying in building (in-wall if necessary)" }
        ]
      },
      { id: "comp-8", position: "8", label: "Bedix program selection switch", type: "program_switch", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.6 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.6 mm²", "J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "In-wall socket, cable laying in building" },
      { id: "comp-9", position: "9", label: "'Close door' manual release button", type: "manual_release_button", mandatory: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.8 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "Cable laying in building; button outside the door's pivot range",
        conditions: [{ if: { property: "isFireDoor", equals: true }, then: { mandatory: true, remarksOverride: "⚠ Mandatory per DIGt approval. Button must be outside the door's pivot range." } }]
      },
      { id: "comp-11", position: "11", label: "Ceiling smoke detector", type: "smoke_detector", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.8 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "Cable laying in building as per approval" },
      { id: "comp-12", position: "12", label: "Lintel-mounted smoke detector", type: "smoke_detector", mandatory: false, optional: true, cable: { defaultCable: "J-Y(ST)Y 4 x 0.8 mm²", allowedCables: ["J-Y(ST)Y 4 x 0.8 mm²"], allowOther: true }, remarks: "Cable laying in building as per approval" },
    ],
  },
};

const TYPE_ICONS = {
  power_supply: "⚡", e_opener: "🔓", bolt_switch: "🔘", cable_transition: "🔌",
  sensor_strip: "📡", flip_switch: "🔀", radar_sensor: "📻", program_switch: "⚙️",
  manual_release_button: "🚨", smoke_detector: "🔥", door_closer: "🚪",
};

const TYPE_LABELS = {
  power_supply: "Power Supply", e_opener: "E-Opener", bolt_switch: "Bolt Switch",
  cable_transition: "Cable Transition", sensor_strip: "Sensor Strip", flip_switch: "Flip Switch",
  radar_sensor: "Radar Sensor", program_switch: "Program Switch",
  manual_release_button: "Manual Release Button", smoke_detector: "Smoke Detector",
};

// ─── LOGIC ────────────────────────────────────────────────────────────────────
function isMandatoryForSystem(comp, system) {
  if (comp.mandatory) return true;
  if (!comp.conditions) return false;
  return comp.conditions.some(c => system[c.if.property] === c.if.equals && c.then.mandatory === true);
}

function getRemarksOverride(comp, system) {
  if (!comp.conditions) return null;
  for (const c of comp.conditions) { if (system[c.if.property] === c.if.equals && c.then.remarksOverride) return c.then.remarksOverride; }
  return null;
}

function validateConfiguration(system, componentStates) {
  const errors = [], warnings = [];
  const all = [];
  system.components.forEach(c => { all.push(c); if (c.subComponents) c.subComponents.forEach(s => all.push(s)); });
  all.forEach(comp => {
    const state = componentStates[comp.id];
    if (!state) return;
    let isMandatory = comp.mandatory;
    if (comp.conditions) comp.conditions.forEach(cond => { if (system[cond.if.property] === cond.if.equals && cond.then.mandatory !== undefined) isMandatory = cond.then.mandatory; });
    if (isMandatory && !state.included) errors.push({ id: comp.id, message: `"${comp.label}" is mandatory and cannot be removed.` });
    if (state.included && !state.selectedCable && comp.cable.allowedCables.length > 0) warnings.push({ id: comp.id, message: `"${comp.label}" has no cable selected.` });
  });
  return { errors, warnings, isValid: errors.length === 0 };
}

function buildInitialState(system) {
  const state = {};
  const process = comp => {
    const mandatory = isMandatoryForSystem(comp, system);
    state[comp.id] = { included: mandatory || !comp.optional, selectedCable: comp.cable.defaultCable, isOther: false, otherValue: "", userRemarks: "" };
    if (comp.subComponents) comp.subComponents.forEach(process);
  };
  system.components.forEach(process);
  return state;
}

// ─── CABLE SELECTOR ───────────────────────────────────────────────────────────
function CableSelector({ comp, state, onChange }) {
  const { selectedCable, isOther, otherValue } = state;
  const cables = comp.cable.allowedCables;
  if (cables.length === 0 && !comp.cable.allowOther) {
    return <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: T.blue, background: T.blueLight, border: `1px solid #C5DDF0`, borderRadius: 6, padding: "3px 8px" }}>{comp.cable.defaultCable}</span>;
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted, marginBottom: 8 }}>Cable Specification</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {cables.map(cable => (
          <label key={cable} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${selectedCable === cable && !isOther ? T.blue : T.border}`, background: selectedCable === cable && !isOther ? T.blueLight : T.surface, transition: "all 150ms" }}>
            <input type="radio" name={`cable-${comp.id}`} value={cable} checked={selectedCable === cable && !isOther} onChange={() => onChange(comp.id, { selectedCable: cable, isOther: false })} style={{ accentColor: T.blue, width: 14, height: 14 }} />
            <span style={{ fontSize: 12, fontFamily: "DM Mono, monospace", color: selectedCable === cable && !isOther ? T.blue : T.textBody }}>{cable}</span>
          </label>
        ))}
        {comp.cable.allowOther && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${isOther ? T.orange : T.border}`, background: isOther ? T.orangeLight : T.surface, transition: "all 150ms" }}>
            <input type="radio" name={`cable-${comp.id}`} checked={isOther} onChange={() => onChange(comp.id, { isOther: true, selectedCable: "" })} style={{ accentColor: T.orange, width: 14, height: 14 }} />
            <span style={{ fontSize: 12, color: isOther ? T.orange : T.textMuted }}>Other cable</span>
          </label>
        )}
      </div>
      {isOther && (
        <input type="text" placeholder="Specify cable type..." value={otherValue} onChange={e => onChange(comp.id, { otherValue: e.target.value })}
          style={{ marginTop: 8, width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "DM Mono, monospace", color: T.textPrimary, outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );
}

// ─── BENTO COMPONENT CARD ─────────────────────────────────────────────────────
function ComponentCard({ comp, state, onStateChange, system, depth = 0 }) {
  const mandatory = isMandatoryForSystem(comp, system);
  const remarksOverride = getRemarksOverride(comp, system);
  const displayRemarks = remarksOverride || comp.remarks;
  const isIncluded = state[comp.id]?.included ?? true;
  const compState = state[comp.id] ?? {};

  const handleToggle = () => { if (mandatory) return; onStateChange(comp.id, { included: !isIncluded }); };

  return (
    <div style={{
      background: isIncluded ? T.surface : T.surface2,
      border: `1.5px solid ${mandatory && isIncluded ? "#FACACA" : isIncluded ? T.border : T.border}`,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: isIncluded ? shadow.sm : "none",
      transition: "all 250ms",
      opacity: isIncluded ? 1 : 0.6,
      marginLeft: depth * 16,
    }}>
      {/* Card Header */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: isIncluded ? `1px solid ${T.border}` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {/* Position badge */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: mandatory ? "#FDF0F0" : T.blueLight, border: `1.5px solid ${mandatory ? "#FACACA" : "#C5DDF0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: mandatory ? T.red : T.blue, flexShrink: 0, fontFamily: "DM Mono, monospace" }}>
            {comp.position}
          </div>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{TYPE_ICONS[comp.type] || "•"}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, fontFamily: "DM Sans, sans-serif", lineHeight: 1.3 }}>{comp.label}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{TYPE_LABELS[comp.type] || comp.type}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {mandatory && <span style={{ background: "#FDF0F0", color: T.red, border: "1px solid #FACACA", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>REQUIRED</span>}
          {comp.optional && !mandatory && <span style={{ background: T.surface2, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>OPTIONAL</span>}
          {/* Toggle */}
          <div onClick={handleToggle} style={{ width: 44, height: 24, borderRadius: 12, background: isIncluded ? T.blue : T.borderStrong, position: "relative", cursor: mandatory ? "not-allowed" : "pointer", transition: "background 200ms", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, background: T.white, borderRadius: "50%", position: "absolute", top: 3, left: isIncluded ? 23 : 3, transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
        </div>
      </div>

      {/* Card Body */}
      {isIncluded && (
        <div style={{ padding: "16px 20px" }}>
          <CableSelector comp={comp} state={compState} onChange={onStateChange} />
          {displayRemarks && (
            <div style={{ fontSize: 12, color: remarksOverride ? T.orange : T.textMuted, background: remarksOverride ? T.orangeLight : T.surface2, border: `1px solid ${remarksOverride ? "#FCD9B0" : T.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 12, lineHeight: 1.5 }}>
              {displayRemarks}
            </div>
          )}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: 6 }}>Installation Notes</label>
            <textarea
              placeholder="Add remarks for this component..."
              value={compState.userRemarks || ""}
              onChange={e => onStateChange(comp.id, { userRemarks: e.target.value })}
              rows={2}
              style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "DM Sans, sans-serif", color: T.textPrimary, outline: "none", resize: "vertical", boxSizing: "border-box", transition: "border-color 150ms" }}
              onFocus={e => e.target.style.borderColor = T.blue}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>
        </div>
      )}

      {/* Sub-components */}
      {comp.subComponents && isIncluded && (
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {comp.subComponents.map(sub => (
            <ComponentCard key={sub.id} comp={sub} state={state} onStateChange={onStateChange} system={system} depth={1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VALIDATION PANEL ─────────────────────────────────────────────────────────
function ValidationPanel({ validation }) {
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return (
      <div style={{ background: T.greenLight, border: `1.5px solid #D4E077`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: T.white, fontWeight: 700, flexShrink: 0 }}>✓</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.greenDark }}>Configuration valid</span>
      </div>
    );
  }
  return (
    <div style={{ background: "#FDF0F0", border: `1.5px solid #FACACA`, borderRadius: 10, padding: "12px 16px" }}>
      {validation.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: T.red, display: "flex", gap: 8, marginBottom: 4 }}><span>✕</span> {e.message}</div>)}
      {validation.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: T.orange, display: "flex", gap: 8, marginBottom: 4 }}><span>⚠</span> {w.message}</div>)}
    </div>
  );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const STEPS = ["Select", "Configure", "Project", "Review"];

function StepIndicator({ currentStep, setCurrentStep }) {
  return (
    <div className="mf-step-indicator" style={{ display: "flex", alignItems: "center", marginBottom: 40, overflowX: "auto" }}>
      {STEPS.map((label, i) => (
        <div key={i} className={`mf-step-item${i === currentStep ? ' mf-step-current' : ''}`} onClick={i < currentStep ? () => setCurrentStep(i) : undefined} style={{ display: "flex", alignItems: "center", flex: 1, cursor: i < currentStep ? "pointer" : "default" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="mf-step-circle" style={{
              width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0, transition: "all 250ms",
              background: i < currentStep ? T.green : i === currentStep ? T.navy : T.surface,
              color: i < currentStep ? T.white : i === currentStep ? T.white : T.textMuted,
              border: i === currentStep ? `2px solid ${T.navy}` : i < currentStep ? `2px solid ${T.green}` : `2px solid ${T.border}`,
              boxShadow: i === currentStep ? `0 0 0 4px rgba(0,56,123,0.12)` : "none",
            }}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className="mf-step-label" style={{ fontWeight: i === currentStep ? 600 : 400, color: i === currentStep ? T.textPrimary : T.textMuted, whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="mf-step-connector" style={{ flex: 1, height: 2, margin: "0 12px", background: i < currentStep ? T.green : T.border, borderRadius: 1, transition: "background 250ms" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CablePlanConfigurator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSystemId, setSelectedSystemId] = useState(null);
  const [componentStates, setComponentStates] = useState({});
  const [projectData, setProjectData] = useState({ constructionProject: "", doorNumberOrNaming: "", installationLocation: "", positionNumberInSpec: "", functionDescription: "", miscellaneous: "" });

  const system = selectedSystemId ? SYSTEMS[selectedSystemId] : null;
  const validation = system ? validateConfiguration(system, componentStates) : { errors: [], warnings: [], isValid: true };

  const handleSelectSystem = id => { setSelectedSystemId(id); setComponentStates(buildInitialState(SYSTEMS[id])); };
  const handleStateChange = useCallback((compId, updates) => { setComponentStates(prev => ({ ...prev, [compId]: { ...prev[compId], ...updates } })); }, []);
  const handleNext = () => { if (currentStep === 1 && !validation.isValid) return; setCurrentStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  return (
    <div style={{ minHeight: "100vh", background: T.canvas, fontFamily: "DM Sans, sans-serif", color: T.textBody }}>

      {/* ── HEADER ── */}
      <header className="mf-app-header" style={{  background: T.navy, borderBottom: `3px solid ${T.orange}`, padding: "0 32px", borderRadius: 12, boxShadow: shadow.md, marginBottom: 20 }}>
        <div className="mf-header-inner" style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 16 }}>
          <div className="mf-header-row" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/linkedin.jpg" alt="MF Services" style={{ height: 40, width: "auto", borderRadius: 4, background: "#ffffff" }} />
            <div>
              <div className="mf-header-title" style={{ fontWeight: 700, fontSize: 16, color: T.white, letterSpacing: "-0.02em", lineHeight: 1.2, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Cable Plan Configurator</div>
              <div className="mf-header-subtitle" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>MF Services — Door Systems</div>
            </div>
          </div>
          {system && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: T.white, fontWeight: 500 }}>
                {system.name} · {system.leafType}
              </div>
              {system.isFireDoor && (
                <div style={{ background: T.orange, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: T.white, letterSpacing: "0.06em" }}>FIRE DOOR</div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="mf-content-shell" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px" }}>
        <StepIndicator currentStep={currentStep} setCurrentStep={setCurrentStep} />

        {/* STEP 0: Select System */}
        {currentStep === 0 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>Select Door System</h1>
            <p style={{ color: T.textMuted, fontSize: 15, marginBottom: 32 }}>Choose the system you are configuring the cable plan for.</p>
          
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              {Object.values(SYSTEMS).map(sys => (
                <div key={sys.id} onClick={() => handleSelectSystem(sys.id)}
                  style={{ background: T.surface, border: `2px solid ${selectedSystemId === sys.id ? T.blue : T.border}`, borderRadius: 14, padding: 24, cursor: "pointer", transition: "all 200ms", boxShadow: selectedSystemId === sys.id ? `0 0 0 4px rgba(20,112,177,0.12), ${shadow.md}` : shadow.sm, minWidth: 400 }}>
                  {sys.id === "ets64r-single" && (
                    <div style={{ marginBottom: 20, padding: 16, background: T.surface2, borderRadius: 12, minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ETS64RDiagram system={sys} componentStates={{}} />
                    </div>
                  )}
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", marginBottom: 4 }}>{sys.name}</div>
                  <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 12 }}>{sys.leafType}</div>
                  {sys.isFireDoor && <div style={{ display: "inline-block", background: T.orangeLight, color: T.orange, border: `1px solid #FCD9B0`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>🔥 Fire Door</div>}
                  <div style={{ fontSize: 12, color: T.textFaint }}>{sys.components.length} components</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: Configure */}
        {currentStep === 1 && system && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>Configure Components</h1>
                <p style={{ color: T.textMuted, fontSize: 15 }}>Toggle optional components, select cable types, and add remarks.</p>
              </div>
              <div style={{ minWidth: 280 }}>
                <ValidationPanel validation={validation} />
              </div>
            </div>
            {/* Bento grid */}
             <div style={{ marginBottom: 28 }}>
  <WiringDiagram system={system} componentStates={componentStates} />
</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {system.components.map((comp, i) => (
                <div key={comp.id} style={{ gridColumn: comp.subComponents ? "1 / -1" : "auto" }}>
                  <ComponentCard comp={comp} state={componentStates} onStateChange={handleStateChange} system={system} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Project Details */}
        {currentStep === 2 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>Project Details</h1>
            <p style={{ color: T.textMuted, fontSize: 15, marginBottom: 32 }}>This information will appear on the generated PDF.</p>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 32, boxShadow: shadow.sm }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  ["constructionProject", "Construction Project"],
                  ["doorNumberOrNaming", "Door Number / Naming"],
                  ["installationLocation", "Installation Location"],
                  ["positionNumberInSpec", "Position No. in Specifications"],
                  ["functionDescription", "Function Description"],
                  ["miscellaneous", "Miscellaneous"],
                ].map(([key, label]) => (
                  <div key={key} style={{ gridColumn: key === "functionDescription" || key === "miscellaneous" ? "1 / -1" : "auto" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: 8 }}>{label}</label>
                    <input type="text" value={projectData[key]} onChange={e => setProjectData(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={`Enter ${label.toLowerCase()}...`}
                      style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 14, color: T.textPrimary, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color 150ms" }}
                      onFocus={e => e.target.style.borderColor = T.blue}
                      onBlur={e => e.target.style.borderColor = T.border}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {currentStep === 3 && system && (
          <ReviewAndGenerate system={system} componentStates={componentStates} projectData={projectData} />
        )}

        {/* ── NAV BUTTONS ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <button onClick={handleBack} disabled={currentStep === 0}
            style={{ background: T.surface, color: T.textBody, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 500, cursor: currentStep === 0 ? "not-allowed" : "pointer", opacity: currentStep === 0 ? 0.4 : 1, fontFamily: "DM Sans, sans-serif", transition: "all 150ms" }}>
            ← Previous
          </button>
          {currentStep < STEPS.length - 1 && (
            <button onClick={handleNext} disabled={currentStep === 0 && !selectedSystemId}
              style={{ background: (currentStep === 0 && !selectedSystemId) ? T.borderStrong : T.blue, color: T.white, border: "none", borderRadius: 10, padding: "13px 32px", fontSize: 14, fontWeight: 600, cursor: (currentStep === 0 && !selectedSystemId) ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 150ms", boxShadow: (currentStep === 0 && !selectedSystemId) ? "none" : shadow.sm }}>
              {currentStep === 1 && !validation.isValid ? "Fix errors to continue" : "Next Step →"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
