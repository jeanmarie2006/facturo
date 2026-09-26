import { Link } from 'react-router-dom'
import { get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Spinner, dateFr, useLoad, useToast } from '../lib/ui.jsx'
import { STATUTS, fm } from '../lib/fmt.js'

const MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']

export function Badge({ s }) {
  const [c, l] = STATUTS[s] || ['bg-slate-100', s]
  return <span className={`badge ${c}`}>{l}</span>
}

export default function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const d = useLoad(() => get('dashboard'), [])
  if (d.loading && !d.data) return <Spinner />
  const x = d.data
  const max = Math.max(1, ...x.evolution.map((m) => m.total))
  const relancer = async () => { try { const r = await post('relances'); toast(`${r.relances} relance(s) envoyée(s).`); d.reload() } catch (e) { toast(e.message, 'err') } }
  const Kpi = ({ l, v, sub, t = 'text-slate-900', to }) => { const C = to ? Link : 'div'; return <C to={to} className="card block p-5 transition hover:shadow-md"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{l}</p><p className={`mt-1 text-2xl font-extrabold ${t}`}>{v}</p><p className="text-xs text-slate-500">{sub}</p></C> }
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Bonjour {user.name.split(' ')[0]} 👋</h1><p className="text-sm text-slate-500">Voici l’activité de votre entreprise.</p></div>
        <div className="flex gap-2"><Link to="/app/devis/nouveau" className="btn-ghost">＋ Devis</Link><Link to="/app/factures/nouveau" className="btn-primary">＋ Facture</Link></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi l="Chiffre d’affaires du mois" v={fm(x.ca_mois, x.devise)} t="text-brand-700" sub={`${x.nb_payees_mois} facture(s) encaissée(s)`} />
        <Kpi l="En attente de paiement" v={fm(x.en_attente, x.devise)} sub={`${x.nb_attente} facture(s) dans les délais`} to="/app/factures?statut=envoyee" />
        <Kpi l="En retard" v={fm(x.en_retard, x.devise)} t={x.nb_retard ? 'text-rose-600' : 'text-slate-900'} sub={`${x.nb_retard} facture(s) échue(s)`} to="/app/factures?statut=en_retard" />
        <Kpi l="Devis en cours" v={x.devis_ouverts} sub={`${x.brouillons} brouillon(s)`} to="/app/devis?statut=envoyee" />
      </div>
      {x.nb_retard > 0 && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-800">⚠ {x.nb_retard} facture(s) en retard pour {fm(x.en_retard, x.devise)}. Relancez vos clients par e-mail en un clic.</p><button className="btn-danger !py-2" onClick={relancer}>Relancer les impayés</button></div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2" aria-labelledby="ev"><h2 id="ev" className="font-extrabold text-slate-900">Encaissements des 6 derniers mois</h2>
          <div className="mt-6 flex gap-3" role="img" aria-label="Histogramme des encaissements par mois">{x.evolution.map((m) => (
            <div key={m.mois} className="flex flex-1 flex-col items-center gap-1.5"><span className="h-4 text-[11px] font-bold text-slate-600">{m.total ? `${Math.round(m.total / 1000)} k` : ''}</span>
              <div className="flex h-40 w-full items-end"><div className="w-full rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-500" style={{ height: `${Math.max(m.total ? 4 : 1, (m.total / max) * 100)}%`, opacity: m.total ? 1 : 0.25 }} /></div><span className="text-xs text-slate-500">{MOIS[Number(m.mois.slice(5)) - 1]}</span></div>))}</div></section>
        <section className="card p-6"><h2 className="font-extrabold text-slate-900">🏆 Meilleurs clients</h2><ol className="mt-4 space-y-3">{x.top_clients.map((c, i) => <li key={c.client} className="flex items-center gap-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span><span className="flex-1 truncate font-semibold">{c.client}</span><b>{fm(c.total, x.devise)}</b></li>)}</ol></section>
      </div>
      <section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between p-5 pb-3"><h2 className="font-extrabold text-slate-900">Derniers documents</h2><Link to="/app/factures" className="text-sm font-bold text-brand-700 hover:underline">Tout voir →</Link></div>
        <div className="overflow-x-auto"><table className="w-full"><tbody className="divide-y divide-slate-100">{x.recents.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50"><td className="td font-semibold"><Link className="hover:text-brand-700" to={`/app/documents/${r.id}`}>{r.numero}</Link></td><td className="td text-slate-500">{r.client.nom}</td><td className="td text-slate-400">{dateFr(r.date_emission)}</td><td className="td text-right font-bold">{fm(r.total_ttc, r.devise)}</td><td className="td text-right"><Badge s={r.statut_effectif} /></td></tr>))}</tbody></table></div></section>
      {x.usage.limite && <p className="mt-4 text-center text-xs text-slate-400">Plan gratuit : {x.usage.documents_ce_mois} / {x.usage.limite} documents ce mois-ci. <Link to="/app/parametres" className="font-semibold text-brand-700 underline">Passer au Pro</Link></p>}
    </div>
  )
}
