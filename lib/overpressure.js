// ─────────────────────────────────────────────────────────────────
// Overpressure calculation logic — EN 1154
// ─────────────────────────────────────────────────────────────────
// Calculates the force required to open a door against a pressure
// differential, and evaluates each (closer product × EN size) combo.
//
// Coordinate / unit conventions
//   • All lengths to the calc layer in METRES.
//   • Forces in Newtons, moments/torques in Nm, pressures in Pa.
//   • Mass in kg.
//
// Physics summary
//   F_handle = ( M_closer + M_friction + M_overpressure ) / d_handle
//   M_overpressure = ΔP × A × (w / 2)
//   d_handle = w − handleToEdge
//   I_door = (1/3) × m × w²              (thin rectangle about its edge)
//
// References
//   • EN 1154:1996+A1:2002 — Building hardware: Controlled door closing devices
//   • ECO Schulte ECO Toolbox overpressure calculator
//     https://www.eco-schulte.com/en/eco-toolbox/overpressure-calculator
// ─────────────────────────────────────────────────────────────────

// ─── EN 1154 reference table (Table 1) ───────────────────────────
// Full torque + dimension reference per closer power size from
// EN 1154:1996+A1:2002. This table is INFORMATIVE — products can
// (and do) operate below these maxes / above these mins.
//
//   width            — recommended max door leaf width (mm)
//   mass             — TEST door mass (kg) — for the test procedure
//                       ONLY; NOT a max-load value. For real max
//                       weights see product.maxWeightByWidth (sourced
//                       from ECO Schulte's Decision Guide one-pager).
//   closeLatchMin    — closing moment 0-4°,    Nm min  (col 4)
//   closeLatchMax    — closing moment 0-4°,    Nm max  (col 5)
//   closeOperateMin  — closing moment 88-92°,  Nm min  (col 6)
//   anyAngleMin      — closing moment any θ,   Nm min  (col 7)
//   openMax          — opening moment 0-60°,   Nm MAX  (col 8)
//                       — the CEILING the user can be required to
//                         operate against; real products sit below it.
//   effMin           — closer efficiency,      % min   (col 9)
export const EN_1154_TORQUES = {
  1: { width: 750,  mass: 20,  closeLatchMin: 9,  closeLatchMax: 13,  closeOperateMin: 3,  anyAngleMin: 2,  openMax: 26,  effMin: 50 },
  2: { width: 850,  mass: 40,  closeLatchMin: 13, closeLatchMax: 18,  closeOperateMin: 4,  anyAngleMin: 3,  openMax: 36,  effMin: 50 },
  3: { width: 950,  mass: 60,  closeLatchMin: 18, closeLatchMax: 26,  closeOperateMin: 6,  anyAngleMin: 4,  openMax: 47,  effMin: 55 },
  4: { width: 1100, mass: 80,  closeLatchMin: 26, closeLatchMax: 37,  closeOperateMin: 9,  anyAngleMin: 6,  openMax: 62,  effMin: 60 },
  5: { width: 1250, mass: 100, closeLatchMin: 37, closeLatchMax: 54,  closeOperateMin: 12, anyAngleMin: 8,  openMax: 83,  effMin: 65 },
  6: { width: 1400, mass: 120, closeLatchMin: 54, closeLatchMax: 87,  closeOperateMin: 18, anyAngleMin: 11, openMax: 134, effMin: 65 },
  7: { width: 1600, mass: 160, closeLatchMin: 87, closeLatchMax: 140, closeOperateMin: 29, anyAngleMin: 18, openMax: 215, effMin: 65 },
}

// ─── ECO Schulte manufacturer uplifts ────────────────────────────
// Moritz @ ECO (internal): "ECO Schulte products run ~10% above
// EN 1154 min at 0-4° (latching) and ~20% above min at 88-92°
// (operating closing)." Manufacturer-wide rule, applies to all
// ECO products. Exact internal torque curves are not published.
// Individual products can override via product.uplifts.
export const ECO_UPLIFTS = {
  closeLatch:   1.10,  // multiplier on EN_1154_TORQUES[size].closeLatchMin
  closeOperate: 1.20,  // multiplier on EN_1154_TORQUES[size].closeOperateMin
}

