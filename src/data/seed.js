// Seed data transcribed from the source documents supplied on 2026-08-19.
//
// RULES FOR THIS FILE
//  1. Every value below is either read directly off a supplied document, or it is null.
//  2. null means "Not available" - it is NEVER a zero, a default, or an estimate.
//  3. `src` on a field group names the document it was read from (see data/sources.js).
//  4. Personal identifiers are deliberately limited: the NRIC is stored exactly as it was
//     MASKED on the premium bill, and the residential address and the agent's phone/email
//     are NOT stored in this repository. Add them in-app if you want them; in-app edits
//     live only in this browser's localStorage and are never committed.

export const PROFILE = {
  name: 'CHOW KOK SUM',
  idMasked: 'S****451E', // as printed on the Income premium breakdown
  ageNextBirthday: 53, // stated on the Income premium breakdown for the 2026/27 period
  ageNextBirthdayAsOf: '2026-06-27',
  residency: null, // Not stated on any supplied document
  dependants: null, // Not supplied
  annualIncome: null, // Not supplied - needed for life/CI adequacy tests
  medisaveBalance: null, // Not supplied - needed to confirm the MediSave switch is fundable
  src: ['DOC_INCOME_PREMIUM_BREAKDOWN'],
}

// Categories the gap engine checks. `expected` marks the cover most Singapore
// residents are advised to hold; the engine reports "no document supplied",
// never "you have no cover", when nothing is on file.
export const COVER_CATEGORIES = [
  { key: 'hospitalisation', label: 'Hospitalisation / medical', expected: true },
  { key: 'life', label: 'Death / life cover', expected: true },
  { key: 'critical_illness', label: 'Critical illness', expected: true },
  { key: 'disability_income', label: 'Disability income / income protection', expected: true },
  { key: 'long_term_care', label: 'Long-term care (CareShield Life / ElderShield)', expected: true },
  { key: 'personal_accident', label: 'Personal accident', expected: false },
  { key: 'outpatient', label: 'Outpatient / GP / specialist', expected: false },
  { key: 'savings', label: 'Savings / endowment / participating', expected: false },
  { key: 'travel', label: 'Travel', expected: false },
  { key: 'home', label: 'Home / fire / contents', expected: false },
  { key: 'motor', label: 'Motor', expected: false },
]

