'use client'
import { useState, useMemo } from 'react'
import { calculateOperatingForce, recommendCloserSize, recommendCloserModel } from '../lib/overpressure'
import closerProducts from '../data/closer-products.json'

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

// ─── DEFAULTS ────────────────────────────────────────────────────
const DEFAULT_INPUTS = {
  doorWidth: 1000,         // mm
  doorHeight: 2100,        // mm
  pressureDifference: 50,  // Pa
  doorType: 'singleLeaf',  // 'singleLeaf' | 'doubleLeaf'
  equipmentGrade: 'standard', // 'standard' | 'accessible' | 'fireDoor'
}

const DOOR_TYPES = [
  { id: 'singleLeaf', label: 'Single leaf' },
  { id: 'doubleLeaf', label: 'Double leaf' },
]

const EQUIPMENT_GRADES = [
  { id: 'standard',   label: 'Standard',         maxForce: 67 },
  { id: 'accessible', label: 'Accessible (DDA)', maxForce: 30 },
  { id: 'fireDoor',   label: 'Fire door',        maxForce: 67 },
]

export default function OverpressureCalculator() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)

  const update = (field, value) => setInputs(prev => ({ ...prev, [field]: value }))

  // Live calculation — re-runs whenever inputs change
  const result = useMemo(() => {
    const force = calculateOperatingForce(inputs)
    const grade = EQUIPMENT_GRADES.find(g => g.id === inputs.equipmentGrade)
    const pass = force <= grade.maxForce
    const closerSize = recommendCloserSize(force, inputs.doorWidth)
    const closerModel = recommendCloserModel(closerSize, inputs, closerProducts)
    return { force, pass, maxForce: grade.maxForce, closerSize, closerModel }
  }, [inputs])

  return (
    <div style={{ padding: 24, background: T.surface, borderRadius: 16, border: `1px solid ${T.border}` }}>
      <h2 style={{ color: T.navy, fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
        Overpressure Calculator
      </h2>
      <p style={{ color: T.textMuted, fontSize: 14, margin: '0 0 24px' }}>
        Calculate operating force and recommended door closer for overpressure scenarios per EN 1154.
      </p>

      {/* ─── INPUTS ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <Field label="Door width (mm)">
          <NumberInput value={inputs.doorWidth} onChange={v => update('doorWidth', v)} />
        </Field>
        <Field label="Door height (mm)">
          <NumberInput value={inputs.doorHeight} onChange={v => update('doorHeight', v)} />
        </Field>
        <Field label="Pressure difference (Pa)">
          <NumberInput value={inputs.pressureDifference} onChange={v => update('pressureDifference', v)} />
        </Field>
        <Field label="Door type">
          <Select value={inputs.doorType} options={DOOR_TYPES} onChange={v => update('doorType', v)} />
        </Field>
        <Field label="Equipment grade">
          <Select value={inputs.equipmentGrade} options={EQUIPMENT_GRADES} onChange={v => update('equipmentGrade', v)} />
        </Field>
      </div>

      {/* ─── RESULTS ─────────────────────────────────────────── */}
      <div style={{
        padding: 20,
        background: result.pass ? T.greenLight : T.redLight,
        border: `1px solid ${result.pass ? T.green : T.red}`,
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{
            padding: '4px 12px',
            background: result.pass ? T.green : T.red,
            color: T.white,
            fontWeight: 700,
            fontSize: 12,
            borderRadius: 6,
            textTransform: 'uppercase',
          }}>
            {result.pass ? 'Pass' : 'Fail'}
          </span>
          <span style={{ color: T.textPrimary, fontWeight: 600 }}>
            Operating force: {result.force} N <span style={{ color: T.textMuted, fontWeight: 400 }}>(max {result.maxForce} N)</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 14 }}>
          <ResultRow label="Recommended EN closer size" value={`EN ${result.closerSize}`} />
          <ResultRow label="Recommended ECO Schulte model" value={result.closerModel?.name || 'Awaiting product data'} />
        </div>
      </div>

      {/* TODO: PDF export button matching the pattern in SpecGenerator.jsx / CablePlanConfigurator.jsx */}
    </div>
  )
}

// ─── SMALL UI HELPERS ────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: T.textBody, fontSize: 13, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

function NumberInput({ value, onChange }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        padding: '10px 12px',
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        fontSize: 14,
        fontFamily: 'DM Mono, monospace',
        color: T.textPrimary,
        background: T.surface,
      }}
    />
  )
}

function Select({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '10px 12px',
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        fontSize: 14,
        color: T.textPrimary,
        background: T.surface,
      }}
    >
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.label}</option>
      ))}
    </select>
  )
}

function ResultRow({ label, value }) {
  return (
    <div>
      <div style={{ color: T.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: T.textPrimary, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  )
}