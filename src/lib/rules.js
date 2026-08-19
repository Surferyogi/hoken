// Singapore rule pack.
//
// Design contract for this file:
//  - A rule may only assert a number that (a) came off a supplied document, or
//    (b) is quoted from a cited official source in data/sources.js, or
//    (c) is arithmetic performed on (a) and (b), with the arithmetic shown.
//  - If a rule needs an input that is null, it does NOT guess. It emits a
//    'needs-input' finding naming exactly what is missing.

import { SOURCES } from '../data/sources.js'

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

const money = (n) =>
  n === null || n === undefined
    ? 'Not available'
    : n.toLocaleString('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 })

function daysBetween(aIso, bIso) {
  const a = new Date(`${aIso}T00:00:00+08:00`)
  const b = new Date(`${bIso}T00:00:00+08:00`)
  return Math.round((b - a) / 86400000)
}

/** CPF Additional Withdrawal Limit for the private-insurance component of an IP,
 *  by age next birthday. Figures quoted from CPF Board. */
export function awlForAge(ageNextBirthday) {
  if (ageNextBirthday === null || ageNextBirthday === undefined) return null
  if (ageNextBirthday <= 40) return 300
  if (ageNextBirthday <= 70) return 600
  return 900
}

function finding(o) {
  return {
    confidence: 'verified',
    sources: [],
    ...o,
  }
}

export function runRules(state, todayIso) {
  const { profile, policies, geCashBenefit } = state
  const out = []

  const byId = Object.fromEntries(policies.map((p) => [p.id, p]))
  const ipMains = policies.filter((p) => p.kind === 'ip_main')
  const ipRiders = policies.filter((p) => p.kind === 'ip_rider')
  const unidentified = policies.filter((p) => p.kind === 'unidentified')

  // ---------------------------------------------------------------- ATTENTION
  // A1 - unpaid premium past the due date
  for (const p of policies) {
    if (!p.billing || !p.billing.dueDate) continue
    if (p.billing.paidOn) continue
    const overdue = daysBetween(p.billing.dueDate, todayIso)
    if (overdue > 0) {
      out.push(
        finding({
          id: `A1-${p.id}`,
          type: 'attention',
          severity: 'critical',
          title: 'Premium is past its due date and payment is unconfirmed',
          body: `${p.insurer} issued a reminder dated ${p.billing.noticeDate} after ${p.billing.failedGiroAttempts} unsuccessful GIRO deductions. ${money(p.billing.amountDue)} was due on ${p.billing.dueDate}. That is ${overdue} days ago as at ${todayIso}. No document in this app records a payment, so the status is UNKNOWN - not "unpaid".`,
          impact:
            'The reminder states the policy will end if full payment is not made by the premium due date. If the plan lapses, the private-hospital cover and the rider both stop. MediShield Life cover continues for life regardless, but a lapsed Integrated Shield Plan generally has to be re-underwritten, and any condition that developed in the meantime can be excluded.',
          action: `Confirm with ${p.insurer} whether ${money(p.billing.amountDue)} against bill reference ${p.billingReference || p.billReference} has been received. If not, pay it now and fix the GIRO account. Then record the payment date in this app so this alert clears.`,
          needsInput: 'Payment date (or confirmation that the bill is settled)',
          sources: ['DOC_INCOME_GIRO_NOTICE', 'MOH_IP_MSL_RELEVANCE'],
          policyIds: [p.id],
        })
      )
    }
  }

  // --------------------------------------------------------------------- COST
  // C1 - MediSave is not being used at all
  for (const p of ipMains) {
    const anb = p.ageNextBirthday ?? profile.ageNextBirthday
    const awl = awlForAge(anb)
    const msl = p.premium?.medishieldLifePortion
    const priv = p.premium?.privateInsurancePortion
    if (msl == null || priv == null || awl == null) continue

    const privFromMedisave = Math.min(priv, awl)
    const eligible = msl + privFromMedisave
    const currentlyFromMedisave = p.premium.paidFromMedisave ?? 0
    const shortfall = eligible - currentlyFromMedisave

    const rider = ipRiders.find((r) => r.attachedTo === p.id)
    const riderPremium = rider?.premium?.total ?? 0

    if (shortfall > 0) {
      out.push(
        finding({
          id: `C1-${p.id}`,
          type: 'cost',
          severity: 'high',
          title: 'Whole premium is being paid in cash when part of it is MediSave-payable',
          body: [
            `The bill records payment mode "${p.paymentMode}" with ${money(p.premium.total)} payable by cash.`,
            `MediShield Life portion ${money(msl)} - fully payable by MediSave.`,
            `Private insurance portion ${money(priv)} - payable by MediSave up to the Additional Withdrawal Limit of ${money(awl)} for age next birthday ${anb} (band 41-70), so ${money(privFromMedisave)} of it.`,
            `Rider portion ${money(riderPremium)} - cash only. MOH: "Rider premiums are only payable in cash as they are not part of IPs or MediShield Life."`,
            `Arithmetic: ${money(msl)} + ${money(privFromMedisave)} = ${money(eligible)} could come from MediSave; ${money(p.premium.total - eligible)} would still be cash.`,
          ].join('\n'),
          impact: `Up to ${money(shortfall)} a year of cash outlay could be shifted to MediSave, subject to your MediSave balance. This is a cash-flow saving, not a reduction in what the cover costs.`,
          action:
            'Ask Income to switch the MediShield Life and eligible private-portion premium to MediSave deduction, and keep GIRO or card only for the rider. Confirm your MediSave balance can cover it before switching - a failed MediSave deduction creates the same lapse risk as the failed GIRO.',
          needsInput: profile.medisaveBalance == null ? 'Current MediSave balance' : null,
          sources: ['DOC_INCOME_PREMIUM_BREAKDOWN', 'CPF_AWL', 'MOH_IP_ABOUT', 'MOH_RIDER_CASH_ONLY'],
          policyIds: [p.id, rider?.id].filter(Boolean),
          numbers: { msl, priv, awl, privFromMedisave, eligible, shortfall, riderPremium },
        })
      )
    }
  }

  // C2 - what the rider buys, stated as arithmetic rather than opinion
  for (const rider of ipRiders) {
    const main = byId[rider.attachedTo]
    if (!main) continue
    const ded = main.benefits?.deductiblePrivateHospital
    const coins = main.benefits?.coInsurancePct
    const cap = rider.benefits?.coPaymentAnnualCapPanel
    const riderPrem = rider.premium?.total
    if (ded == null || coins == null || cap == null || riderPrem == null) continue

    // Panel treatment, single claim, nothing else used this policy year.
    //   without rider: OOP = min(bill, ded) + coins% x max(0, bill - ded)
    //   with rider:    OOP = min(coins% x bill, cap)
    // The saving is piecewise and monotonic non-decreasing in the bill:
    const c = coins / 100
    const oopWithout = (b) => Math.min(b, ded) + c * Math.max(0, b - ded)
    const oopWith = (b) => Math.min(c * b, cap)
    const saving = (b) => oopWithout(b) - oopWith(b)

    // Break-even: the smallest bill at which the saving covers the rider premium.
    // Bisected rather than solved in closed form, because the function has three segments.
    const ceiling = main.benefits?.policyYearLimit ?? 1000000
    let breakEvenBill = Infinity
    if (saving(ceiling) >= riderPrem) {
      let lo = 0
      let hi = ceiling
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2
        if (saving(mid) >= riderPrem) hi = mid
        else lo = mid
      }
      breakEvenBill = hi
    }

    // Between the deductible and the bill at which the co-payment hits its cap,
    // the saving is flat at (deductible x (1 - co-insurance)).
    const capThreshold = cap / c
    const plateauSaving = ded * (1 - c)

    out.push(
      finding({
        id: `C2-${rider.id}`,
        type: 'cost',
        severity: 'info',
        title: 'What the rider premium buys, in numbers',
        body: [
          `Rider premium ${money(riderPrem)} a year.`,
          `Without the rider, a private-hospital claim costs you the ${money(ded)} deductible plus ${coins}% co-insurance on the rest.`,
          `With the rider in force there is no deductible and no co-insurance; you pay a ${rider.benefits.coPaymentPct}% co-payment capped at ${money(cap)} a policy year for panel treatment, plus up to ${money(rider.benefits.nonPanelAdditionalPaymentCap)} more a year if you go outside the panel.`,
          Number.isFinite(breakEvenBill)
            ? `Break-even, panel treatment, one claim, nothing else claimed that year: a bill of about ${money(Math.round(breakEvenBill))}. Any claim larger than that and the rider has paid for itself in that year alone.`
            : 'On these figures the rider never pays for itself within a single policy year.',
          `Between ${money(ded)} and ${money(capThreshold)} of bill the saving is flat at ${money(plateauSaving)} - that is the deductible less the co-insurance you would have paid on it. Above ${money(capThreshold)} the ${coins}% co-payment hits its ${money(cap)} cap, and every further dollar of bill adds another ${money(c)} to the saving.`,
        ].join('\n'),
        impact:
          'This is a single-year, single-claim comparison. It deliberately ignores the value of a hard cap on a catastrophic year, and the fact that this rider cannot be bought back once dropped - both are judgement calls, not arithmetic.',
        action:
          'Treat the break-even figure as one input, not the decision. The stronger consideration is the withdrawal issue flagged separately.',
        sources: ['INCOME_EIS_CONDITIONS', 'INCOME_CARE_RIDER', 'DOC_INCOME_PREMIUM_BREAKDOWN'],
        policyIds: [rider.id, main.id],
        numbers: { riderPrem, ded, coins, cap, breakEvenBill, capThreshold, plateauSaving },
      })
    )
  }

  // ------------------------------------------------------------- DUPLICATION
  // D1 - more than one Integrated Shield main plan
  if (ipMains.length > 1) {
    out.push(
      finding({
        id: 'D1',
        type: 'duplication',
        severity: 'critical',
        title: 'More than one Integrated Shield main plan is recorded',
        body: `${ipMains.length} main IP plans are on file: ${ipMains.map((p) => `${p.insurer} ${p.product}`).join('; ')}.`,
        impact:
          'An Integrated Shield Plan already contains MediShield Life. Holding two main plans means paying twice for overlapping cover.',
        action: 'Confirm with both insurers which plan is actually in force and terminate the redundant one.',
        sources: ['MOH_IP_ABOUT', 'HEALTHHUB_IP'],
        policyIds: ipMains.map((p) => p.id),
      })
    )
  }

  // D2 - an unidentified hospitalisation record that may or may not be a second plan
  for (const u of unidentified) {
    if (u.category !== 'hospitalisation') continue
    const main = ipMains[0]
    const rider = ipRiders[0]
    const matches = []
    if (main && u.benefits?.hospitalType === 'Private Hospital') matches.push('private hospital cover')
    if (main && u.benefits?.roomEntitlement && main.benefits?.dailyWardAndTreatment === 'As charged')
      matches.push('as-charged daily ward and treatment charges')
    if (rider && u.benefits?.panelCoPaymentPct === rider.benefits?.coPaymentPct)
      matches.push(`${rider.benefits.coPaymentPct}% panel co-payment`)
    if (rider && u.benefits?.panelCoPaymentAnnualCap === rider.benefits?.coPaymentAnnualCapPanel)
      matches.push(`${money(rider.benefits.coPaymentAnnualCapPanel)} annual co-payment cap`)
    if (main && u.coverStarted && main.periodFrom && u.coverStarted === main.periodFrom)
      matches.push(`same policy anniversary (${main.periodFrom})`)

    out.push(
      finding({
        id: `D2-${u.id}`,
        type: 'duplication',
        severity: 'high',
        confidence: 'needs-confirmation',
        title: 'Unidentified hospitalisation record - same plan, or a second one?',
        body: [
          `A "${u.product}" screen is on file with policy entry date ${u.inceptionDate} and cover started ${u.coverStarted}. The screen does not name the issuing company.`,
          matches.length
            ? `It matches the Income plan on ${matches.length} points: ${matches.join(', ')}.`
            : 'No matching benefit terms could be compared.',
          'That pattern is consistent with the SAME Income policy shown inside a different app. It is not proof.',
        ].join('\n'),
        impact:
          'If it is the same policy, nothing is wrong. If it is a genuinely separate plan, you may be paying twice for overlapping hospitalisation cover, and the second plan would need to be reconciled.',
        action: `Open the app the screenshot came from and check the issuing company and policy number. If it shows ${byId['income-eis-preferred']?.policyNumber || 'the Income policy number'}, mark this record as merged. ${u.servicingAgent ? `The servicing agent shown is ${u.servicingAgent} - worth asking directly.` : ''}`,
        needsInput: 'Issuing company and policy number on the screenshot',
        sources: ['DOC_HOSPITALISATION_SCREEN', 'DOC_INCOME_PREMIUM_BREAKDOWN', 'INCOME_CARE_RIDER'],
        policyIds: [u.id, ipMains[0]?.id].filter(Boolean),
      })
    )
  }

  // D3 - MediShield Life is not separate cover
  if (ipMains.length === 1) {
    out.push(
      finding({
        id: 'D3',
        type: 'duplication',
        severity: 'info',
        title: 'MediShield Life is inside the plan, not alongside it',
        body: `The ${money(ipMains[0].premium?.medishieldLifePortion)} line on the bill is the MediShield Life component of the Integrated Shield Plan, collected by ${ipMains[0].insurer}. MOH: "If you have an IP, you already have MediShield Life, as MediShield Life is a component of your IP."`,
        impact:
          'Do not count MediShield Life as a second layer of cover when assessing adequacy - it is already inside the claim you make on the IP.',
        action:
          'If the Integrated Shield Plan is ever terminated, MediShield Life continues for life and still covers pre-existing conditions.',
        sources: ['MOH_IP_MSL_RELEVANCE', 'HEALTHHUB_IP', 'DOC_INCOME_PREMIUM_BREAKDOWN'],
        policyIds: [ipMains[0].id],
      })
    )
  }

  // ---------------------------------------------------- REGULATORY ATTENTION
  // R1 - rider withdrawn from new sales
  for (const rider of ipRiders) {
    out.push(
      finding({
        id: `R1-${rider.id}`,
        type: 'attention',
        severity: 'high',
        title: 'The rider you hold is closed to new sales - dropping it is one-way',
        body: [
          `Income withdrew the Classic Care Rider (along with Deluxe Care, Plus and Assist) from new sales from 1 April 2026. Existing policyholders keep their cover.`,
          `The riders now sold are Optima Care and Essential Care, with a co-payment limit of up to ${money(6000)} each policy year for panel and extended-panel treatment - double the ${money(rider.benefits.coPaymentAnnualCapPanel)} cap on your existing rider.`,
        ].join('\n'),
        impact: `If the policy lapses for non-payment or the rider is cancelled, the ${money(rider.benefits.coPaymentAnnualCapPanel)} annual cap cannot be bought back. The replacement on sale today caps your annual out-of-pocket at ${money(6000)} instead.`,
        action:
          'Treat this as a reason to keep the premium current rather than let it lapse by accident. Confirm the withdrawal and its effect on your specific policy with Income in writing.',
        sources: ['INCOME_EIS_PRODUCT_PAGE', 'MOH_RIDER_RULES_2026'],
        policyIds: [rider.id],
      })
    )
  }

  // R2 - MOH rider rule change and where this policy sits
  for (const rider of ipRiders) {
    const main = byId[rider.attachedTo]
    const entry = main?.inceptionDate || byId['hospitalisation-screen']?.inceptionDate || null
    out.push(
      finding({
        id: `R2-${rider.id}`,
        type: 'attention',
        severity: 'medium',
        confidence: entry ? 'verified' : 'needs-confirmation',
        title: 'MOH rider rules changed on 1 April 2026 - check which side of the line you are on',
        body: [
          'From 1 April 2026: new IP riders may no longer cover the minimum IP deductibles; the minimum co-payment stays at 5%; and the minimum annual co-payment cap rises to $6,000 (it had been $3,000 since 2018).',
          'MOH states riders bought before 27 November 2025 are not affected initially. Non-compliant riders bought from 27 November 2025 onwards transition to compliant riders no later than the next policy renewal after 1 April 2028.',
          entry
            ? `The earliest policy entry date on file is ${entry}, which is before 27 November 2025.`
            : 'No confirmed policy entry date is on file for the rider, so which side of 27 November 2025 it falls on cannot be determined from the documents supplied.',
        ].join('\n'),
        impact:
          'MOH\'s wording is "not affected initially". It does not state that pre-27 November 2025 riders are permanently exempt. Assume this may change and plan for it.',
        action:
          'Ask Income in writing: does my Classic Care Rider remain on its current terms indefinitely, and if it is ever migrated, to what and when?',
        needsInput: entry ? null : 'Rider inception date from the policy schedule',
        sources: ['MOH_RIDER_RULES_2026', 'DOC_HOSPITALISATION_SCREEN'],
        policyIds: [rider.id],
      })
    )
  }

  // R3 - exposure if the rider goes away
  for (const main of ipMains) {
    const rider = ipRiders.find((r) => r.attachedTo === main.id)
    if (!rider) continue
    const ded = main.benefits?.deductiblePrivateHospital
    const coins = main.benefits?.coInsurancePct
    if (ded == null || coins == null) continue
    out.push(
      finding({
        id: `R3-${main.id}`,
        type: 'attention',
        severity: 'medium',
        title: 'Your exposure changes sharply if the rider stops',
        body: `With the rider in force: no deductible, no co-insurance, out-of-pocket capped at ${money(rider.benefits.coPaymentAnnualCapPanel)} a policy year for panel treatment. Without it: ${money(ded)} deductible plus ${coins}% co-insurance on everything above it, with no cap.`,
        impact: `On a ${money(200000)} private-hospital bill the difference is ${money(rider.benefits.coPaymentAnnualCapPanel)} versus ${money(ded + (200000 - ded) * (coins / 100))}. Use the Simulator tab to test your own figures.`,
        action:
          'Keep a cash buffer that would cover the no-rider out-of-pocket on a realistic worst-case bill, in case the rider is ever unavailable.',
        sources: ['INCOME_EIS_CONDITIONS', 'INCOME_CARE_RIDER'],
        policyIds: [main.id, rider.id],
      })
    )
  }

  // --------------------------------------------------------------- SUB-LIMITS
  for (const main of ipMains) {
    const b = main.benefits || {}
    if (b.inpatientPsychiatricLimit == null && b.protonBeamTherapyLimit == null) continue
    out.push(
      finding({
        id: `S1-${main.id}`,
        type: 'gap',
        severity: 'low',
        title: 'As-charged cover still has hard sub-limits',
        body: [
          `The plan is "as charged" on daily ward and treatment charges up to a policy year limit of ${money(b.policyYearLimit)}, but specific treatments are capped:`,
          b.inpatientPsychiatricLimit != null ? `Inpatient psychiatric treatment: as charged up to ${money(b.inpatientPsychiatricLimit)} a policy year.` : null,
          b.protonBeamTherapyLimit != null ? `Proton beam therapy: as charged up to ${money(b.protonBeamTherapyLimit)}.` : null,
          'Cancer drug treatment: 5x the MediShield Life limit for one primary cancer.',
        ]
          .filter(Boolean)
          .join('\n'),
        impact:
          'These are the places where "as charged" stops being as charged. A prolonged psychiatric admission or a proton course can exceed the sub-limit while the overall policy year limit is nowhere near exhausted.',
        action:
          'Read the Schedule of Benefits in your own policy contract rather than the marketing page, and confirm these figures apply to your version of the plan.',
        sources: ['INCOME_EIS_CONDITIONS'],
        policyIds: [main.id],
      })
    )
  }

  // ---------------------------------------------------------- GREAT EASTERN
  const ge = policies.find((p) => p.insurer && p.insurer.includes('Great Eastern'))

  // G1 - what is actually payable on death is the open question on this policy
  if (ge && ge.benefits?.sumAssured != null && ge.premium?.total != null) {
    const sa = ge.benefits.sumAssured
    const sp = ge.premium.total
    const saPctOfPremium = (sa / sp) * 100
    out.push(
      finding({
        id: 'G1',
        type: 'gap',
        severity: 'critical',
        confidence: 'needs-confirmation',
        title: 'The death benefit on the Great Eastern policy is unresolved, and the gap between the two readings is enormous',
        body: [
          `The Great Eastern app shows this policy with a sum assured of ${money(sa)} against a single premium of ${money(sp)}. That is ${saPctOfPremium.toFixed(2)}% of the capital you put in.`,
          'The Protection tab wording is: "Beneficiaries will receive the coverage amount upon the death of the policyholder", with the coverage amount shown as the sum assured.',
          `Read literally, that means your beneficiaries receive ${money(sa)} and the ${money(ge.benefits.netSurrenderValue)} of policy value does not pass to them - which would be a strange way to build a single-premium whole-life plan.`,
          'For the current version of this product family (PremierLife Generation V), OCBC and Great Eastern state the death payout is "105% of the single premium and non-guaranteed terminal bonus, less any debt". Your policy is Generation II, taken out in 2019, and may be structured differently.',
          'No document you have supplied resolves which reading applies to Generation II. This app therefore records the total death benefit as Not available rather than picking one.',
        ].join('\n'),
        impact: `The two readings differ by roughly ${money(sp - sa)} of estate value. Nothing else in this assessment matters as much as settling which one is right - it changes whether you hold meaningful life cover or almost none.`,
        action:
          'Ask Great Eastern, in writing, one precise question: "On the death of the life assured under policy 0211567996, what is the total amount payable to my beneficiaries - is it the sum assured of $5,408 only, or the sum assured plus the accumulated / surrender / terminal bonus value?" Ask them to point you to the clause in the policy contract. Then enter the answer here.',
        needsInput: 'Total death benefit payable, confirmed against the policy contract',
        sources: ['DOC_GE_APP_PROTECTION', 'DOC_GE_APP_OVERVIEW', 'OCBC_PLG_V'],
        policyIds: [ge.id],
        numbers: { sa, sp, saPctOfPremium },
      })
    )
  }

  // G2 - capital position and the payout rate, as arithmetic
  if (ge && ge.premium?.total != null && ge.benefits?.netSurrenderValue != null) {
    const sp = ge.premium.total
    const sv = ge.benefits.netSurrenderValue
    const cb = ge.benefits.monthlyCashBonus
    const sb = ge.benefits.monthlySurvivalBenefit
    const monthly = (cb ?? 0) + (sb ?? 0)
    const annual = monthly * 12
    const yieldPct = (annual / sp) * 100
    const svPct = (sv / sp) * 100
    const heldYears = ge.inceptionDate ? daysBetween(ge.inceptionDate, todayIso) / 365.25 : null

    out.push(
      finding({
        id: 'G2',
        type: 'cost',
        severity: 'medium',
        confidence: 'needs-confirmation',
        title: 'Where the Great Eastern capital stands, in arithmetic',
        body: [
          `Single premium paid ${money(sp)} in cash on ${ge.inceptionDate}${heldYears ? ` - about ${heldYears.toFixed(1)} years ago` : ''}.`,
          `Net surrender value today ${money(sv)}, which is ${svPct.toFixed(2)}% of the single premium, i.e. ${money(sv - sp)} against what you put in. Great Eastern marks this figure "projected and not guaranteed".`,
          cb != null && sb != null
            ? `Monthly payouts: ${money(cb)} cash bonus + ${money(sb)} survival benefit = ${money(monthly)}, paid out by ${ge.benefits.payoutMethod}. Annualised: ${money(monthly)} x 12 = ${money(annual)}, which is ${yieldPct.toFixed(2)}% of the single premium each year.`
            : null,
          `Net available loan value ${money(ge.benefits.netAvailableLoanValue)} - this is what you could borrow against the policy, not money owed.`,
          'The surrender value being below the premium paid is NOT by itself a loss: you have been receiving monthly payouts, and the death benefit question above is unresolved. A like-for-like total-return figure cannot be produced until the payout start date and the death benefit basis are known.',
        ]
          .filter(Boolean)
          .join('\n'),
        impact:
          'This is the arithmetic, not a verdict. Whether the policy is performing acceptably depends on the terminal bonus, the death benefit basis, and how long the payouts have been running - none of which are on the documents supplied.',
        action:
          'Ask Great Eastern for the latest policy illustration showing guaranteed and non-guaranteed values, and for the date the payout period began. Enter the payout start date here and this app can total what you have actually received.',
        needsInput:
          ge.benefits.payoutPeriodStart == null
            ? 'Date the payout period began (needed to total payouts received to date)'
            : null,
        sources: ['DOC_GE_APP_OVERVIEW', 'DOC_GE_CASH_BENEFIT'],
        policyIds: [ge.id],
        numbers: { sp, sv, svPct, monthly, annual, yieldPct, heldYears },
      })
    )
  }

  // G3 - the cash benefit ledger reconciles; no evidence of a policy loan
  if (geCashBenefit && geCashBenefit.transactions?.length) {
    const txns = geCashBenefit.transactions
    const net = txns.reduce((s, t) => s + t.amount, 0)
    const opening = geCashBenefit.opening ?? geCashBenefit.balanceCF - net
    const closingComputed = opening + net
    const reconciles = Math.abs(closingComputed - geCashBenefit.balanceCF) < 0.005

    const sum = (d) => txns.filter((t) => t.description === d).reduce((s, t) => s + t.amount, 0)
    const cbWithdrawn = sum('Cash Bonus Withdrawal')
    const cbAllocated = sum('Cash Bonus Allocated')
    const cbInterest = sum('Cash Bonus Interest')
    const sbAllocated = sum('Survival Benefit Allocated')
    const sbWithdrawn = sum('Survival Benefit Withdrawal')

    out.push(
      finding({
        id: 'G3',
        type: 'attention',
        severity: reconciles ? 'info' : 'high',
        title: reconciles
          ? 'The Great Eastern cash benefit account reconciles exactly - no sign of a policy loan'
          : 'The Great Eastern cash benefit ledger does not reconcile',
        body: [
          `Opening Balance B/F ${money(opening)} at 31/05/2025.`,
          `Cash bonus allocated ${money(cbAllocated)}; cash bonus withdrawn ${money(cbWithdrawn)}; cash bonus interest ${money(cbInterest)}.`,
          `Survival benefit allocated ${money(sbAllocated)} and withdrawn ${money(sbWithdrawn)} - that pair nets to ${money(sbAllocated + sbWithdrawn)}.`,
          `Net movement ${money(net)}. ${money(opening)} + ${money(net)} = ${money(closingComputed)}, against the printed Balance C/F of ${money(geCashBenefit.balanceCF)}. ${reconciles ? 'It matches to the cent.' : 'It does NOT match - check the transcription against your statement.'}`,
          cbAllocated && cbWithdrawn
            ? `The annual allocation of ${money(cbAllocated)} exactly equals the twelve monthly withdrawals of ${money(Math.abs(cbWithdrawn) / 12)}. The account funds its own payouts and the only thing left behind is the ${money(cbInterest)} of interest.`
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
        impact:
          'This closes the earlier concern. The statement\'s note about the Cash Benefit being used automatically if the total outstanding exceeds the surrender value is standard boilerplate; on these numbers nothing is being consumed to service a debt, and no outstanding loan appears on any document supplied.',
        action:
          'No action needed on this point. Still worth confirming with Great Eastern that there is no policy loan outstanding, since the app shows a loan VALUE (what you could borrow) rather than a loan BALANCE.',
        sources: ['DOC_GE_CASH_BENEFIT', 'DOC_GE_APP_OVERVIEW'],
        policyIds: [ge?.id].filter(Boolean),
        numbers: { opening, net, closingComputed, cbAllocated, cbWithdrawn, cbInterest, reconciles },
      })
    )
  }

  // G4 - $400k of capital, no riders, and the protection question
  if (ge && ge.premium?.total != null && ge.riderCount === 0) {
    out.push(
      finding({
        id: 'G4',
        type: 'gap',
        severity: 'high',
        title: 'Your largest policy by far is a savings plan carrying no protection riders',
        body: [
          `${money(ge.premium.total)} of capital sits in ${ge.product}, which the app records with ${ge.riderCount} riders.`,
          'There is no critical illness, total and permanent disability, or disability income cover attached to it, and no separate policy for any of those has been loaded here.',
          'Compare the scale: the annual premium across every protection policy on file is a fraction of one year of the payouts this policy generates.',
        ].join('\n'),
        impact:
          'A critical illness diagnosis is the scenario this portfolio is least equipped for. Hospital bills are well covered by the Integrated Shield Plan, but an Integrated Shield Plan pays hospitals, not you - it does not replace income during treatment or recovery, and it pays nothing for a condition treated outside hospital.',
        action:
          'Two separate questions worth putting to a licensed adviser: whether the income you would lose during a serious illness is covered from your own resources, and whether any part of the capital in this policy is better deployed. Both depend on figures not in this app - your income, your dependants and your other assets.',
        needsInput: 'Annual income, dependants, and total assets outside insurance',
        sources: ['DOC_GE_APP_OVERVIEW', 'DOC_GE_APP_PROTECTION'],
        policyIds: [ge.id],
      })
    )
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

/** Coverage gap scan. Reports "no document on file", never "you have no cover". */
export function runGapScan(state, categories) {
  const inCategory = (p, key) => p.category === key || (p.secondaryCategories || []).includes(key)

  return categories.map((cat) => {
    const held = state.policies.filter(
      (p) => inCategory(p, cat.key) && p.kind !== 'unidentified' && p.status !== 'lapsed'
    )
    const unconfirmed = state.policies.filter((p) => inCategory(p, cat.key) && p.kind === 'unidentified')
    const quantified = held.filter((p) => {
      const b = p.benefits || {}
      return b.policyYearLimit != null || b.sumAssured != null || b.coPaymentAnnualCapPanel != null
    })

    let statusKey = 'no_document'
    if (held.length && quantified.length) statusKey = 'documented'
    else if (held.length) statusKey = 'present_unquantified'

    // Total nominal cover, but only for categories where a sum assured is the right
    // measure of adequacy. For a savings plan the meaningful figure is the surrender
    // value, not the sum assured, so it is not shown here.
    const SUM_ASSURED_CATEGORIES = new Set(['life', 'critical_illness', 'personal_accident'])
    const quantum = SUM_ASSURED_CATEGORIES.has(cat.key)
      ? held.reduce((s, p) => s + (p.benefits?.sumAssured ?? 0), 0) || null
      : null

    // A category is "disputed" when a policy sits in it but the amount actually
    // payable is unresolved - worse than unquantified, because a figure IS shown
    // and it may be badly misleading.
    const disputed = held.some(
      (p) => p.benefits?.sumAssured != null && p.benefits?.deathBenefitTotal === null && cat.key === 'life'
    )
    if (disputed) statusKey = 'disputed'

    return {
      ...cat,
      statusKey,
      held,
      unconfirmed,
      quantum,
      note:
        statusKey === 'disputed'
          ? 'A policy in this category shows a figure, but what is actually payable is unresolved. Treat the displayed amount as unconfirmed.'
          : statusKey === 'documented'
            ? 'Cover documented with benefit figures.'
            : statusKey === 'present_unquantified'
              ? 'A policy is on file but its benefit amounts are not known, so adequacy cannot be assessed.'
              : 'No document supplied. This means unknown, not zero - you may well hold cover that has not been loaded here.',
    }
  })
}

export function sourceFor(id) {
  return SOURCES[id]
}