// ─── Default opening moments per EN size ─────────────────────────
// Used when a product doesn't specify product.openingMoments[size].
//
// These are the OPERATING values (what real catalogue closers actually
// deliver), NOT the EN 1154 ceiling. The standard's openMax (26/36/47/
// 62/83/134 Nm for sizes 1-6) is the hard ceiling that must not be
// exceeded; real products sit well below it.
//
// Source: back-calibrated from ECO Toolbox reference example —
// TS-62 EN5 on a 1.1m door @ 0 Pa produces 64.41 N at the handle,
// which back-solves to M_open ≈ 54.4 Nm vs EN5 ceiling of 83 Nm.
// Replace these with manufacturer-published values when available.
export const DEFAULT_OPENING_MOMENT_NM = {
  1: 13,
  2: 18,
  3: 26,
  4: 37,
  5: 54,
  6: 67,
}

// EN 1154 size recommendation by leaf width — derived from EN_1154_TORQUES.
export const EN_MAX_WIDTH_MM = Object.fromEntries(
  Object.entries(EN_1154_TORQUES).map(([size, ref]) => [size, ref.width])
)

// @deprecated Renamed to DEFAULT_OPENING_MOMENT_NM. Same values.
export const EN_OPENING_MOMENT_NM = DEFAULT_OPENING_MOMENT_NM

// @deprecated These were the LATCHING moments (0-4°, when the closer
// is at its strongest), which is the wrong value to check "can the
// door start closing?" against. The right value is at 88-92° (closer
// at its weakest, door fully open) — now derived from EN_1154_TORQUES
// + ECO_UPLIFTS in getClosingMoment(). Kept here for back-compat.
export const EN_CLOSING_MOMENT_NM = {
  1: 9, 2: 13, 3: 18, 4: 26, 5: 37, 6: 54,
}

export const EN_SIZES = [1, 2, 3, 4, 5, 6]

// ECO Toolbox uses 100 N as the operability threshold (the reference UI
// says "suitable to open the door with < 100 N force").
export const MAX_OPENING_FORCE_N = 100

// ─── Door-level geometry & moments ───────────────────────────────

/**
 * Door leaf area (m²).
 */
export function getDoorArea({ doorWidth, doorHeight }) {
  return doorWidth * doorHeight
}

/**
 * Moment of inertia of the leaf about the hinge axis (kg·m²).
 * Thin rectangle rotating about one edge: I = (1/3) m w².
 *
 * NB: the reference UI labels this "kg/m²" but the quantity is
 * a mass moment of inertia (kg·m²). Display unit handled in UI.
 */
export function getDoorInertia({ doorWidth, doorWeight }) {
  return (doorWeight * doorWidth * doorWidth) / 3
}

/**
 * Pressure force on the leaf (N): F = ΔP × A.
 */
export function getPressureForce(inputs) {
  return inputs.pressureDifference * getDoorArea(inputs)
}

/**
 * Moment about the hinge from overpressure (Nm).
 * Centre of pressure for a uniform load on a rectangle is at w/2.
 */
export function getOverpressureMoment(inputs) {
  return getPressureForce(inputs) * (inputs.doorWidth / 2)
}

/**
 * Distance from hinge axis to handle (m).
 */
export function getHandleDistance(inputs) {
  return inputs.doorWidth - inputs.handleToEdge
}

/**
 * Door-level summary used by the "Your selection" panel (closer-agnostic).
 */
export function getDoorMoments(inputs) {
  const area = getDoorArea(inputs)
  const inertia = getDoorInertia(inputs)
  const overpressureMoment = getOverpressureMoment(inputs)
  const totalTorque = overpressureMoment + inputs.frictionTorque
  return { area, inertia, overpressureMoment, totalTorque }
}

// ─── EN 1154 size recommendation ─────────────────────────────────

/**
 * EN 1154-recommended closer size for a given door width.
 * @param {number} doorWidthMm - door width in MILLIMETRES
 * @returns {number} EN size (1–6)
 */
export function getRecommendedSize(doorWidthMm) {
  for (const size of EN_SIZES) {
    if (doorWidthMm <= EN_MAX_WIDTH_MM[size]) return size
  }
  return 6
}

// ─── Per-product moment lookup ───────────────────────────────────

