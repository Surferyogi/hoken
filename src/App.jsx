import React, { useEffect, useMemo, useState } from 'react'
import { APP_VERSION, CHANGELOG } from './version.js'
import { SEED, COVER_CATEGORIES } from './data/seed.js'
import { SOURCE_LIST, SOURCES } from './data/sources.js'
import { runRules, runGapScan, awlForAge } from './lib/rules.js'
import { simulate, WARD_OPTIONS, PROVIDER_OPTIONS } from './lib/simulator.js'

const STORE_KEY = 'hoken.state.v1'
// The app was called CoverLens before v2026:AUG:19-17:14. Anything already saved under
// the old key is migrated once, so a rename never costs you your edits.
const LEGACY_STORE_KEYS = ['coverlens.state.v1']

/* ------------------------------------------------------------------ helpers */

const NA = <span className="na">Not available</span>

function sgd(n, opts = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return null
  return n.toLocaleString('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: opts.whole ? 0 : 2,
    maximumFractionDigits: opts.whole ? 0 : 2,
  })
}

function Money({ value, whole }) {
  const s = sgd(value, { whole })
  return s ? <>{s}</> : NA
}

function todaySG() {
  // Render the date in Asia/Singapore regardless of device timezone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t).value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function daysFrom(aIso, bIso) {
  return Math.round(
    (new Date(`${bIso}T00:00:00+08:00`) - new Date(`${aIso}T00:00:00+08:00`)) / 86400000
  )
}

function useStored(initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.__v === 1) return parsed.data
      }
      // One-time migration from the pre-rename key.
      for (const legacy of LEGACY_STORE_KEYS) {
        const old = localStorage.getItem(legacy)
        if (!old) continue
        const parsed = JSON.parse(old)
        if (parsed && parsed.__v === 1) {
          localStorage.setItem(STORE_KEY, old)
          localStorage.removeItem(legacy)
          return parsed.data
        }
      }
    } catch (e) {
      console.warn('Could not read stored state:', e)
    }
    return typeof initial === 'function' ? initial() : initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ __v: 1, data: state }))
    } catch (e) {
      console.warn('Could not persist state:', e)
    }
  }, [state])

  return [state, setState]
}

/* --------------------------------------------------------------- components */

