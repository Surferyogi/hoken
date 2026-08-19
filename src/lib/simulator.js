// Claim payout simulator for an Integrated Shield Plan with an optional co-payment rider.
//
// HONESTY NOTE, shown to the user in the UI as well:
// This is a simplified model of the cost-sharing mechanics (policy year limit,
// deductible, co-insurance, rider co-payment and its annual cap). It deliberately does
// NOT model: benefit-specific sub-limits, pro-ration for non-standard wards, exclusions,
// pre-existing condition loadings, pre-authorisation outcomes, or claims spanning two
// policy years. Your policy contract governs. Use this to compare scenarios, not to
// predict a settlement figure.

export const WARD_OPTIONS = [
  { key: 'private_hospital', label: 'Private hospital (standard room)' },
  { key: 'ward_a', label: 'Restructured hospital, Ward A' },
  { key: 'ward_b1', label: 'Restructured hospital, Ward B1' },
  { key: 'ward_b2', label: 'Restructured hospital, Ward B2 / B2+' },
  { key: 'ward_c', label: 'Restructured hospital, Ward C' },
]

export const PROVIDER_OPTIONS = [
  { key: 'panel', label: 'Panel provider' },
  { key: 'pre_authorised', label: 'Non-panel but pre-authorised' },
  { key: 'non_panel', label: 'Non-panel, not pre-authorised' },
]

/**
 * @param {object} args
 * @param {number} args.billAmount            total hospital bill
 * @param {string} args.ward                  key from WARD_OPTIONS
 * @param {string} args.provider              key from PROVIDER_OPTIONS
 * @param {boolean} args.riderInForce
 * @param {number} args.deductibleUsed        deductible already paid this policy year
 * @param {number} args.coPaymentUsed         rider co-payment already paid this policy year
 * @param {object} args.main                  the IP main plan policy record
 * @param {object|null} args.rider            the rider policy record, or null
 * @param {number} args.ageNextBirthday
 */
export function simulate(args) {
  const {
    billAmount,
    ward,
    provider,
    riderInForce,
    deductibleUsed = 0,
    coPaymentUsed = 0,
    main,
    rider,
    ageNextBirthday,
  } = args

  const warnings = []
  const missing = []
  const fmt = (n) =>
    n === null || n === undefined
      ? 'Not available'
      : n.toLocaleString('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 })

  const limit = main?.benefits?.policyYearLimit
  const coinsPct = main?.benefits?.coInsurancePct
  const table =
    ageNextBirthday != null && ageNextBirthday > 80
      ? main?.benefits?.deductibleByWardOver80
      : main?.benefits?.deductibleByWard
  const deductibleFull = table ? table[ward] : undefined

  if (limit == null) missing.push('policy year claim limit')
  if (coinsPct == null) missing.push('co-insurance percentage')
  if (deductibleFull == null) missing.push(`deductible for ${ward}`)
  if (ageNextBirthday == null) missing.push('age next birthday (deductible band)')
  if (missing.length) {
    return { ok: false, missing, warnings }
  }

  const bill = Math.max(0, Number(billAmount) || 0)

  // Amount the policy can consider at all, capped by the policy year limit.
  const eligible = Math.min(bill, limit)
  const aboveLimit = bill - eligible
  if (aboveLimit > 0) {
    warnings.push(
      `The bill exceeds the policy year limit by ${fmt(aboveLimit)}. That excess is yours regardless of the rider.`
    )
  }

  // ---- Scenario A: main plan only (no rider) ----
  const deductibleRemaining = Math.max(0, deductibleFull - deductibleUsed)
  const deductibleApplied = Math.min(eligible, deductibleRemaining)
  const afterDeductible = eligible - deductibleApplied
  const coInsurance = afterDeductible * (coinsPct / 100)
  const noRider = {
    eligible,
    deductibleApplied,
    coInsurance,
    insurerPays: afterDeductible - coInsurance,
    aboveLimit,
    outOfPocket: deductibleApplied + coInsurance + aboveLimit,
  }

  // ---- Scenario B: with the co-payment rider ----
  let withRider = null
  if (rider) {
    const coPayPct = rider.benefits?.coPaymentPct
    const cap = rider.benefits?.coPaymentAnnualCapPanel
    const nonPanelCap = rider.benefits?.nonPanelAdditionalPaymentCap
    if (coPayPct == null) {
      missing.push('rider co-payment percentage')
    } else {
      const rawCoPay = eligible * (coPayPct / 100)
      const capApplies = provider === 'panel' || provider === 'pre_authorised'

      let coPayment
      if (capApplies && cap != null) {
        const capRemaining = Math.max(0, cap - coPaymentUsed)
        coPayment = Math.min(rawCoPay, capRemaining)
        if (rawCoPay > capRemaining) {
          warnings.push(
            `The ${coPayPct}% co-payment of ${fmt(rawCoPay)} is capped at the remaining ${fmt(capRemaining)} of the ${fmt(cap)} annual limit.`
          )
        }
      } else {
        coPayment = rawCoPay
        warnings.push(
          `Non-panel treatment: the annual co-payment cap does not apply, so the full ${coPayPct}% co-payment stands.`
        )
      }

      let nonPanelPayment = 0
      if (provider === 'non_panel' && nonPanelCap != null) {
        nonPanelPayment = Math.min(nonPanelCap, eligible)
        warnings.push(
          `Modelled with the full non-panel additional payment of ${fmt(nonPanelCap)}. The policy wording says "up to" this amount - your actual figure may be lower.`
        )
      }
      if (provider === 'pre_authorised') {
        warnings.push(
          'Pre-authorised non-panel treatment is modelled as attracting the capped co-payment. Confirm this against your policy wording and Income\'s pre-authorisation outcome before relying on it.'
        )
      }

      withRider = {
        eligible,
        deductibleApplied: 0,
        coInsurance: 0,
        coPayment,
        nonPanelPayment,
        insurerPays: eligible - coPayment - nonPanelPayment,
        aboveLimit,
        outOfPocket: coPayment + nonPanelPayment + aboveLimit,
      }
    }
  }

  const active = riderInForce && withRider ? withRider : noRider
  const saving = withRider ? noRider.outOfPocket - withRider.outOfPocket : null

  return {
    ok: true,
    bill,
    limit,
    coinsPct,
    deductibleFull,
    noRider,
    withRider,
    active,
    saving,
    warnings,
    missing,
  }
}