/**
 * Opening moment for a (product, EN size) combination.
 *
 * Resolution order:
 *   1. product.openingMoments[enSize]            (explicit per-size override)
 *   2. DEFAULT_OPENING_MOMENT_NM[enSize] / armEfficiency
 *      (working approximation, scaled for arm mechanism efficiency)
 *
 * armEfficiency models the difference between scissors-arm closers
 * (efficient, ~1.0) and slide-rail / guide-rail variants (~0.85),
 * which need more spring torque to deliver the same opening force.
 *
 * NB: the EN 1154 ceiling is EN_1154_TORQUES[enSize].openMax — the
 * value returned here MUST sit at or below that to be standards-compliant.
 */
export function getOpeningMoment(product, enSize) {
  const override = product.openingMoments?.[enSize]
  if (typeof override === 'number') return override

  const base = DEFAULT_OPENING_MOMENT_NM[enSize]
  if (base == null) return null

  const eff = product.armEfficiency ?? 1.0
  return base / eff
}

/**
 * Closing moment used by the "can the door close" check.
 *
 * ECO Toolbox uses the LATCHING moment (EN 1154 col 4 closeLatchMin
 * × ECO uplift 1.10) as the threshold here — empirically verified by
 * comparing our calc against published reference scenarios. Physically
 * this represents the closer's torque near the closed position, which
 * is the relevant value for the question "will the door fully close
 * against opposing forces?".
 *
 * Resolution order:
 *   1. product.closingMoments[enSize]   (explicit per-size override)
 *   2. EN_1154_TORQUES[enSize].closeLatchMin × uplift
 *      where uplift = product.uplifts?.closeLatch ?? ECO_UPLIFTS.closeLatch
 */
export function getClosingMoment(product, enSize) {
  const override = product.closingMoments?.[enSize]
  if (typeof override === 'number') return override

  const refs = EN_1154_TORQUES[enSize]
  if (!refs) return null

  const uplift = product.uplifts?.closeLatch ?? ECO_UPLIFTS.closeLatch
  return refs.closeLatchMin * uplift
}

/**
 * Operating closing moment at 88-92° (door fully open). Lower than the
 * latching value; not what ECO Toolbox uses for its can-close check,
 * but exposed for diagnostics and possible future use.
 */
export function getOperatingClosingMoment(product, enSize) {
  const refs = EN_1154_TORQUES[enSize]
  if (!refs) return null
  const uplift = product.uplifts?.closeOperate ?? ECO_UPLIFTS.closeOperate
  return refs.closeOperateMin * uplift
}

/**
 * Latching moment at 0-4° (door almost closed) — exposed for clarity.
 * Same value as getClosingMoment by default (we use latching as the
 * can-close threshold); kept as a separate function for semantics.
 */
export function getLatchingMoment(product, enSize) {
  const override = product.latchingMoments?.[enSize]
  if (typeof override === 'number') return override

  const refs = EN_1154_TORQUES[enSize]
  if (!refs) return null

  const uplift = product.uplifts?.closeLatch ?? ECO_UPLIFTS.closeLatch
  return refs.closeLatchMin * uplift
}

/**
 * Look up a closer's max rated door weight at a given width.
 * Source: ECO Schulte "Decision support for ECO door closers" one-pager.
 *
 * Strategy: conservative round-UP — for a 1050mm door we look up the
 * 1100mm rating, not 950mm, because the longer lever is the limiting
 * factor. Returns null if the product has no rating table, or if the
 * door is wider than every column in it (i.e. closer not rated for
 * a door this wide).
 *
 * @param {Object} product
 * @param {number} doorWidthMm
 * @returns {{ weight: number, atWidth: number } | null}
 */
export function getMaxWeight(product, doorWidthMm) {
  if (!product.maxWeightByWidth) return null
  const widths = Object.keys(product.maxWeightByWidth)
    .map(Number)
    .sort((a, b) => a - b)
  const match = widths.find(w => w >= doorWidthMm)
  if (match == null) return null
  return { weight: product.maxWeightByWidth[match], atWidth: match }
}

// ─── Evaluation: one (product, EN size) cell ─────────────────────