function SourceLinks({ ids }) {
  if (!ids || !ids.length) return null
  return (
    <div className="f-src">
      <div className="tiny" style={{ marginBottom: 4 }}>Basis</div>
      <div className="chips">
        {ids.map((id) => {
          const s = SOURCES[id]
          if (!s) return null
          return s.url ? (
            <a className="chip src-link" key={id} href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
          ) : (
            <span className="chip" key={id}>
              {s.title} (your document)
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Finding({ f }) {
  return (
    <div className={`card f ${f.severity}`}>
      <div className="f-head">
        <h3 className="f-title">{f.title}</h3>
        <span className={`badge ${f.severity}`}>{f.severity}</span>
      </div>
      {f.confidence === 'needs-confirmation' && (
        <div className="chips" style={{ marginTop: 6 }}>
          <span className="chip">Needs confirmation</span>
        </div>
      )}
      <div className="f-body">{f.body}</div>
      {f.impact && (
        <div className="f-row">
          <b>Why it matters</b>
          {f.impact}
        </div>
      )}
      {f.action && (
        <div className="f-row">
          <b>What to do</b>
          {f.action}
        </div>
      )}
      {f.needsInput && <div className="f-need">Missing input: {f.needsInput}</div>}
      <SourceLinks ids={f.sources} />
    </div>
  )
}

function Stat({ k, v, n, warn, small }) {
  return (
    <div className={`stat${warn ? ' warn' : ''}`}>
      <div className="k">{k}</div>
      <div className={`v${small ? ' sm' : ''}`}>{v}</div>
      {n && <div className="n">{n}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------- views */

function Overview({ state, findings, gaps, today }) {
  const main = state.policies.find((p) => p.kind === 'ip_main')
  const critical = findings.filter((f) => f.severity === 'critical')
  // Recurring premiums only. A single premium is capital deployed, not an annual cost -
  // adding the two together would produce a meaningless number.
  const knownAnnual = state.policies
    .filter((p) => p.kind !== 'ip_rider' && p.premium?.total != null && p.premium?.frequency === 'annual')
    .reduce((s, p) => s + p.premium.total, 0)
  const singlePremiumCapital = state.policies
    .filter((p) => p.premium?.frequency === 'single' && p.premium?.total != null)
    .reduce((s, p) => s + p.premium.total, 0)
  const unknownPremiums = state.policies.filter((p) => p.premium?.total == null).length
  const documented = gaps.filter((g) => g.statusKey === 'documented').length
  const noDoc = gaps.filter((g) => g.expected && g.statusKey === 'no_document').length

  return (
    <>
      <div className="note">
        <b>How to read this app.</b> Every figure here came off a document you supplied or a
        cited official source. Anything that was not on a document shows as{' '}
        <span className="na">Not available</span> — it is never filled in with an estimate. This is
        an analysis aid, not financial advice; your policy contracts and your insurers govern.
      </div>

      <h2>Where you stand as at {today}</h2>
      <div className="grid">
        <Stat
          k="Critical items"
          v={critical.length}
          n={critical.length ? critical[0].title : 'None open'}
          warn={critical.length > 0}
        />
        <Stat
          k="Known annual premium"
          v={sgd(knownAnnual, { whole: true }) || '—'}
          n={unknownPremiums ? `${unknownPremiums} policy premium(s) unknown` : 'Recurring premiums only'}
        />
        {singlePremiumCapital > 0 && (
          <Stat
            k="Capital in single-premium policies"
            v={sgd(singlePremiumCapital, { whole: true })}
            n="Not an annual cost - counted separately"
          />
        )}
        <Stat k="Findings raised" v={findings.length} n={`${gaps.length} cover categories scanned`} />
        <Stat
          k="Categories documented"
          v={`${documented} of ${gaps.length}`}
          n={noDoc ? `${noDoc} expected category(ies) with no document` : 'All expected categories on file'}
        />
      </div>

      {main && (
        <>
          <h2>Main medical plan</h2>
          <div className="card">
            <h3>
              {main.insurer} — {main.product}
            </h3>
            <p className="muted" style={{ marginBottom: 10 }}>
              Policy {main.policyNumber} · {main.periodFrom} to {main.periodTo} · age next birthday{' '}
              {main.ageNextBirthday}
            </p>
            <div className="grid">
              <Stat k="Policy year limit" v={sgd(main.benefits.policyYearLimit, { whole: true })} n="Lifetime: unlimited" />
              <Stat
                k="Out-of-pocket cap"
                v={sgd(state.policies.find((p) => p.kind === 'ip_rider')?.benefits?.coPaymentAnnualCapPanel, { whole: true }) || '—'}
                n="Panel treatment, while the rider is in force"
              />
              <Stat k="Annual premium" v={sgd(main.premium.total, { whole: true })} n={`Payment mode: ${main.paymentMode}`} />
            </div>
          </div>
        </>
      )}

      <h2>Top items</h2>
      {findings.slice(0, 3).map((f) => (
        <Finding key={f.id} f={f} />
      ))}
    </>
  )
}

function Policies({ state, setState }) {
  const [editing, setEditing] = useState(null)

  const update = (id, patch) => {
    setState((s) => ({
      ...s,
      policies: s.policies.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }

  return (
    <>
      <div className="note">
        Fields shown as <span className="na">Not available</span> were not on any document you
        supplied. Fill them in and the analysis on the other tabs updates. Edits are saved in this
        browser only.
      </div>

      {state.policies.map((p) => (
        <div className="card" key={p.id}>
          <div className="f-head">
            <h3 className="f-title">{p.product || 'Unnamed product'}</h3>
            <span className="badge solid">{p.kind.replace(/_/g, ' ')}</span>
          </div>
          <p className="muted" style={{ marginTop: 4 }}>
            {p.insurer || <span className="na">Insurer not shown on the document</span>}
          </p>

          <div className="scroll-x">
            <table>
              <tbody>
                <tr>
                  <th>Policy number</th>
                  <td>{p.policyNumber || NA}</td>
                </tr>
                <tr>
                  <th>Insured</th>
                  <td>{p.insured || NA}</td>
                </tr>
                <tr>
                  <th>Period</th>
                  <td>{p.periodFrom ? `${p.periodFrom} to ${p.periodTo}` : NA}</td>
                </tr>
                <tr>
                  <th>Entry / start</th>
                  <td>
                    {p.inceptionDate || p.coverStarted ? (
                      <>
                        {p.inceptionDate ? `entry ${p.inceptionDate}` : ''}
                        {p.inceptionDate && p.coverStarted ? ' · ' : ''}
                        {p.coverStarted ? `started ${p.coverStarted}` : ''}
                      </>
                    ) : (
                      NA
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Annual premium</th>
                  <td>{p.premium?.total != null ? sgd(p.premium.total) : NA}</td>
                </tr>
                {p.premium?.medishieldLifePortion != null && (
                  <tr>
                    <th>Premium split</th>
                    <td>
                      MediShield Life {sgd(p.premium.medishieldLifePortion)} · private portion{' '}
                      {sgd(p.premium.privateInsurancePortion)} · rider {sgd(p.premium.riderPortion)}
                    </td>
                  </tr>
                )}
                {p.benefits &&
                  Object.entries(p.benefits)
                    .filter(([k]) => !k.endsWith('Over80') && k !== 'deductibleByWard' && k !== 'deductibleByWardOver80')
                    .map(([k, v]) => (
                      <tr key={k}>
                        <th>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</th>
                        <td>
                          {v === null || v === undefined
                            ? NA
                            : typeof v === 'number'
                              ? k.toLowerCase().includes('pct') || k.toLowerCase().includes('days')
                                ? v
                                : sgd(v)
                              : String(v)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {p.notes && (
            <div className="f-row">
              <b>Note</b>
              {p.notes}
            </div>
          )}

          <SourceLinks ids={p.src} />

          {p.kind === 'ip_main' && p.billing && (
            <>
              <hr />
              <div className="field">
                <label htmlFor={`paid-${p.id}`}>Record the date this bill was paid (clears the critical alert)</label>
                <input
                  id={`paid-${p.id}`}
                  type="date"
                  value={p.billing.paidOn || ''}
                  onChange={(e) =>
                    update(p.id, { billing: { ...p.billing, paidOn: e.target.value || null } })
                  }
                />
              </div>
            </>
          )}

          <div className="btn-row">
            <button className="btn ghost" onClick={() => setEditing(editing === p.id ? null : p.id)}>
              {editing === p.id ? 'Close' : 'Edit key fields'}
            </button>
          </div>

          {editing === p.id && (
            <>
              <hr />
              <div className="row2">
                <div className="field">
                  <label>Insurer</label>
                  <input
                    type="text"
                    value={p.insurer || ''}
                    placeholder="Not available"
                    onChange={(e) => update(p.id, { insurer: e.target.value || null })}
                  />
                </div>
                <div className="field">
                  <label>Product</label>
                  <input
                    type="text"
                    value={p.product || ''}
                    placeholder="Not available"
                    onChange={(e) => update(p.id, { product: e.target.value || null })}
                  />
                </div>
                <div className="field">
                  <label>Policy number</label>
                  <input
                    type="text"
                    value={p.policyNumber || ''}
                    placeholder="Not available"
                    onChange={(e) => update(p.id, { policyNumber: e.target.value || null })}
                  />
                </div>
                <div className="field">
                  <label>Annual premium (SGD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={p.premium?.total ?? ''}
                    placeholder="Not available"
                    onChange={(e) =>
                      update(p.id, {
                        premium: {
                          ...p.premium,
                          total: e.target.value === '' ? null : Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Sum assured / benefit amount (SGD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={p.benefits?.sumAssured ?? ''}
                    placeholder="Not available"
                    onChange={(e) =>
                      update(p.id, {
                        benefits: {
                          ...p.benefits,
                          sumAssured: e.target.value === '' ? null : Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={p.category} onChange={(e) => update(p.id, { category: e.target.value })}>
                    {COVER_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  )
}

function Gaps({ findings, gaps }) {
  const dup = findings.filter((f) => f.type === 'duplication')
  const gapFindings = findings.filter((f) => f.type === 'gap')
  const dataFindings = findings.filter((f) => f.type === 'data')

  return (
    <>
      <h2>Duplication</h2>
      {dup.length ? dup.map((f) => <Finding key={f.id} f={f} />) : <p className="muted">No duplication detected in the records on file.</p>}

      <h2>Coverage scan</h2>
      <div className="note">
        A category marked <b>no document</b> means nothing has been loaded here for it. That is a
        blind spot, not a confirmed absence of cover.
      </div>
      <div className="card">
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Status</th>
                <th>On file</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.key}>
                  <td>
                    {g.label}
                    {g.expected && (
                      <>
                        {' '}
                        <span className="chip" style={{ fontSize: 10 }}>core</span>
                      </>
                    )}
                    <div className="tiny">{g.note}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        g.statusKey === 'documented'
                          ? 'ok'
                          : g.statusKey === 'disputed'
                            ? 'critical'
                            : g.statusKey === 'present_unquantified'
                              ? 'medium'
                              : g.expected
                                ? 'high'
                                : 'info'
                      }`}
                    >
                      {g.statusKey === 'documented'
                        ? 'documented'
                        : g.statusKey === 'disputed'
                          ? 'unresolved'
                          : g.statusKey === 'present_unquantified'
                            ? 'unquantified'
                            : 'no document'}
                    </span>
                  </td>
                  <td>
                    {g.held.length ? g.held.map((p) => p.product || p.insurer).join(', ') : '—'}
                    {g.quantum != null && (
                      <div className="tiny">
                        Sum assured on file: {sgd(g.quantum)}
                        {g.statusKey === 'disputed' ? ' (what is actually payable is unresolved)' : ''}
                      </div>
                    )}
                    {g.unconfirmed.length ? <div className="tiny">+{g.unconfirmed.length} unconfirmed</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {gapFindings.length > 0 && (
        <>
          <h2>Limits inside the cover you do have</h2>
          {gapFindings.map((f) => (
            <Finding key={f.id} f={f} />
          ))}
        </>
      )}

      {dataFindings.length > 0 && (
        <>
          <h2>Missing information</h2>
          {dataFindings.map((f) => (
            <Finding key={f.id} f={f} />
          ))}
        </>
      )}
    </>
  )
}

function Cost({ state, setState, findings, today }) {
  const main = state.policies.find((p) => p.kind === 'ip_main')
  const rider = state.policies.find((p) => p.kind === 'ip_rider')
  const ge = state.policies.find((p) => p.kind === 'participating')
  const costFindings = findings.filter((f) => f.type === 'cost')
  const anb = main?.ageNextBirthday ?? state.profile.ageNextBirthday
  const awl = awlForAge(anb)

  const msl = main?.premium?.medishieldLifePortion ?? null
  const priv = main?.premium?.privateInsurancePortion ?? null
  const riderPrem = rider?.premium?.total ?? null
  const total = main?.premium?.total ?? null
  const privMedisave = priv != null && awl != null ? Math.min(priv, awl) : null
  const medisaveMax = msl != null && privMedisave != null ? msl + privMedisave : null
  const cashMin = total != null && medisaveMax != null ? total - medisaveMax : null

  const renewals = state.policies
    .filter((p) => p.periodTo)
    .map((p) => ({ id: p.id, label: `${p.insurer || 'Unknown insurer'} — ${p.product}`, date: p.periodTo }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dueItems = state.policies
    .filter((p) => p.billing?.dueDate)
    .map((p) => ({ ...p.billing, id: p.id, label: p.product }))

  return (
    <>
      <h2>Annual outlay</h2>
      {total != null ? (
        <div className="card">
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th className="num">Amount</th>
                  <th>MediSave-payable?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>MediShield Life portion</td>
                  <td className="num">{sgd(msl)}</td>
                  <td>Yes — in full</td>
                </tr>
                <tr>
                  <td>Enhanced IncomeShield Preferred, private insurance portion</td>
                  <td className="num">{sgd(priv)}</td>
                  <td>Up to the {sgd(awl, { whole: true })} AWL (age next birthday {anb})</td>
                </tr>
                <tr>
                  <td>Classic Care Rider</td>
                  <td className="num">{sgd(riderPrem)}</td>
                  <td>No — cash only</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Total billed</td>
                  <td className="num">{sgd(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <hr />
          <div className="grid">
            <Stat k="Currently from cash" v={sgd(main.premium.paidFromCash, { whole: true })} n={`Payment mode on the bill: ${main.paymentMode}`} warn />
            <Stat k="Could come from MediSave" v={sgd(medisaveMax, { whole: true })} n="Subject to your MediSave balance" />
            <Stat k="Irreducible cash" v={sgd(cashMin, { whole: true })} n="Rider plus private portion above the AWL" />
          </div>
          <div className="bar" title="Cash vs MediSave-payable split">
            <i style={{ width: `${(medisaveMax / total) * 100}%`, background: 'var(--ok)' }} />
            <i style={{ width: `${(cashMin / total) * 100}%`, background: 'var(--high)' }} />
          </div>
          <div className="tiny" style={{ marginTop: 6 }}>
            Green = MediSave-payable ({((medisaveMax / total) * 100).toFixed(0)}%) · Amber = must be cash (
            {((cashMin / total) * 100).toFixed(0)}%)
          </div>
        </div>
      ) : (
        <p className="muted">No premium figures on file.</p>
      )}

      <h2>Unknown costs</h2>
      <div className="card flat">
        {state.policies.filter((p) => p.premium?.total == null).length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {state.policies
              .filter((p) => p.premium?.total == null)
              .map((p) => (
                <li key={p.id} className="muted">
                  {p.insurer || 'Unknown insurer'} — {p.product || 'unnamed product'}: premium{' '}
                  <span className="na">not available</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted" style={{ margin: 0 }}>All premiums on file are known.</p>
        )}
        <p className="tiny" style={{ marginTop: 8, marginBottom: 0 }}>
          Total household outlay cannot be stated until these are filled in.
        </p>
      </div>

      <h2>Dates that matter</h2>
      <div className="card">
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th className="num">Days</th>
              </tr>
            </thead>
            <tbody>
              {dueItems.map((d) => {
                const delta = daysFrom(today, d.dueDate)
                return (
                  <tr key={`due-${d.id}`}>
                    <td>
                      Premium due — {d.label}
                      <div className="tiny">
                        {d.paidOn ? `Recorded as paid ${d.paidOn}` : 'Payment not recorded in this app'}
                      </div>
                    </td>
                    <td>{d.dueDate}</td>
                    <td className="num" style={{ color: !d.paidOn && delta < 0 ? 'var(--critical)' : undefined }}>
                      {delta < 0 ? `${-delta} overdue` : `in ${delta}`}
                    </td>
                  </tr>
                )
              })}
              {renewals.map((r) => {
                const delta = daysFrom(today, r.date)
                return (
                  <tr key={`ren-${r.id}`}>
                    <td>Renewal — {r.label}</td>
                    <td>{r.date}</td>
                    <td className="num">{delta < 0 ? `${-delta} ago` : `in ${delta}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <h2>Cost findings</h2>
      {costFindings.map((f) => (
        <Finding key={f.id} f={f} />
      ))}

      {ge && (
        <>
          <h2>Great Eastern capital position</h2>
          <div className="card">
            <h3>{ge.product}</h3>
            <p className="muted" style={{ marginBottom: 10 }}>
              Policy {ge.policyNumber} · single premium paid {ge.inceptionDate} · {ge.riderCount} riders
            </p>
            <div className="grid">
              <Stat k="Single premium paid" v={sgd(ge.premium.total, { whole: true })} n={`Paid by ${ge.premium.paymentMethod}`} />
              <Stat
                k="Net surrender value"
                v={sgd(ge.benefits.netSurrenderValue, { whole: true })}
                n={`${((ge.benefits.netSurrenderValue / ge.premium.total) * 100).toFixed(1)}% of premium · projected, not guaranteed`}
              />
              <Stat
                k="Monthly payout"
                v={sgd(ge.benefits.monthlyCashBonus + ge.benefits.monthlySurvivalBenefit, { whole: true })}
                n={`${sgd(ge.benefits.monthlyCashBonus)} cash bonus + ${sgd(ge.benefits.monthlySurvivalBenefit)} survival benefit`}
              />
              <Stat
                k="Annualised payout"
                v={sgd((ge.benefits.monthlyCashBonus + ge.benefits.monthlySurvivalBenefit) * 12, { whole: true })}
                n={`${(
                  (((ge.benefits.monthlyCashBonus + ge.benefits.monthlySurvivalBenefit) * 12) / ge.premium.total) *
                  100
                ).toFixed(2)}% of the single premium a year`}
              />
              <Stat k="Death benefit" v="Unresolved" n={`App shows ${sgd(ge.benefits.sumAssured)} sum assured`} warn small />
              <Stat
                k="Net available loan value"
                v={sgd(ge.benefits.netAvailableLoanValue, { whole: true })}
                n="What you could borrow, not money owed"
              />
            </div>
          </div>

          <h2>Great Eastern cash benefit ledger</h2>
          <div className="card">
            <div className="grid">
              <Stat k="Balance B/F" v={sgd(state.geCashBenefit.opening)} n={state.geCashBenefit.periodFrom} />
              <Stat k="Balance C/F" v={sgd(state.geCashBenefit.balanceCF)} n={state.geCashBenefit.periodTo} />
              <Stat
                k="Net movement"
                v={sgd(state.geCashBenefit.balanceCF - state.geCashBenefit.opening)}
                n="All of it cash bonus interest"
              />
            </div>
            <hr />
            <details>
              <summary>Show all {state.geCashBenefit.transactions.length} transactions</summary>
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th>Txn date</th>
                      <th>Effective</th>
                      <th>Description</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.geCashBenefit.transactions.map((t, i) => (
                      <tr key={i}>
                        <td>{t.txnDate}</td>
                        <td>{t.effDate}</td>
                        <td>{t.description}</td>
                        <td className="num" style={{ color: t.amount < 0 ? 'var(--high)' : 'var(--ok)' }}>
                          {sgd(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Balance carried forward (as printed)</td>
                      <td className="num">{sgd(state.geCashBenefit.balanceCF)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </details>
            <p className="tiny" style={{ marginTop: 8, marginBottom: 0 }}>
              Full ledger from the statement dated 31/05/2026, pages 1 and 2. The reconciliation is
              on the Gaps &amp; duplication tab.
            </p>
          </div>
        </>
      )}
    </>
  )
}

function Simulator({ state }) {
  const main = state.policies.find((p) => p.kind === 'ip_main')
  const rider = state.policies.find((p) => p.kind === 'ip_rider')

  const [bill, setBill] = useState(80000)
  const [ward, setWard] = useState('private_hospital')
  const [provider, setProvider] = useState('panel')
  const [riderInForce, setRiderInForce] = useState(true)
  const [deductibleUsed, setDeductibleUsed] = useState(0)
  const [coPaymentUsed, setCoPaymentUsed] = useState(0)

  const result = useMemo(
    () =>
      simulate({
        billAmount: bill,
        ward,
        provider,
        riderInForce,
        deductibleUsed: Number(deductibleUsed) || 0,
        coPaymentUsed: Number(coPaymentUsed) || 0,
        main,
        rider,
        ageNextBirthday: main?.ageNextBirthday ?? state.profile.ageNextBirthday,
      }),
    [bill, ward, provider, riderInForce, deductibleUsed, coPaymentUsed, main, rider, state.profile.ageNextBirthday]
  )

  if (!main) return <p className="muted">No main medical plan on file to simulate against.</p>

  return (
    <>
      <div className="note">
        <b>What this models.</b> Policy year limit, deductible, co-insurance, rider co-payment and
        its annual cap. <b>What it does not model:</b> benefit-specific sub-limits, exclusions,
        pre-existing condition loadings, pre-authorisation outcomes, or a claim spanning two policy
        years. Use it to compare scenarios, not to predict a settlement.
      </div>

      <div className="card">
        <div className="row2">
          <div className="field">
            <label htmlFor="bill">Total hospital bill (SGD)</label>
            <input id="bill" type="number" min="0" step="100" value={bill} onChange={(e) => setBill(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ward">Ward / setting</label>
            <select id="ward" value={ward} onChange={(e) => setWard(e.target.value)}>
              {WARD_OPTIONS.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="prov">Provider</label>
            <select id="prov" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {PROVIDER_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="du">Deductible already paid this policy year</label>
            <input id="du" type="number" min="0" step="100" value={deductibleUsed} onChange={(e) => setDeductibleUsed(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cu">Rider co-payment already paid this policy year</label>
            <input id="cu" type="number" min="0" step="100" value={coPaymentUsed} onChange={(e) => setCoPaymentUsed(e.target.value)} />
          </div>
        </div>
        <div className="check">
          <input id="rif" type="checkbox" checked={riderInForce} onChange={(e) => setRiderInForce(e.target.checked)} />
          <label htmlFor="rif">Rider is in force</label>
        </div>
      </div>

      {!result.ok ? (
        <div className="card f high">
          <h3 className="f-title">Cannot simulate — inputs missing</h3>
          <div className="f-need">Missing: {result.missing.join(', ')}</div>
        </div>
      ) : (
        <>
          <h2>Your out-of-pocket</h2>
          <div className="grid">
            <Stat
              k="With the rider"
              v={sgd(result.withRider?.outOfPocket, { whole: true }) || '—'}
              n={result.withRider ? `${sgd(result.withRider.coPayment)} co-payment${result.withRider.nonPanelPayment ? ` + ${sgd(result.withRider.nonPanelPayment)} non-panel` : ''}` : 'No rider on file'}
            />
            <Stat
              k="Without the rider"
              v={sgd(result.noRider.outOfPocket, { whole: true })}
              n={`${sgd(result.noRider.deductibleApplied)} deductible + ${sgd(result.noRider.coInsurance)} co-insurance`}
              warn
            />
            <Stat
              k="Difference"
              v={result.saving != null ? sgd(result.saving, { whole: true }) : '—'}
              n="What the rider saves you on this single claim"
            />
          </div>

          <div className="card">
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th className="num">With rider</th>
                    <th className="num">Without rider</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Bill</td>
                    <td className="num">{sgd(result.bill)}</td>
                    <td className="num">{sgd(result.bill)}</td>
                  </tr>
                  <tr>
                    <td>Considered by the policy (capped at the {sgd(result.limit, { whole: true })} policy year limit)</td>
                    <td className="num">{sgd(result.noRider.eligible)}</td>
                    <td className="num">{sgd(result.noRider.eligible)}</td>
                  </tr>
                  <tr>
                    <td>Deductible</td>
                    <td className="num">{result.withRider ? sgd(0) : '—'}</td>
                    <td className="num">{sgd(result.noRider.deductibleApplied)}</td>
                  </tr>
                  <tr>
                    <td>Co-insurance ({result.coinsPct}%)</td>
                    <td className="num">{result.withRider ? sgd(0) : '—'}</td>
                    <td className="num">{sgd(result.noRider.coInsurance)}</td>
                  </tr>
                  <tr>
                    <td>Rider co-payment</td>
                    <td className="num">{result.withRider ? sgd(result.withRider.coPayment) : '—'}</td>
                    <td className="num">—</td>
                  </tr>
                  <tr>
                    <td>Non-panel additional payment</td>
                    <td className="num">{result.withRider ? sgd(result.withRider.nonPanelPayment) : '—'}</td>
                    <td className="num">—</td>
                  </tr>
                  <tr>
                    <td>Bill above the policy year limit</td>
                    <td className="num">{sgd(result.noRider.aboveLimit)}</td>
                    <td className="num">{sgd(result.noRider.aboveLimit)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Insurer pays</td>
                    <td className="num">{result.withRider ? sgd(result.withRider.insurerPays) : '—'}</td>
                    <td className="num">{sgd(result.noRider.insurerPays)}</td>
                  </tr>
                  <tr>
                    <td>You pay</td>
                    <td className="num">{result.withRider ? sgd(result.withRider.outOfPocket) : '—'}</td>
                    <td className="num">{sgd(result.noRider.outOfPocket)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="card f medium">
              <h3 className="f-title">Model notes for this scenario</h3>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13.5 }}>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card flat">
            <h3>Where MediShield Life sits in this</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              MediShield Life is a component of the Integrated Shield Plan, not a separate payer you
              claim from on top. Income settles the whole benefit; the MediShield Life share is
              handled inside that. The figures above are therefore the complete picture, not the
              private layer only.
            </p>
            <SourceLinks ids={['MOH_IP_MSL_RELEVANCE', 'HEALTHHUB_IP']} />
          </div>
        </>
      )}
    </>
  )
}

function Actions({ findings }) {
  const ordered = findings.filter((f) => f.severity !== 'info')
  const needsInput = findings.filter((f) => f.needsInput)

  return (
    <>
      <h2>Do these, in this order</h2>
      {ordered.map((f, i) => (
        <div className={`card f ${f.severity}`} key={f.id}>
          <div className="f-head">
            <h3 className="f-title">
              {i + 1}. {f.title}
            </h3>
            <span className={`badge ${f.severity}`}>{f.severity}</span>
          </div>
          <div className="f-row">
            <b>Action</b>
            {f.action}
          </div>
          {f.needsInput && <div className="f-need">You need: {f.needsInput}</div>}
        </div>
      ))}

      <h2>Questions to put to your insurers and adviser</h2>
      <div className="card">
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5 }}>
          <li>Income: has bill reference 69390344077 for {'$4,050.30'} been received, and is policy 93034407 still in force?</li>
          <li>Income: can the MediShield Life portion and the eligible private portion be switched to MediSave deduction, leaving only the rider on cash?</li>
          <li>Income: does my Classic Care Rider stay on its current terms indefinitely, and if it is ever migrated, to what and when?</li>
          <li>The app the "Hospitalisation" screen came from: which company issued that policy, and what is its policy number?</li>
          <li>
            <b>Great Eastern (ask this one first):</b> on the death of the life assured under policy
            0211567996, what is the total amount payable to my beneficiaries — the sum assured of
            $5,408 only, or the sum assured plus the accumulated / surrender / terminal bonus value?
            Please point me to the clause in the policy contract.
          </li>
          <li>Great Eastern: on what date did the payout period begin on policy 0211567996?</li>
          <li>Great Eastern: please send the latest policy illustration showing guaranteed and non-guaranteed values, including the terminal bonus.</li>
          <li>Great Eastern: is there any outstanding policy loan or automatic premium loan on policy 0211567996?</li>
        </ol>
        <p className="tiny" style={{ marginTop: 10, marginBottom: 0 }}>
          These questions are generated from the documents on file. Amounts quoted come from those
          documents.
        </p>
      </div>

      {needsInput.length > 0 && (
        <>
          <h2>Information this analysis is missing</h2>
          <div className="card flat">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
              {needsInput.map((f) => (
                <li key={f.id}>
                  <b>{f.needsInput}</b>
                  <div className="tiny">Blocks: {f.title}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  )
}

function Sources({ state, setState, today }) {
  const docs = SOURCE_LIST.filter((s) => s.kind === 'user-document')
  const official = SOURCE_LIST.filter((s) => s.kind === 'official')

  const reset = () => {
    if (!confirm('Reset every edit and reload the originally transcribed data?')) return
    localStorage.removeItem(STORE_KEY)
    setState(structuredClone(SEED))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hoken-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <h2>Your documents</h2>
      {docs.map((s) => (
        <div className="card flat" key={s.id}>
          <h3>{s.title}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>{s.detail}</p>
          <div className="tiny" style={{ marginTop: 6 }}>Transcribed {s.retrieved}</div>
        </div>
      ))}

      <h2>Official sources</h2>
      {official.map((s) => (
        <div className="card flat" key={s.id}>
          <h3>
            <a className="src-link" href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>
              {s.title}
            </a>
          </h3>
          <p className="muted" style={{ marginBottom: 0 }}>{s.detail}</p>
          <div className="tiny" style={{ marginTop: 6 }}>Retrieved {s.retrieved}</div>
        </div>
      ))}

      <h2>Data and privacy</h2>
      <div className="card">
        <p className="muted">
          Everything you type stays in this browser's localStorage. Nothing is sent anywhere — this
          app has no server and makes no network calls after it loads.
        </p>
        <p className="muted">
          The version shipped in the repository stores your NRIC only in the masked form printed on
          the premium bill, and does not include your residential address or your adviser's phone
          and email. If you add them here, they stay on this device.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={exportJson}>Export my data (JSON)</button>
          <button className="btn danger" onClick={reset}>Reset to the transcribed data</button>
        </div>
      </div>

      <h2>Version history</h2>
      <div className="card flat">
        {CHANGELOG.map((c) => (
          <div key={c.version} style={{ marginBottom: 8 }}>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{c.version}</b>
            <div className="muted">{c.notes}</div>
          </div>
        ))}
      </div>
    </>
  )
}

/* --------------------------------------------------------------------- app */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'gaps', label: 'Gaps & duplication' },
  { key: 'cost', label: 'Cost' },
  { key: 'sim', label: 'Simulator' },
  { key: 'actions', label: 'Actions' },
  { key: 'policies', label: 'Policies' },
  { key: 'sources', label: 'Sources' },
]

export default function App() {
  const [state, setState] = useStored(() => structuredClone(SEED))
  const [tab, setTab] = useState('overview')
  const today = todaySG()

  const findings = useMemo(() => runRules(state, today), [state, today])
  const gaps = useMemo(() => runGapScan(state, COVER_CATEGORIES), [state])

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const actionCount = findings.filter((f) => f.severity !== 'info').length

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-top">
          <h1 className="brand">
            Ho<span>ken</span>
          </h1>
          <div className="ver">{APP_VERSION}</div>
        </div>
        <p className="sub">
          Coverage, payouts and cost — with the gaps, duplication and things worth chasing.
        </p>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'overview' && criticalCount > 0 && <span className="pill">{criticalCount}</span>}
              {t.key === 'actions' && actionCount > 0 && (
                <span className={`pill${criticalCount ? '' : ' mute'}`}>{actionCount}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'overview' && <Overview state={state} findings={findings} gaps={gaps} today={today} />}
        {tab === 'gaps' && <Gaps findings={findings} gaps={gaps} />}
        {tab === 'cost' && <Cost state={state} setState={setState} findings={findings} today={today} />}
        {tab === 'sim' && <Simulator state={state} />}
        {tab === 'actions' && <Actions findings={findings} />}
        {tab === 'policies' && <Policies state={state} setState={setState} />}
        {tab === 'sources' && <Sources state={state} setState={setState} today={today} />}
      </main>

      <footer className="tiny">
        Hoken {APP_VERSION} · Analysis aid only, not financial advice · Data stays on this device
      </footer>
    </div>
  )
}
