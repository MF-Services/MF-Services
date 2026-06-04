'use client'
import { useState, useMemo, useEffect } from 'react'
import {
  evaluateCloser,
  findBestRecommendation,
  getDoorMoments,
  getRecommendedSize,
  getMaxWeight,
  EN_SIZES,
  MAX_OPENING_FORCE_N,
} from '../lib/overpressure'
import closerProducts from '../data/closer-products.json'

// Round-half-up to 2 decimal places. JS's toFixed uses round-half-to-even
// AND suffers from FP representation issues (e.g. 1.1*2.05 = 2.255 → "2.25"),
// so we nudge with an epsilon to match the ECO Toolbox display convention.
const fmt2 = (n) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)

// ─── DESIGN TOKENS (match other modules) ─────────────────────────
const T = {
  navy:         "#00387B",
  blue:         "#1470B1",
  blueLight:    "#E8F2FA",
  orange:       "#ED6E02",
  orangeLight:  "#FEF3E8",
  green:        "#B1C638",
  greenDark:    "#8A9B2A",
  greenLight:   "#F4F7E0",
  yellow:       "#E8C547",   // "smaller than recommendation" state
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
}
const shadow = {
  xs: "0 1px 2px rgba(0,56,123,0.04)",
  sm: "0 2px 8px rgba(0,56,123,0.06), 0 1px 2px rgba(0,56,123,0.04)",
  md: "0 4px 16px rgba(0,56,123,0.08), 0 2px 4px rgba(0,56,123,0.04)",
  lg: "0 8px 32px rgba(0,56,123,0.10), 0 2px 8px rgba(0,56,123,0.06)",
};

// ─── DEFAULTS ────────────────────────────────────────────────────
// All dimensions in METRES (matches ECO Toolbox reference UI).
const DEFAULT_INPUTS = {
  doorWidth: 1.1,                // m
  doorHeight: 2.05,              // m
  doorWeight: 120,               // kg
  handleToEdge: 0.1,             // m  (distance handle → sash edge)
  overpressureDirection: 'hinge',// 'hinge' | 'opposite'
  pressureDifference: 15,        // Pa
  frictionTorque: 10,            // Nm
  equipment: 'default',          // 'high' | 'default'
}

// Upper bounds for each input. Values strictly greater than
// these surface an inline error under the field but the calculator still
// runs — the goal is to flag obvious nonsense (a 50m wide door, a 9 bar
// pressure differential) without blocking experimentation.
const INPUT_MAX = {
  doorWidth:          5,     // m
  doorHeight:         4,     // m
  doorWeight:         500,   // kg
  handleToEdge:       1,     // m
  pressureDifference: 100,   // Pa
  frictionTorque:     100,   // Nm
}

// Matrix cell states — mirror the strings used by evaluateCloser().
const CELL = {
  WITHIN:  'within',   // green  — within EN 1154 recommendation
  SMALLER: 'smaller',  // yellow  — smaller than recommendation but works
  UNFIT:   'unfit',    // red  — opening force exceeds 100 N
  NA:      'na',       // — closer doesn't offer this EN size
}