export const SEED_POLICIES = [
  {
    id: 'income-eis-preferred',
    insurer: 'Income Insurance Limited',
    insurerUen: '202135698W',
    product: 'Enhanced IncomeShield Preferred',
    kind: 'ip_main', // Integrated Shield Plan main plan
    category: 'hospitalisation',
    policyNumber: '93034407',
    insured: 'CHOW KOK SUM',
    ageNextBirthday: 53,
    periodFrom: '2026-06-27',
    periodTo: '2027-06-26',
    inceptionDate: null, // Not stated on the Income documents supplied
    status: 'in_force_pending_payment',
    paymentMode: 'Full Cash',
    billReference: '69390344077',
    premium: {
      medishieldLifePortion: 871.3, // inclusive of GST
      privateInsurancePortion: 1715.0, // inclusive of GST
      riderPortion: 1464.0, // inclusive of GST
      total: 4050.3,
      currency: 'SGD',
      frequency: 'annual',
      paidFromMedisave: 0, // the bill states the whole amount is payable by cash
      paidFromCash: 4050.3,
    },
    billing: {
      noticeDate: '2026-07-10',
      dueDate: '2026-07-24',
      noticeType: 'Unsuccessful GIRO deduction - reminder',
      amountDue: 4050.3,
      paidOn: null, // UNKNOWN - no document confirms payment. Must be verified by the user.
      failedGiroAttempts: 2,
    },
    // Benefit figures below come from Income's published policy conditions, not from
    // the user's own policy schedule. Confirm against your own contract before relying on them.
    benefits: {
      policyYearLimit: 1500000,
      lifetimeLimit: null, // stated as "Unlimited" in the policy conditions
      lifetimeLimitLabel: 'Unlimited',
      coInsurancePct: 10,
      deductiblePrivateHospital: 3500, // age next birthday 80 and below
      deductiblePrivateHospitalOver80: 5250,
      // Full deductible table from the Schedule of Benefits, Enhanced Preferred.
      deductibleByWard: {
        private_hospital: 3500,
        ward_a: 3500,
        ward_b1: 2500,
        ward_b2: 2000,
        ward_c: 1500,
      },
      deductibleByWardOver80: {
        private_hospital: 5250,
        ward_a: 5250,
        ward_b1: 3750,
        ward_b2: 3000,
        ward_c: 2250,
      },
      wardEntitlement: 'Standard room in private hospital or private medical institution',
      dailyWardAndTreatment: 'As charged',
      preHospitalisationDaysPanel: 180,
      postHospitalisationDaysPanel: 365,
      inpatientPsychiatricLimit: 20000,
      protonBeamTherapyLimit: 100000,
      finalExpensesBenefit: 5000,
    },
    benefitsSrc: 'INCOME_EIS_CONDITIONS',
    src: ['DOC_INCOME_PREMIUM_BREAKDOWN', 'DOC_INCOME_GIRO_NOTICE'],
    notes:
      'MediShield Life is a component of this plan, not a separate policy. The $871.30 line on the bill is the MediShield Life portion collected by Income.',
  },
  {
    id: 'income-classic-care-rider',
    insurer: 'Income Insurance Limited',
    product: 'Classic Care Rider',
    kind: 'ip_rider',
    category: 'hospitalisation',
    attachedTo: 'income-eis-preferred',
    policyNumber: '93034407',
    insured: 'CHOW KOK SUM',
    periodFrom: '2026-06-27',
    periodTo: '2027-06-26',
    status: 'in_force_pending_payment',
    premium: {
      total: 1464.0,
      currency: 'SGD',
      frequency: 'annual',
      paidFromMedisave: 0,
      paidFromCash: 1464.0,
      medisaveEligible: false, // MOH: rider premiums are payable in cash only
    },
    benefits: {
      coPaymentPct: 10,
      coPaymentAnnualCapPanel: 3000,
      nonPanelAdditionalPaymentCap: 2000,
      removesDeductible: true,
      removesCoInsurance: true,
      coPaymentCapAppliesToNonPanel: false,
    },
    benefitsSrc: 'INCOME_CARE_RIDER',
    src: ['DOC_INCOME_PREMIUM_BREAKDOWN', 'DOC_INCOME_GIRO_NOTICE'],
    notes:
      'Withdrawn from new sales from 1 April 2026. Existing policyholders keep the cover, but it cannot be bought back if it is dropped.',
  },
  {
    id: 'hospitalisation-screen',
    insurer: null, // The screenshot does not show the issuing company
    product: 'Hospitalisation (as labelled in the app screenshot)',
    kind: 'unidentified',
    category: 'hospitalisation',
    policyNumber: null,
    insured: 'Chow Kok Sum',
    inceptionDate: '2024-06-27', // "Policy entry date"
    coverStarted: '2026-06-27', // "Started on"
    status: 'unconfirmed',
    servicingAgent: 'Aaron Nicholas Chng Peng Yau', // contact details deliberately not stored here
    premium: {
      total: null, // Not shown on the screen
      currency: 'SGD',
      frequency: null,
    },
    benefits: {
      hospitalType: 'Private Hospital',
      wardType: 'Standard room',
      roomEntitlement: 'As charged on daily ward and treatment charges',
      doctorSelection: 'Choose any doctor, subject to selected ward',
      panelCoPaymentPct: 10,
      panelCoPaymentAnnualCap: 3000,
    },
    benefitsSrc: null, // read off the screenshot itself
    src: ['DOC_HOSPITALISATION_SCREEN'],
    needsConfirmation: true,
    notes:
      'Every benefit term visible on this screen matches the Income Enhanced IncomeShield Preferred plus Classic Care Rider combination, and the policy anniversary (27 Jun) is the same. It is most likely the SAME policy displayed in a different app, not a second one - but the screen does not name the insurer, so this is unresolved until you confirm it.',
  },
  {
    id: 'ge-premierlife-gen2',
    insurer: 'The Great Eastern Life Assurance Company Limited',
    product: 'PremierLife Generation II (SGD)',
    kind: 'participating',
    category: 'savings',
    // This policy also carries a death benefit, so the gap scan counts it under 'life' too.
    secondaryCategories: ['life'],
    policyNumber: '0211567996',
    insured: 'CHOW KOK SUM',
    status: 'in_force', // app shows "Inforce"
    inceptionDate: '2019-05-31', // coverage start date
    anniversaryDate: '2026-05-31',
    statementDate: '2026-05-31',
    riderCount: 0, // app shows "Rider (0)"
    premium: {
      total: 400000.05, // single premium paid
      currency: 'SGD',
      frequency: 'single',
      paymentMethod: 'Cash',
      paidFromCash: 400000.05,
      paidFromMedisave: 0,
    },
    benefits: {
      sumAssured: 5408.0,
      // What the app labels the death cover. Whether this is the WHOLE amount payable on
      // death, or only the nominal sum assured with the accumulated/terminal value paid on
      // top, is NOT stated on any document supplied. Left null rather than assumed.
      deathBenefitTotal: null,
      netSurrenderValue: 343515.6, // marked "projected and not guaranteed"
      netAvailableLoanValue: 316034.35,
      surrenderValueAsOf: '2026-08-19',
      maturityDate: null, // whole of life; the app shows sentinel end dates, see notes
      cashBenefitBalance: 8171.62, // Balance C/F at 31/05/2026
      cashBenefitBalanceAsOf: '2026-05-31',
      cashBenefitBalanceOpening: 8036.82, // Balance B/F at 31/05/2025
      monthlyCashBonus: 648.96,
      monthlySurvivalBenefit: 540.8,
      payoutMethod: 'PayNow',
      payoutPeriodStart: null, // NOT on any document supplied - blocks cumulative-payout maths
      terminalBonus: null, // Not shown
      outstandingLoan: null, // No outstanding loan is shown on any document supplied
    },
    benefitsSrc: null, // read off the user's own documents, not a published product sheet
    src: ['DOC_GE_APP_OVERVIEW', 'DOC_GE_APP_PROTECTION', 'DOC_GE_CASH_BENEFIT', 'DOC_GE_PAR_FUND_LETTER'],
    needsConfirmation: true,
    notes:
      'Single-premium participating whole-life policy. The two app screens disagree on the coverage end date (Overview shows 09 Sep 9999, Protection shows 31 Dec 9999); both are system sentinel values for whole-of-life, so neither is treated as a real date here. The open question on this policy is what is actually payable on death.',
  },
]

