'use client'
import { useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import { AutomaticSlidingDoor, ManualSwingDoor, AccessibleDoor, FireDoor } from "./DoorIllustrations";

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

// ─── PDF GENERATION ───────────────────────────────────────────────────────────
function generateSpecPDF(doorType, hardwareSelections, projectData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Hardware Specification", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`MF Services — ${hardwareData.contact.website}`, margin, y);
  y += 5;
  doc.text(`Phone: ${hardwareData.contact.phone} | Email: ${hardwareData.contact.email}`, margin, y);
  y += 15;

  // Project Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Project Details", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const details = [
    `Construction Project: ${projectData.constructionProject}`,
    `Door Number/Naming: ${projectData.doorNumberOrNaming}`,
    `Installation Location: ${projectData.installationLocation}`,
    `Position No. in Specifications: ${projectData.positionNumberInSpec}`,
    `Function Description: ${projectData.functionDescription}`,
    `Miscellaneous: ${projectData.miscellaneous}`,
  ];
  details.forEach(detail => {
    doc.text(detail, margin, y);
    y += 6;
  });
  y += 10;

  // Door Type
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Door Type", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${doorType.label} — ${doorType.description}`, margin, y);
  y += 6;
  doc.text(`Manufacturer: ${doorType.manufacturer}`, margin, y);
  y += 10;

  // Hardware Schedule
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Hardware Schedule", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  if (doorType.id === "automatic-sliding") {
    // LEANA hardware display
    if (hardwareSelections.glazingOption) {
      const glazing = doorType.glazingOptions.find(g => g.id === hardwareSelections.glazingOption);
      doc.text(`Glazing Option: ${glazing.label}`, margin, y);
      y += 6;
    }
    if (hardwareSelections.leanaOptions && hardwareSelections.leanaOptions.length > 0) {
      doc.text("LEANA Options:", margin, y);
      y += 6;
      hardwareSelections.leanaOptions.forEach(optId => {
        const opt = doorType.options.find(o => o.id === optId);
        if (opt) {
          doc.text(`• ${opt.label}`, margin + 5, y);
          y += 6;
        }
      });
    }
  } else {
    // Traditional hardware display
    if (hardwareSelections.closer) {
      const closer = hardwareData.hardware.doorClosers.find(c => c.id === hardwareSelections.closer);
      const variant = hardwareSelections.closerVariant ? closer.variants.find(v => v.id === hardwareSelections.closerVariant) : null;
      doc.text(`Door Closer: ${closer.label}${variant ? ` (${variant.label})` : ''}`, margin, y);
      y += 6;
      if (variant) {
        doc.text(`Article No: ${variant.articleNo}`, margin + 10, y);
        y += 6;
      }
    }
    if (hardwareSelections.leverHandle) {
      const handle = hardwareData.hardware.leverHandles.find(h => h.id === hardwareSelections.leverHandle);
      doc.text(`Lever Handle: ${handle.label}`, margin, y);
      y += 6;
    }
    if (hardwareSelections.panicHardware) {
      const panic = hardwareData.hardware.panicHardware.find(p => p.id === hardwareSelections.panicHardware);
      doc.text(`Panic Hardware: ${panic.label}`, margin, y);
      y += 6;
    }
  }
  y += 10;

  // Applicable Standards
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Applicable EN Standards", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doorType.standards.forEach(standard => {
    doc.text(`${standard.code} — ${standard.description}`, margin, y);
    y += 6;
  });

  // Footer
  y = doc.internal.pageSize.getHeight() - 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);

  doc.save(`Hardware_Spec_${projectData.doorNumberOrNaming || 'Door'}.pdf`);
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
import hardwareData from '../data/hardware-products.json';

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const STEPS = ["Select", "Hardware", "Project", "Review"];

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
export default function SpecGenerator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDoorType, setSelectedDoorType] = useState(null);
  const [hardwareSelections, setHardwareSelections] = useState({});
  const [projectData, setProjectData] = useState({ constructionProject: "", doorNumberOrNaming: "", installationLocation: "", positionNumberInSpec: "", functionDescription: "", miscellaneous: "" });

  const doorType = selectedDoorType ? hardwareData.doorTypes.find(dt => dt.id === selectedDoorType) : null;

  const handleSelectDoorType = id => { setSelectedDoorType(id); setHardwareSelections({}); };
  const handleHardwareChange = useCallback((key, value) => { setHardwareSelections(prev => ({ ...prev, [key]: value })); }, []);
  const handleNext = () => { setCurrentStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  return (
    <div style={{ minHeight: "100vh", background: T.canvas, fontFamily: "DM Sans, sans-serif", color: T.textBody }}>
      {/* ── HEADER ── */}
      <header className="mf-app-header" style={{  background: T.navy, borderBottom: `3px solid ${T.orange}`, padding: "0 32px", borderRadius: 12, boxShadow: shadow.md, marginBottom: 20 }}>
        <div className="mf-header-inner" style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 16 }}>
          <div className="mf-header-row" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/linkedin.jpg" alt="MF Services" style={{ height: 40, width: "auto", borderRadius: 4, background: "#ffffff" }} />
            <div>
              <div className="mf-header-title" style={{ fontWeight: 700, fontSize: 16, color: T.white, letterSpacing: "-0.02em", lineHeight: 1.2, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Hardware Spec Generator</div>
              <div className="mf-header-subtitle" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>MF Services — Door Systems</div>
            </div>
          </div>
          {doorType && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: T.white, fontWeight: 500 }}>
                {doorType.label}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="mf-content-shell" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px" }}>
        <StepIndicator currentStep={currentStep} setCurrentStep={setCurrentStep} />

        {/* STEP 0: Select Door Type */}
        {currentStep === 0 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>Select Door Type</h1>
            <p style={{ color: T.textMuted, fontSize: 15, marginBottom: 32 }}>Choose the door type you are generating a specification for.</p>
          
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {hardwareData.doorTypes.map(dt => {
                const IllustrationComponents = {
                  "automatic-sliding": AutomaticSlidingDoor,
                  "manual-swing-standard": ManualSwingDoor,
                  "manual-swing-accessible": AccessibleDoor,
                  "fire-door": FireDoor,
                };
                const Illustration = IllustrationComponents[dt.id] || ManualSwingDoor;

                return (
                  <div key={dt.id} onClick={() => handleSelectDoorType(dt.id)}
                    style={{ background: T.surface, border: `2px solid ${selectedDoorType === dt.id ? T.blue : T.border}`, borderRadius: 14, padding: 24, cursor: "pointer", transition: "all 200ms", boxShadow: selectedDoorType === dt.id ? `0 0 0 4px rgba(20,112,177,0.12), ${shadow.md}` : shadow.sm }}>
                    <div style={{ width: "100%", marginBottom: 18 }}>
                      <Illustration />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", marginBottom: 4 }}>{dt.label}</div>
                    <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 12 }}>{dt.description}</div>
                    <div style={{ fontSize: 12, color: T.textFaint }}>{dt.manufacturer}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Configure Hardware */}
        {currentStep === 1 && doorType && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>Configure Hardware</h1>
                <p style={{ color: T.textMuted, fontSize: 15 }}>Select hardware components for your door specification.</p>
              </div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 32, boxShadow: shadow.sm }}>
              {/* LEANA-specific configuration for automatic-sliding doors */}
              {doorType.id === "automatic-sliding" ? (
                <>
                  {/* Glazing Options */}
                  <div style={{ marginBottom: 32 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, display: "block", marginBottom: 12 }}>Glazing Option</label>
                    <select value={hardwareSelections.glazingOption || ""} onChange={e => handleHardwareChange("glazingOption", e.target.value)}
                      style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 14, color: T.textPrimary, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color 150ms" }}
                      onFocus={e => e.target.style.borderColor = T.blue}
                      onBlur={e => e.target.style.borderColor = T.border}
                    >
                      <option value="">Select Glazing Option</option>
                      {doorType.glazingOptions?.map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* LEANA Options */}
                  <div style={{ marginBottom: 32 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, display: "block", marginBottom: 12 }}>LEANA Options</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {doorType.options?.map(opt => (
                        <label key={opt.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={(hardwareSelections.leanaOptions || []).includes(opt.id)}
                            onChange={e => {
                              const current = hardwareSelections.leanaOptions || [];
                              const updated = e.target.checked ? [...current, opt.id] : current.filter(id => id !== opt.id);
                              handleHardwareChange("leanaOptions", updated);
                            }}
                            style={{ marginTop: 2, cursor: "pointer", width: 18, height: 18 }}
                          />
                          <div>
                            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 500 }}>{opt.label}</div>
                            {opt.description && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{opt.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Door Closer */}
                  <div style={{ marginBottom: 32 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, display: "block", marginBottom: 12 }}>Door Closer</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: 8 }}>Model</label>
                        <select value={hardwareSelections.closer || doorType.recommendedCloser || ""} onChange={e => handleHardwareChange("closer", e.target.value)}
                          style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 14, color: T.textPrimary, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color 150ms" }}
                          onFocus={e => e.target.style.borderColor = T.blue}
                          onBlur={e => e.target.style.borderColor = T.border}
                        >
                          <option value="">Select Closer</option>
                          {hardwareData.hardware.doorClosers.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: 8 }}>Variant</label>
                        <select value={hardwareSelections.closerVariant || ""} onChange={e => handleHardwareChange("closerVariant", e.target.value)}
                          style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 14, color: T.textPrimary, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color 150ms" }}
                          onFocus={e => e.target.style.borderColor = T.blue}
                          onBlur={e => e.target.style.borderColor = T.border}
                        >
                          <option value="">Select Variant</option>
                          {hardwareSelections.closer && hardwareData.hardware.doorClosers.find(c => c.id === hardwareSelections.closer)?.variants.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Lever Handles */}
                  <div style={{ marginBottom: 32 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, display: "block", marginBottom: 12 }}>Lever Handles</label>
                    <select value={hardwareSelections.leverHandle || ""} onChange={e => handleHardwareChange("leverHandle", e.target.value)}
                      style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 14, color: T.textPrimary, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color 150ms" }}
                      onFocus={e => e.target.style.borderColor = T.blue}
                      onBlur={e => e.target.style.borderColor = T.border}
                    >
                      <option value="">Select Lever Handle</option>
                      {hardwareData.hardware.leverHandles.map(h => (
                        <option key={h.id} value={h.id}>{h.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Panic Hardware (if applicable) */}
                  {(doorType.id === "fire-door" || doorType.id === "manual-swing-accessible") && (
                    <div style={{ marginBottom: 32 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, display: "block", marginBottom: 12 }}>Panic Hardware</label>
                      <select value={hardwareSelections.panicHardware || ""} onChange={e => handleHardwareChange("panicHardware", e.target.value)}
                        style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 14, color: T.textPrimary, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color 150ms" }}
                        onFocus={e => e.target.style.borderColor = T.blue}
                        onBlur={e => e.target.style.borderColor = T.border}
                      >
                        <option value="">Select Panic Hardware</option>
                        {hardwareData.hardware.panicHardware.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
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

        {/* STEP 3: Review and Generate */}
        {currentStep === 3 && doorType && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 6 }}>Review and Generate</h1>
            <p style={{ color: T.textMuted, fontSize: 15, marginBottom: 32 }}>Review your selections and download the hardware specification PDF.</p>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 32, boxShadow: shadow.sm, marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>Door Type Summary</h2>
              <p style={{ color: T.textBody, marginBottom: 16 }}>{doorType.label} — {doorType.description}</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>Hardware Schedule</h2>
              <ul style={{ color: T.textBody, marginBottom: 16 }}>
                {doorType.id === "automatic-sliding" ? (
                  <>
                    {hardwareSelections.glazingOption && (
                      <li>Glazing Option: {doorType.glazingOptions?.find(g => g.id === hardwareSelections.glazingOption)?.label}</li>
                    )}
                    {hardwareSelections.leanaOptions && hardwareSelections.leanaOptions.length > 0 && (
                      <li>
                        Options:
                        <ul>
                          {hardwareSelections.leanaOptions.map(optId => {
                            const opt = doorType.options?.find(o => o.id === optId);
                            return <li key={optId}>{opt?.label}</li>;
                          })}
                        </ul>
                      </li>
                    )}
                  </>
                ) : (
                  <>
                    {hardwareSelections.closer && <li>Door Closer: {hardwareData.hardware.doorClosers.find(c => c.id === hardwareSelections.closer)?.label} {hardwareSelections.closerVariant && `(${hardwareData.hardware.doorClosers.find(c => c.id === hardwareSelections.closer)?.variants.find(v => v.id === hardwareSelections.closerVariant)?.label})`}</li>}
                    {hardwareSelections.leverHandle && <li>Lever Handle: {hardwareData.hardware.leverHandles.find(h => h.id === hardwareSelections.leverHandle)?.label}</li>}
                    {hardwareSelections.panicHardware && <li>Panic Hardware: {hardwareData.hardware.panicHardware.find(p => p.id === hardwareSelections.panicHardware)?.label}</li>}
                  </>
                )}
              </ul>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>Applicable EN Standards</h2>
              <ul style={{ color: T.textBody }}>
                {doorType.standards.map(s => <li key={s.code}>{s.code} — {s.description}</li>)}
              </ul>
            </div>
            <button onClick={() => generateSpecPDF(doorType, hardwareSelections, projectData)} style={{ background: T.blue, color: T.white, border: "none", borderRadius: 10, padding: "13px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 150ms", boxShadow: shadow.sm }}>
              Download Spec PDF
            </button>
          </div>
        )}

        {/* ── NAV BUTTONS ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <button onClick={handleBack} disabled={currentStep === 0}
            style={{ background: T.surface, color: T.textBody, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 500, cursor: currentStep === 0 ? "not-allowed" : "pointer", opacity: currentStep === 0 ? 0.4 : 1, fontFamily: "DM Sans, sans-serif", transition: "all 150ms" }}>
            ← Previous
          </button>
          {currentStep < STEPS.length - 1 && (
            <button onClick={handleNext} disabled={currentStep === 0 && !selectedDoorType}
              style={{ background: (currentStep === 0 && !selectedDoorType) ? T.borderStrong : T.blue, color: T.white, border: "none", borderRadius: 10, padding: "13px 32px", fontSize: 14, fontWeight: 600, cursor: (currentStep === 0 && !selectedDoorType) ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 150ms", boxShadow: (currentStep === 0 && !selectedDoorType) ? "none" : shadow.sm }}>
              Next Step →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}