/**
 * Evaluate a single closer/size combination against the door scenario.
 *
 * @param {Object} inputs - door scenario (metres, kg, Nm, Pa)
 * @param {Object} product - closer product from closer-products.json
 * @param {number} enSize - EN size 1–6
 * @returns {Object} {
 *   state: 'within' | 'smaller' | 'unfit' | 'na',
 *   forceAtPusher: N (with overpressure),
 *   forceWithoutOverpressure: N,
 *   canClose: boolean,
 *   openingMoment, closingMoment, overpressureMoment,
 *   totalOpeningMoment, handleDistance
 * }
 */
export function evaluateCloser(inputs, product, enSize) {
  if (!product.enSizes?.includes(enSize)) {
    return { state: 'na' }
  }

  const openingMoment = getOpeningMoment(product, enSize)
  const closingMoment = getClosingMoment(product, enSize)
  const overpressureMoment = getOverpressureMoment(inputs)
  const handleDistance = getHandleDistance(inputs)

  // ─── Force at the pusher ─────────────────────────────────────
  // Empirically verified against published ECO Toolbox reference cases:
  //   hinge:    F = (M_open + M_friction + M_overpressure) / d_handle
  //   opposite: F = (M_open − M_friction − M_overpressure) / d_handle
  //
  // The opposite-side formula's friction sign isn't what naive physics
  // would predict (friction usually opposes motion regardless of who
  // drives it). But the published reference values can only be back-
  // solved with this signing — see _compare.mjs case-by-case fit.
  // Force WITHOUT overpressure always treats friction additively.
  const isOpposite = inputs.overpressureDirection === 'opposite'
  const sign = isOpposite ? -1 : 1

  const totalOpeningMoment = openingMoment + sign * (inputs.frictionTorque + overpressureMoment)
  const forceAtPusher = totalOpeningMoment / handleDistance
  const forceWithoutOverpressure = (openingMoment + inputs.frictionTorque) / handleDistance

  // ─── Can-close check ─────────────────────────────────────────
  // Closer's latching torque must beat friction + any overpressure
  // resisting closing. Hinge-side pressure HELPS closing (the door
  // wants to be closed); opposite-side pressure OPPOSES closing.
  const closingOpposition = isOpposite ? overpressureMoment : 0
  const canClose = closingMoment > (inputs.frictionTorque + closingOpposition)

  // ─── Matrix cell state — direction-aware ─────────────────────
  // The ECO Toolbox matrix asks different questions per direction:
  //   hinge:    "can opening force stay under 100 N?"
  //   opposite: "can this closer close against the overpressure?"
  // The matrix legend text changes correspondingly — see the
  // component's ResultPanel header & legend.
  const recommendedSize = getRecommendedSize(inputs.doorWidth * 1000)
  const passesPrimaryCheck = isOpposite
    ? canClose
    : (forceAtPusher <= MAX_OPENING_FORCE_N && forceAtPusher >= 0)

  let state
  if (!passesPrimaryCheck) {
    state = 'unfit'
  } else if (enSize < recommendedSize) {
    state = 'smaller'
  } else {
    state = 'within'
  }

  return {
    state,
    forceAtPusher,
    forceWithoutOverpressure,
    canClose,
    openingMoment,
    closingMoment,
    overpressureMoment,
    totalOpeningMoment,
    handleDistance,
  }
}

/**
 * Auto-pick a closer + size to display in the "Your selection" panel
 * before the user clicks anything in the matrix.
 *
 * Strategy: walk products in JSON order; for each, take the LARGEST
 * size in its range that is 'within' EN 1154 recommendation. Return
 * the first match. (Matches ECO Toolbox UX: prefer first product,
 * largest valid size in that product.)
 */
export function findBestRecommendation(inputs, products) {
  const recSize = getRecommendedSize(inputs.doorWidth * 1000)

  for (const product of products) {
    // Try largest size first, descending. Only consider sizes that
    // meet/exceed the EN 1154 recommendation (no "smaller" picks).
    const offered = [...product.enSizes].sort((a, b) => b - a)
    for (const enSize of offered) {
      if (enSize < recSize) continue
      const result = evaluateCloser(inputs, product, enSize)
      if (result.state === 'within') {
        return { product, enSize, evaluation: result }
      }
    }
  }
  return null
}