export default function OverpressureCalculator() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [selectedCell, setSelectedCell] = useState(null) // { productId, enSize } | null
  const [helpOpen, setHelpOpen] = useState(false)

  const update = (field, value) =>
    setInputs(prev => ({ ...prev, [field]: value }))

  const reset = () => {
    setInputs(DEFAULT_INPUTS)
    setSelectedCell(null)
  }

  // ─── Door-level moments (closer-agnostic) ─────────────────────
  const doorMoments = useMemo(() => getDoorMoments(inputs), [inputs])

  // ─── Build the product × EN-size matrix ───────────────────────
  // Each cell is a full evaluation so click-to-select gets all the
  // derived numbers (force, can-close, etc.) without recomputing.
  const matrix = useMemo(() => closerProducts.map(product => ({
    product,
    cells: EN_SIZES.map(size => ({
      enSize: size,
      ...evaluateCloser(inputs, product, size),
    })),
  })), [inputs])

  const recommendedSize = useMemo(
    () => getRecommendedSize(inputs.doorWidth * 1000),
    [inputs.doorWidth],
  )

  // ─── Selection (panel 3) ──────────────────────────────────────
  // Auto-pick the best recommendation, matrix click overrides.
  const activeSelection = useMemo(() => {
    if (selectedCell) {
      const row = matrix.find(r => r.product.id === selectedCell.productId)
      const cell = row?.cells.find(c => c.enSize === selectedCell.enSize)
      if (row && cell && cell.state !== 'na') {
        return { product: row.product, enSize: cell.enSize, evaluation: cell }
      }
    }
    return findBestRecommendation(inputs, closerProducts)
  }, [selectedCell, matrix, inputs])

  return (
    <>
      {/* Container queries (not media queries) — the grid stacks based on
          the calculator's own container width, not the viewport. This
          matters because the app shell around this component may be
          narrower than the viewport (sidebar, max-width app layout, etc). */}
      <style>{`
        .op-wrapper {
          container-name: op-calc;
          container-type: inline-size;
        }
        @container op-calc (max-width: 1240px) {
          .op-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="op-wrapper" style={{
        background: T.canvas,
        width: '100%',
        boxSizing: 'border-box',
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* ── HEADER ── */}
          <header className="mf-app-header" style={{ background: T.navy, borderBottom: `3px solid ${T.orange}`, padding: "0 32px", borderRadius: 12, boxShadow: shadow.md, marginBottom: 20 }}>
            <div className="mf-header-inner" style={{ display: 'flex', alignItems: "center", justifyContent: "space-between", height: 64, gap: 16 }}>
              <div className="mf-header-row" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img src="/linkedin.jpg" alt="MF Services" style={{ height: 40, width: "auto", borderRadius: 4, background: "#ffffff" }} />
                <div>
                  <div className="mf-header-title" style={{ fontWeight: 700, fontSize: 16, color: T.white, letterSpacing: "-0.02em", lineHeight: 1.2, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Overpressure Calculator</div>
                  <div className="mf-header-subtitle" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>MF Services — Door Systems</div>
                </div>
              </div>
            </div>
          </header>

          <div className="op-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(400px, 1.25fr) minmax(300px, 1fr)',
            gap: 24,
            alignItems: 'start',
          }}>
            <DataPanel inputs={inputs} update={update} reset={reset} onHelp={() => setHelpOpen(true)}/>
            <ResultPanel
              matrix={matrix}
              selectedCell={selectedCell}
              onCellClick={setSelectedCell}
              direction={inputs.overpressureDirection}
            />
            <SelectionPanel
              selection={activeSelection}
              doorMoments={doorMoments}
              doorWeight={inputs.doorWeight}
              doorWidthMm={inputs.doorWidth * 1000}
              direction={inputs.overpressureDirection}
            />
          </div>
        </div>
      </div>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PANEL 1 — DATA
// ═══════════════════════════════════════════════════════════════════
function DataPanel({ inputs, update, reset, onHelp }) {
  return (
    <Panel>
      <PanelHeader number="1" title="Data" subtitle="Please enter your data for the calculation." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <RowField label="Door width">
          <UnitInput value={inputs.doorWidth} step={0.01} unit="m" max={INPUT_MAX.doorWidth}
            onChange={v => update('doorWidth', v)} />
        </RowField>

        <RowField label="Door height">
          <UnitInput value={inputs.doorHeight} step={0.01} unit="m" max={INPUT_MAX.doorHeight}
            onChange={v => update('doorHeight', v)} />
        </RowField>

        <RowField label="Door weight">
          <UnitInput value={inputs.doorWeight} step={1} unit="kg" max={INPUT_MAX.doorWeight}
            onChange={v => update('doorWeight', v)} />
        </RowField>

        <RowField label="Distance handle to sash edge" info onInfoClick={onHelp}>
          <UnitInput value={inputs.handleToEdge} step={0.01} unit="m" max={INPUT_MAX.handleToEdge}
            onChange={v => update('handleToEdge', v)} />
        </RowField>

        <RowField label="Overpressure direction" info align="start" onInfoClick={onHelp}>
          <RadioGroup
            value={inputs.overpressureDirection}
            onChange={v => update('overpressureDirection', v)}
            options={[
              { id: 'hinge',    label: 'Hinge side' },
              { id: 'opposite', label: 'Opposite hinge side' },
            ]}
          />
        </RowField>

        <RowField label="Overpressure">
          <UnitInput value={inputs.pressureDifference} step={1} unit="Pa(N/m²)" max={INPUT_MAX.pressureDifference}
            onChange={v => update('pressureDifference', v)} />
        </RowField>

        <RowField label="Friction torque estimated" info onInfoClick={onHelp}>
          <UnitInput value={inputs.frictionTorque} step={0.5} unit="Nm" max={INPUT_MAX.frictionTorque}
            onChange={v => update('frictionTorque', v)} />
        </RowField>

        <RowField label="Equipment" align="start">
          <RadioGroup
            value={inputs.equipment}
            onChange={v => update('equipment', v)}
            options={[
              { id: 'high',    label: 'High quality equipment', sub: '(e.g. ECO OBX fittings)' },
              { id: 'default', label: 'Default equipment' },
            ]}
          />
        </RowField>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTop: `1px solid ${T.border}`,
      }}>
        <button
          onClick={reset}
          style={{
            background: 'none',
            border: 'none',
            color: T.orange,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ‹ Reset
        </button>
      </div>
    </Panel>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PANEL 2 — RESULT MATRIX
// ═══════════════════════════════════════════════════════════════════
function ResultPanel({ matrix, selectedCell, onCellClick, direction }) {
  const isOpposite = direction === 'opposite'
  // The ECO Toolbox reframes the matrix per direction: for hinge-side
  // overpressure the question is "can it open under 100 N?"; for
  // opposite-side it's "can it close against the pressure?".
  const subtitle = isOpposite
    ? 'The following ECO door closer models can close against the overpressure.'
    : `The following ECO door closer models are suitable to open the door with < ${MAX_OPENING_FORCE_N} N force.`
  const unfitLegend = isOpposite
    ? 'Not suitable for closing the door against the overpressure.'
    : `Not suitable to open the door with < ${MAX_OPENING_FORCE_N} N force.`

  return (
    <Panel>
      <PanelHeader
        number="2"
        title="Result"
        subtitle={subtitle}
      />

      <div style={{ marginBottom: 16, fontSize: 13, color: T.textBody }}>
        <div style={{ marginBottom: 8 }}>
          Please click a <CellIcon state={CELL.WITHIN} inline /> / <CellIcon state={CELL.SMALLER} inline /> / <CellIcon state={CELL.UNFIT} inline />
        </div>
        <LegendRow state={CELL.WITHIN}  text="Within the setting recommendation according to EN 1154." />
        <LegendRow state={CELL.SMALLER} text="Smaller than the setting recommendation according to EN 1154." />
        <LegendRow state={CELL.UNFIT}   text={unfitLegend} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.borderStrong}` }}>
              <th style={thStyle} />
              {EN_SIZES.map(size => (
                <th key={size} style={{ ...thStyle, textAlign: 'center' }}>
                  EN{size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ product, cells }) => (
              <tr key={product.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={tdLabel}>
                  <div style={{ fontWeight: 600, color: T.textPrimary }}>{product.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{product.enRange}</div>
                </td>
                {cells.map(cell => {
                  const isSelected =
                    selectedCell?.productId === product.id &&
                    selectedCell?.enSize === cell.enSize
                  const clickable = cell.state !== CELL.NA
                  const tooltip = clickable && cell.forceAtPusher != null
                    ? `${fmt2(cell.forceAtPusher)} N at the handle`
                    : undefined
                  return (
                    <td
                      key={cell.enSize}
                      title={tooltip}
                      onClick={clickable ? () => onCellClick({ productId: product.id, enSize: cell.enSize }) : undefined}
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        cursor: clickable ? 'pointer' : 'default',
                        background: isSelected ? T.blueLight : 'transparent',
                        borderRadius: isSelected ? 6 : 0,
                        transition: 'background 0.15s',
                      }}
                    >
                      <CellIcon state={cell.state} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

const thStyle = {
  padding: '10px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: T.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}
const tdLabel = {
  padding: '12px 8px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

// ═══════════════════════════════════════════════════════════════════
// PANEL 3 — YOUR SELECTION
// ═══════════════════════════════════════════════════════════════════
function SelectionPanel({ selection, doorMoments, doorWeight, doorWidthMm, direction }) {
  if (!selection) {
    return (
      <Panel>
        <PanelHeader number="3" title="Your selection" subtitle="No closer matches the scenario." />
        <div style={{ color: T.textMuted, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          Adjust the inputs to see a recommendation.
        </div>
      </Panel>
    )
  }

  const { product, enSize, evaluation } = selection
  const isOpposite = direction === 'opposite'
  // The "primary" status under the force display matches whatever the
  // matrix evaluates against — opening criterion for hinge-side,
  // closing criterion for opposite-side (matches ECO Toolbox layout).
  const primaryOk = isOpposite
    ? evaluation.canClose
    : (evaluation.forceAtPusher <= MAX_OPENING_FORCE_N && evaluation.forceAtPusher >= 0)
  const primaryFailText = isOpposite
    ? 'Not suitable for closing the door against the overpressure.'
    : `Not suitable to open the door with < ${MAX_OPENING_FORCE_N} N force.`

  // Negative force or near-zero with opposite direction = overpressure is doing the user's work.
  const overpressureAssists = isOpposite && evaluation.forceAtPusher < evaluation.forceWithoutOverpressure

  // Decision Guide rating — only shown if the product has a weight table
  // (some products in our JSON don't yet — see _notes in closer-products.json).
  const weightRating = getMaxWeight(product, doorWidthMm)
  const weightOk = weightRating ? doorWeight <= weightRating.weight : null

  return (
    <Panel>
      <PanelHeader number="3" title="Your selection" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          What is the force when opening against overpressure at the handle?
        </div>
        <div style={{ color: T.textMuted, fontSize: 12, marginBottom: 12 }}>
          (Depending on the opening torque of the door closer)
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{ color: T.textBody, fontWeight: 600 }}>Force at pusher</span>
          <span style={{ color: T.textPrimary, fontWeight: 700, fontSize: 16, fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
            {fmt2(evaluation.forceAtPusher)} N
            {overpressureAssists && (
              <span style={{ display: 'block', fontWeight: 500, fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                — overpressure assists opening
              </span>
            )}
          </span>
        </div>
        <StatusLine
          ok={primaryOk}
          okText="Within the setting recommendation according to EN 1154."
          failText={primaryFailText}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          Can the door close against overpressure?
        </div>
        <div style={{ color: T.textMuted, fontSize: 12, marginBottom: 8 }}>
          (Depending on the closing torque of the door closer)
        </div>
        <StatusLine
          ok={evaluation.canClose}
          okText="Door will close"
          failText="Door will not close"
        />
      </div>

      {weightRating && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Is the closer rated for this door weight?
          </div>
          <div style={{ color: T.textMuted, fontSize: 12, marginBottom: 8 }}>
            (Per ECO Decision Guide: max {weightRating.weight} kg at {weightRating.atWidth} mm width)
          </div>
          <StatusLine
            ok={weightOk}
            okText={`${doorWeight} kg door is within the ${weightRating.weight} kg rating`}
            failText={`${doorWeight} kg door exceeds the ${weightRating.weight} kg rating`}
          />
        </div>
      )}

      <div style={{
        borderTop: `1px solid ${T.border}`,
        paddingTop: 16,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '10px 12px',
        fontSize: 13,
      }}>
        <div />
        <div style={{ color: T.textPrimary, fontWeight: 700, textAlign: 'right' }}>
          {product.name} {product.enRange}
        </div>

        <DetailRow label="Door closer" value={`EN${enSize}`} />
        <DetailRow label="Surface" value={`${fmt2(doorMoments.area)} m²`} />
        {/* Strictly speaking this is a mass moment of inertia (kg·m²); the
            ECO Toolbox screenshot labels it kg/m² so we follow suit. */}
        <DetailRow label="Inertia" value={`${fmt2(doorMoments.inertia)} kg/m²`} />
        <DetailRow
          label="Moment on door leaf"
          sub="due to the overpressure"
          value={`${fmt2(doorMoments.overpressureMoment)} Nm`}
        />
        <DetailRow
          label="Total torque"
          sub="from overpressure and friction"
          value={`${fmt2(doorMoments.totalTorque)} Nm`}
        />
        <DetailRow
          label="Force at pusher"
          sub="without overpressure"
          value={`${fmt2(evaluation.forceWithoutOverpressure)} N`}
        />
      </div>
    </Panel>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SHARED UI HELPERS
// ═══════════════════════════════════════════════════════════════════
function Panel({ children }) {
  return (
    <div style={{
      background: T.surface2,
      borderRadius: 12,
      padding: 28,
      minHeight: 440,
    }}>
      {children}
    </div>
  )
}

function PanelHeader({ number, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{
        color: T.textPrimary,
        fontSize: 20,
        fontWeight: 700,
        margin: '0 0 4px',
      }}>
        <span style={{ color: T.textPrimary }}>{number}. </span>{title}
      </h2>
      {subtitle && (
        <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>{subtitle}</p>
      )}
    </div>
  )
}

function RowField({ label, info, align = 'center', onInfoClick, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      gap: 12,
      alignItems: align === 'start' ? 'flex-start' : 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textBody, fontSize: 13, fontWeight: 600, paddingTop: align === 'start' ? 8 : 0 }}>
        <span>{label}</span>
        {info && <InfoIcon onClick={onInfoClick} />}
      </div>
      <div>{children}</div>
    </div>
  )
}

function InfoIcon({ onClick }) {
  // Renders as a button when onClick is provided so the icon is keyboard-
  // focusable and screen-reader-discoverable. Falls back to a static span
  // for callers that don't want it interactive.
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: `1px solid ${T.textMuted}`,
    color: T.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: 600,
  }
  if (!onClick) return <span style={baseStyle}>i</span>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show help diagram"
      style={{
        ...baseStyle,
        cursor: 'pointer',
        background: 'transparent',
        padding: 0,
      }}
    >
      i
    </button>
  )
}

// ─── HELP MODAL ──────────────────────────────────────────────────
// Shared by all three info icons in DataPanel (Distance handle, Direction,
// Friction). The diagram lives at /public/overpressure-help.png — Next.js
// serves it at /overpressure-help.png (no /public/ prefix in URLs).
function HelpModal({ open, onClose }) {
  // Close on ESC. The effect short-circuits when closed, so there's no
  // listener bound while the modal is hidden.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Help"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 28, 46, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surface,
          borderRadius: 8,
          maxWidth: 900,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 32,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(15, 28, 46, 0.25)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
            Help
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4,
              color: T.textMuted,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <img
          src="/overpressure-help.png"
          alt="Diagram explaining overpressure direction, distance handle to sash edge, and friction torque"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}

function UnitInput({ value, onChange, unit, step = 1, max }) {
  // Validation: per spec, error fires when value > max. The field is
  // never disabled — we still pass the value through to the calc so the
  // user can see the (likely nonsensical) result alongside the warning.
  const exceedsMax = max != null && value > max
  const borderColor = exceedsMax ? T.red : T.border

  return (
    <div>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: T.surface,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <input
          type="number"
          value={value}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          aria-invalid={exceedsMax || undefined}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            fontFamily: 'DM Mono, monospace',
            color: T.textPrimary,
            background: 'transparent',
            width: '100%',
          }}
        />
        <span style={{
          padding: '0 12px',
          color: T.textMuted,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {unit}
        </span>
      </div>
      {exceedsMax && (
        <div style={{
          color: T.red,
          fontSize: 12,
          marginTop: 4,
          lineHeight: 1.3,
        }}>
          Value must be less than {max} {unit}
        </div>
      )}
    </div>
  )
}

function RadioGroup({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => {
        const checked = value === opt.id
        return (
          <label key={opt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: `2px solid ${checked ? T.orange : T.borderStrong}`,
              background: checked ? T.orange : 'transparent',
              flexShrink: 0,
              marginTop: 1,
            }}>
              {checked && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.white }} />}
            </span>
            <input
              type="radio"
              checked={checked}
              onChange={() => onChange(opt.id)}
              style={{ display: 'none' }}
            />
            <span>
              <span style={{ color: T.textBody, fontSize: 13, fontWeight: 500 }}>{opt.label}</span>
              {opt.sub && (
                <span style={{ display: 'block', color: T.textMuted, fontSize: 12 }}>{opt.sub}</span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function CellIcon({ state, inline = false }) {
  const size = inline ? 14 : 18
  if (state === CELL.WITHIN) {
    return <CheckIcon size={size} color={T.green} />
  }
  if (state === CELL.SMALLER) {
    return <CheckIcon size={size} color={T.yellow} />
  }
  if (state === CELL.UNFIT) {
    return <CrossIcon size={size} color={T.red} />
  }
  return <span style={{ color: T.textFaint, fontSize: 14 }}>—</span>
}

function CheckIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M4 10.5L8 14.5L16 6.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M5 5L15 15M15 5L5 15" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function LegendRow({ state, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <CellIcon state={state} inline />
      <span style={{ color: T.textBody, fontSize: 12 }}>{text}</span>
    </div>
  )
}

function StatusLine({ ok, okText, failText }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <CellIcon state={ok ? CELL.WITHIN : CELL.UNFIT} inline />
      <span style={{ color: ok ? T.greenDark : T.red, fontSize: 13, fontWeight: 500 }}>
        {ok ? okText : failText}
      </span>
    </div>
  )
}

function DetailRow({ label, sub, value }) {
  return (
    <>
      <div>
        <div style={{ color: T.textBody, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ color: T.textMuted, fontSize: 12, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{
        color: T.textPrimary,
        fontWeight: 600,
        fontFamily: 'DM Mono, monospace',
        textAlign: 'right',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </>
  )
}