// Great Eastern Cash Benefit Statement for policy 0211567996, dated 31/05/2026.
// Full ledger, pages 1 and 2, transcribed row by row.
// Opening Balance B/F 8,036.82 at 31/05/2025.
export const GE_CASH_BENEFIT_OPENING = 8036.82

export const GE_CASH_BENEFIT_TXNS = [
  { txnDate: '2025-06-19', effDate: '2025-06-30', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-06-19', effDate: '2025-06-30', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-06-19', effDate: '2025-06-30', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2025-07-22', effDate: '2025-07-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-07-22', effDate: '2025-07-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-07-22', effDate: '2025-07-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2025-08-21', effDate: '2025-08-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-08-21', effDate: '2025-08-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-08-21', effDate: '2025-08-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2025-09-19', effDate: '2025-09-30', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-09-19', effDate: '2025-09-30', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-09-19', effDate: '2025-09-30', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2025-10-22', effDate: '2025-10-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-10-22', effDate: '2025-10-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-10-22', effDate: '2025-10-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2025-11-20', effDate: '2025-11-30', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-11-20', effDate: '2025-11-30', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-11-20', effDate: '2025-11-30', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2025-12-19', effDate: '2025-12-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2025-12-19', effDate: '2025-12-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2025-12-19', effDate: '2025-12-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2026-01-22', effDate: '2026-01-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2026-01-22', effDate: '2026-01-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2026-01-22', effDate: '2026-01-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2026-02-19', effDate: '2026-02-28', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2026-02-19', effDate: '2026-02-28', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2026-02-19', effDate: '2026-02-28', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2026-03-20', effDate: '2026-03-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2026-03-20', effDate: '2026-03-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2026-03-20', effDate: '2026-03-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2026-04-21', effDate: '2026-04-30', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2026-04-21', effDate: '2026-04-30', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2026-04-21', effDate: '2026-04-30', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2026-05-20', effDate: '2026-05-31', description: 'Cash Bonus Interest', amount: 134.8 },
  { txnDate: '2026-05-20', effDate: '2026-05-31', description: 'Cash Bonus Withdrawal', amount: -648.96 },
  { txnDate: '2026-05-20', effDate: '2026-05-31', description: 'Survival Benefit Allocated', amount: 540.8 },
  { txnDate: '2026-05-20', effDate: '2026-05-31', description: 'Survival Benefit Withdrawal', amount: -540.8 },
  { txnDate: '2026-05-29', effDate: '2026-05-31', description: 'Cash Bonus Allocated', amount: 7787.52 },
]

export const GE_CASH_BENEFIT_BALANCE_CF = 8171.62

export const SEED = {
  profile: PROFILE,
  policies: SEED_POLICIES,
  geCashBenefit: {
    transactions: GE_CASH_BENEFIT_TXNS,
    opening: GE_CASH_BENEFIT_OPENING,
    balanceCF: GE_CASH_BENEFIT_BALANCE_CF,
    periodFrom: '2025-05-31',
    periodTo: '2026-05-31',
  },
  seededOn: '2026-08-19',
}
