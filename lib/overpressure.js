// ─────────────────────────────────────────────────────────────────
// Overpressure calculation logic — EN 1154
// ─────────────────────────────────────────────────────────────────
// This module contains the engineering formulas for calculating
// the force required to operate a door under pressure differential,
// and recommending an appropriate door closer.
//
// References:
//   • EN 1154:1996+A1:2002 — Building hardware: Controlled door closing devices
//   • ECO Schulte ECO Toolbox overpressure calculator
//     https://www.eco-schulte.com/en/eco-toolbox/overpressure-calculator
//
// All inputs in SI units (mm, Pa, N) unless otherwise noted.
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate the operating force at the door handle required to open
 * a door against a given pressure difference.
 *
 * Simplified physics:
 *   F_pressure = ΔP × A     (force on the door leaf)
 *   F_handle ≈ F_pressure × (leverArm / handleDistance)
 *
 * TODO (Peace):
 *   1. Refine the lever-arm calculation — current version assumes
 *      handle at standard 60mm from edge. Real implementation
 *      should account for hinge-to-handle distance properly.
 *   2. Add seal friction component (EN 1154 includes a seal-resistance
 *      term — typically 5–15 N depending on seal type).
 *   3. Add closer-resistance component (the force needed to overcome
 *      the closer spring during opening).
 *   4. Validate against ECO Schulte's published reference values
 *      from their ECO Toolbox calculator.
 *
 * @param {Object} inputs
 * @param {number} inputs.doorWidth - mm
 * @param {number} inputs.doorHeight - mm
 * @param {number} inputs.pressureDifference - Pa
 * @param {string} inputs.doorType - 'singleLeaf' | 'doubleLeaf'
 * @returns {number} Operating force in Newtons (rounded)
 */
export function calculateOperatingForce({ doorWidth, doorHeight, pressureDifference, doorType }) {
  // Area in m² (convert from mm²)
  const areaM2 = (doorWidth * doorHeight) / 1_000_000

  // For double-leaf, only the active leaf carries handle force
  // (the inactive leaf is held by flush bolts and contributes via seal friction only)
  const effectiveArea = doorType === 'doubleLeaf' ? areaM2 / 2 : areaM2

  // Force on the door from pressure differential (N)
  const pressureForce = effectiveArea * pressureDifference

  // Lever arm ratio: distance from hinge to centre of pressure ÷ distance from hinge to handle
  // For a standard door (handle ~60mm from outer edge), this is approximately:
  //   leverRatio = (width/2) / (width - 60)
  const handleOffsetFromEdge = 60 // mm
  const leverRatio = (doorWidth / 2) / (doorWidth - handleOffsetFromEdge)

  const handleForce = pressureForce * leverRatio

  // TODO: add seal friction (typically 5–15 N) and closer spring force (varies by EN size)

  return Math.round(handleForce)
}

/**
 * Recommend a door closer size per EN 1154.
 *
 * EN 1154 closer size mapping (leaf width → closer size):
 *   EN 1: up to 750mm
 *   EN 2: up to 850mm
 *   EN 3: up to 950mm
 *   EN 4: up to 1100mm
 *   EN 5: up to 1250mm
 *   EN 6: up to 1400mm
 *   EN 7: up to 1600mm
 *
 * TODO (Peace):
 *   1. The size should account for BOTH leaf width AND the operating
 *      force — heavier doors / higher pressure may need a stronger closer
 *      even on narrower leaves.
 *   2. Cross-check the size table against ECO Schulte's recommendations
 *      once Moritz provides the data export.
 *
 * @param {number} operatingForce - N
 * @param {number} doorWidth - mm
 * @returns {number} EN closer size (1–7)
 */
export function recommendCloserSize(operatingForce, doorWidth) {
  // Width-based base recommendation
  let sizeByWidth
  if (doorWidth <= 750)       sizeByWidth = 1
  else if (doorWidth <= 850)  sizeByWidth = 2
  else if (doorWidth <= 950)  sizeByWidth = 3
  else if (doorWidth <= 1100) sizeByWidth = 4
  else if (doorWidth <= 1250) sizeByWidth = 5
  else if (doorWidth <= 1400) sizeByWidth = 6
  else                        sizeByWidth = 7

  // TODO: factor in operatingForce — high-force scenarios may need
  // upsizing by one or two EN sizes
  return sizeByWidth
}

/**
 * Match the recommended EN size to a specific ECO Schulte closer product.
 *
 * TODO (Peace):
 *   1. Wire up to data/closer-products.json once Moritz sends the export.
 *   2. Filter by application: fire door? accessible? overhead vs concealed?
 *   3. Return alternatives, not just one model — give the user a choice.
 *
 * @param {number} enSize - EN 1–7
 * @param {Object} inputs - full inputs object (to filter by door type, grade, etc)
 * @param {Array}  products - closer products from data/closer-products.json
 * @returns {Object|null} closer product or null if no match
 */
export function recommendCloserModel(enSize, inputs, products) {
  if (!products || products.length === 0) return null

  // Find a closer that supports this EN size
  const match = products.find(p =>
    Array.isArray(p.enSizes) && p.enSizes.includes(enSize)
  )

  return match || null
}