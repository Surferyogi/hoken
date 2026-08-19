// Citation registry.
// Every number the rules engine or simulator relies on must point at an entry here.
// If a figure has no verifiable source it is NOT hardcoded anywhere in this app -
// it is surfaced to the user as "Not available - needs input".

export const SOURCES = {
  DOC_INCOME_PREMIUM_BREAKDOWN: {
    id: 'DOC_INCOME_PREMIUM_BREAKDOWN',
    kind: 'user-document',
    title: 'Income Insurance - Premium Breakdown for Insured (page 3 of 4)',
    detail: 'Policy 93034407, period 27 Jun 2026 to 26 Jun 2027, bill reference 69390344077.',
    retrieved: '2026-08-19',
    url: null,
  },
  DOC_INCOME_GIRO_NOTICE: {
    id: 'DOC_INCOME_GIRO_NOTICE',
    kind: 'user-document',
    title: 'Income Insurance - IncomeShield Notice of Payment (Unsuccessful GIRO Deduction) - Reminder',
    detail: 'Letter dated 10 Jul 2026, ref LHO/RB/INSHRB/250. Premium due date 24 Jul 2026.',
    retrieved: '2026-08-19',
    url: null,
  },
  DOC_HOSPITALISATION_SCREEN: {
    id: 'DOC_HOSPITALISATION_SCREEN',
    kind: 'user-document',
    title: 'Insurer/aggregator app screenshot - "Hospitalisation" policy detail',
    detail: 'Policy entry date 27 Jun 2024; private hospital; as-charged ward and treatment; panel 10% co-payment capped at S$3,000 per policy year; standard room; started on 27 Jun 2026. Issuing company is not shown on the screen.',
    retrieved: '2026-08-19',
    url: null,
  },
  DOC_GE_PAR_FUND_LETTER: {
    id: 'DOC_GE_PAR_FUND_LETTER',
    kind: 'user-document',
    title: 'Great Eastern - Participating Fund performance letter',
    detail: 'Dated 13/06/2026, statement page 1/3. Confirms at least one Great Eastern participating policy exists. No policy number, sum assured or premium shown on the page supplied.',
    retrieved: '2026-08-19',
    url: null,
  },
  DOC_GE_CASH_BENEFIT: {
    id: 'DOC_GE_CASH_BENEFIT',
    kind: 'user-document',
    title: 'Great Eastern - Cash Benefit Statement, policy 0211567996 (pages 1 and 2)',
    detail: 'Statement dated 31/05/2026. Plan type PremierLife Generation II (SGD); premium/paymode 0.00/Single; sum assured 5,408; anniversary date 31/05/2026. CB option: to receive cash bonus during payout period. SB option: to receive survival benefit. Full ledger from Balance B/F 8,036.82 at 31/05/2025 to Balance C/F 8,171.62 at 31/05/2026. Note on statement: if the total outstanding exceeds the surrender value, the Cash Benefit amount is used automatically to prevent the policy lapsing.',
    retrieved: '2026-08-19',
    url: null,
  },
  DOC_GE_APP_OVERVIEW: {
    id: 'DOC_GE_APP_OVERVIEW',
    kind: 'user-document',
    title: 'Great Eastern app - PremierLife Generation II (SGD), Overview tab',
    detail: 'Policy 0211567996; insured CHOW KOK SUM; sum assured 5,408.00 SGD; status Inforce; coverage 31 May 2019 to 09 Sep 9999. Single premium paid 400,000.05 SGD, payment method Cash. Policy values: net surrender value 343,515.60 SGD, net available loan value 316,034.35 SGD, marked "projected and not guaranteed". Survival benefits balance 0.00 SGD; payout option "Receive payout"; payout method PayNow.',
    retrieved: '2026-08-19',
    url: null,
  },
  DOC_GE_APP_PROTECTION: {
    id: 'DOC_GE_APP_PROTECTION',
    kind: 'user-document',
    title: 'Great Eastern app - PremierLife Generation II (SGD), Protection tab',
    detail: 'Death benefit: "Beneficiaries will receive the coverage amount upon the death of the policyholder." Natural death, insured CHOW KOK SUM, sum assured 5,408.00 SGD, cover 31 May 2019 to 31 Dec 9999. Rider count: 0.',
    retrieved: '2026-08-19',
    url: null,
  },
  OCBC_PLG_V: {
    id: 'OCBC_PLG_V',
    kind: 'official',
    title: 'OCBC Premier Banking - PremierLife Generation V',
    detail: 'A single-premium whole-life participating plan underwritten by The Great Eastern Life Assurance Company Limited. On death or terminal illness the beneficiaries receive a lump sum consisting of "105% of the single premium and non-guaranteed terminal bonus, less any debt". Payouts combine a guaranteed survival benefit and a non-guaranteed cash bonus, starting in the 3rd policy year and continuing for life. Surrender value guaranteed at 80% of the single premium from inception. IMPORTANT: this describes Generation V, a later version. It is cited here only to show that in this product family the death benefit is defined against the single premium rather than the nominal sum assured. It is NOT evidence of how Generation II is structured.',
    retrieved: '2026-08-19',
    url: 'https://www.ocbc.com/personal-banking/premier-banking/solutions/premierlife_generation',
  },

  CPF_AWL: {
    id: 'CPF_AWL',
    kind: 'official',
    title: 'CPF Board - Additional Withdrawal Limits (AWLs) for Integrated Shield Plan premiums',
    detail: 'AWL by age next birthday: 1-40 $300; 41-70 $600; 71 and above $900. MediShield Life premiums are fully payable by MediSave.',
    retrieved: '2026-08-19',
    url: 'https://www.cpf.gov.sg/service/article/what-are-additional-withdrawal-limits-awls-for-integrated-shield-plan-ip-premiums',
  },
  MOH_IP_ABOUT: {
    id: 'MOH_IP_ABOUT',
    kind: 'official',
    title: 'Ministry of Health - About Integrated Shield Plans',
    detail: 'An IP has two components: the MediShield Life component and the additional private insurance component. The MediShield Life portion is fully payable by MediSave; the private portion is payable by MediSave up to the AWL.',
    retrieved: '2026-08-19',
    url: 'https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/integrated-shield-plans/about-integrated-shield-plans/',
  },
  MOH_IP_MSL_RELEVANCE: {
    id: 'MOH_IP_MSL_RELEVANCE',
    kind: 'official',
    title: 'Ministry of Health (AskGov) - I already have an Integrated Shield Plan. How is MediShield Life relevant to me?',
    detail: '"If you have an IP, you already have MediShield Life, as MediShield Life is a component of your IP." MediShield Life covers all pre-existing conditions even if excluded by the private insurer, and continues if the IP is terminated.',
    retrieved: '2026-08-19',
    url: 'https://ask.gov.sg/moh/questions/cm2vswij9001kq750j9yy045i',
  },
  HEALTHHUB_IP: {
    id: 'HEALTHHUB_IP',
    kind: 'official',
    title: 'HealthHub - Integrated Shield Plans (IPs)',
    detail: '"If you have an IP, you already have MediShield Life coverage and there is no duplicate coverage."',
    retrieved: '2026-08-19',
    url: 'https://www.healthhub.sg/support-and-tools/costs-and-financing/integrated-shield-plans-ips',
  },
  MOH_RIDER_CASH_ONLY: {
    id: 'MOH_RIDER_CASH_ONLY',
    kind: 'official',
    title: 'Ministry of Health (AskGov) - Can we use MediSave to pay for Integrated Shield Plans (IPs) and Riders?',
    detail: '"Rider premiums are only payable in cash as they are not part of IPs or MediShield Life."',
    retrieved: '2026-08-19',
    url: 'https://ask.gov.sg/moh/questions/cm2vsyrz3001pq750rqn57pwd',
  },
  MOH_RIDER_RULES_2026: {
    id: 'MOH_RIDER_RULES_2026',
    kind: 'official',
    title: 'Ministry of Health - New requirements for Integrated Shield Plan riders (effective 1 April 2026)',
    detail: 'New riders sold may no longer cover the minimum IP deductibles. Minimum 5% co-payment retained. Minimum annual co-payment cap raised to $6,000 (previously $3,000 since 2018), applying to eligible claims such as panel or pre-authorised claims. Riders bought before 27 Nov 2025 are not affected initially; non-compliant riders bought from 27 Nov 2025 transition to compliant riders no later than the next policy renewal after 1 April 2028.',
    retrieved: '2026-08-19',
    url: 'https://www.moh.gov.sg/newsroom/new-requirements-for-integrated-shield-plan-riders-to-strengthen-sustainability-of-private-health-insurance-and-address-rising-healthcare-costs/',
  },
  INCOME_EIS_CONDITIONS: {
    id: 'INCOME_EIS_CONDITIONS',
    kind: 'official',
    title: 'Income Insurance - Enhanced IncomeShield Policy Conditions (1 Apr 2026), Schedule of Benefits, Enhanced Preferred',
    detail: 'Policy year limit $1,500,000; lifetime limit unlimited; co-insurance 10%; deductible for private hospital and Ward A $3,500 for age 80 and below (next birthday) and $5,250 for above 80; ward entitlement standard room in a private hospital; daily ward and treatment charges as charged; pre-hospitalisation up to 180 days and post-hospitalisation up to 365 days when provided by the panel; inpatient psychiatric as charged up to $20,000; proton beam therapy as charged up to $100,000; cancer drug treatment 5x MediShield Life limit for one primary cancer; final expenses benefit $5,000. Document reference LHO/Enhanced IncomeShield/202604.',
    retrieved: '2026-08-19',
    url: 'https://assets-au-01.kc-usercontent.com/8acbd32f-b7e0-0294-6b7d-a2bc72d6b30c/165f685e-97c9-4503-8d1c-93d9dc590c3b/Enhanced%20IncomeShield%20Policy%20Conditions%201%20Apr%202026.pdf',
  },
  INCOME_CARE_RIDER: {
    id: 'INCOME_CARE_RIDER',
    kind: 'official',
    title: 'Income Insurance - Product information, Deluxe Care Rider and Classic Care Rider (Enhanced IncomeShield)',
    detail: 'Classic Care Rider attaches to Enhanced IncomeShield Preferred, Advantage and Basic. Co-payment 10% of the benefits due under the policy. Co-payment limit $3,000 for each policy year for panel providers. Treatment outside the panel carries an additional non-panel payment of up to $2,000 in each policy year and the co-payment cap does not apply to non-panel hospitalisation. While the rider is in force there is no deductible or co-insurance due under the Enhanced IncomeShield plan.',
    retrieved: '2026-08-19',
    url: 'https://www.income.com.sg/kcassets/a1efbbbf-27cc-4c7f-beb1-f42951819219/Website-Product-Information-Deluxe-Care-Classic-Care-Rider-EIS.pdf',
  },
  INCOME_EIS_PRODUCT_PAGE: {
    id: 'INCOME_EIS_PRODUCT_PAGE',
    kind: 'official',
    title: 'Income Insurance - Enhanced IncomeShield product page',
    detail: 'From 1 April 2026 the riders offered are Optima Care Rider and Essential Care Rider, with a co-payment limit of up to $6,000 each policy year for panel and extended panel treatment. Deluxe Care, Classic Care, Plus and Assist riders are withdrawn from new sales; existing policyholders retain their cover.',
    retrieved: '2026-08-19',
    url: 'https://www.income.com.sg/health-insurance/enhanced-incomeshield',
  },
  CPF_MSL_COVERAGE: {
    id: 'CPF_MSL_COVERAGE',
    kind: 'official',
    title: 'CPF Board - What MediShield Life covers you for',
    detail: 'Maximum claim limit per policy year $200,000 with no lifetime limit, effective 1 June 2026. Normal ward $830 per day plus an additional $800 per day for the first two inpatient days; intensive care unit $5,140 per day. Co-insurance ranges from 10% down to 3% as the claimable amount increases.',
    retrieved: '2026-08-19',
    url: 'https://www.cpf.gov.sg/member/healthcare-financing/medishield-life/what-medishield-life-covers-you-for',
  },
  CPF_MSL_DEDUCTIBLE: {
    id: 'CPF_MSL_DEDUCTIBLE',
    kind: 'official',
    title: 'CPF Board (AskGov) - What is the MediShield Life deductible?',
    detail: 'For admissions or treatments on or after 1 June 2026, age 80 and below: Class C $2,000; Class B2/B2+/B1 $2,500; Class A including private hospitals $3,500; day surgery $1,500; outpatient treatments $500. Age 81 and above: Class C $2,750; Class B2/B2+/B1 $3,500; Class A including private hospitals $4,500; day surgery $2,000; outpatient $500.',
    retrieved: '2026-08-19',
    url: 'https://ask.gov.sg/cpf/questions/cm0f52l0c01s7pz7a1f72qi84',
  },
  MOH_IP_COMPARISON: {
    id: 'MOH_IP_COMPARISON',
    kind: 'official',
    title: 'Ministry of Health - Comparison of Integrated Shield Plans',
    detail: 'MOH publishes side-by-side comparison tables for Private Hospital, Class A, Class B1, Standard and Basic IPs. Use these to benchmark premiums and benefits. MOH notes that the actual amount will vary over time as insurers may revise premiums regularly.',
    retrieved: '2026-08-19',
    url: 'https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/integrated-shield-plans/comparision-of-integrated-shield-plans/',
  },
}

export const SOURCE_LIST = Object.values(SOURCES)

export function cite(id) {
  return SOURCES[id] || null
}
