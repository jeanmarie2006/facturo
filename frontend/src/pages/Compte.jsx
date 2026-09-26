import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, BASE, get, post, put } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Empty, Field, Modal, Spinner, dateFr, useLoad, useToast } from '../lib/ui.jsx'
import { Apercu } from './Docs.jsx'
import { fm } from '../lib/fmt.js'
import Logo from '../components/Logo.jsx'

export function Emails() {
  const e = useLoad(() => get('emails'), [])
  const [open, setOpen] = useState(null)
  const T = { envoi: ['bg-sky-100 text-sky-800', 'Envoi'], relance: ['bg-rose-100 text-rose-700', 'Relance'], recu: ['bg-emerald-100 text-emerald-800', 'Reçu'] }
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Boîte d’envoi</h1>
      <p className="mb-5 text-sm text-slate-500">E-mails adressés à vos clients (factures, relances, reçus). Dans cette démonstration, ils sont simulés et enregistrés ici et dans le journal du serveur.</p>
      <div className="grid gap-3">{e.loading && !e.data ? <Spinner /> : (e.data || []).length === 0 ? <Empty icon="✉️" title="Aucun e-mail envoyé" /> : e.data.map((m) => (
        <article key={m.id} className="card p-4"><button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}><span className={`badge ${T[m.type][0]}`}>{T[m.type][1]}</span><b className="flex-1 truncate text-slate-900">{m.sujet}</b><span className="hidden text-xs text-slate-400 sm:inline">{m.destinataire}</span><span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString('fr-FR')}</span></button>
          {open === m.id && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm text-slate-700">{m.corps}</pre>}</article>))}</div>
    </div>
  )
}

export function Parametres() {
  const { user } = useAuth()
  const toast = useToast()
  const e = useLoad(() => get('entreprise'), [])
  const [f, setF] = useState(null)
  const [err, setErr] = useState({})
  const [pro, setPro] = useState(false)
  const [pf, setPf] = useState({ mode: 'momo', numero: '' })
  if (e.data && !f) setF({ ...e.data, mentions: e.data.mentions || '', adresse: e.data.adresse || '', telephone: e.data.telephone || '', ifu: e.data.ifu || '' })
  if (!f) return <Spinner />
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value })
  const save = async (ev) => {
    ev.preventDefault(); setErr({})
    try { const r = await put('entreprise', f); setF({ ...r, mentions: r.mentions || '' }); toast('Paramètres enregistrés.') } catch (x) { if (x instanceof ApiError) setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); toast(x.message, 'err') }
  }
  const passerPro = async () => { try { const r = await post('abonnement/pro', pf); setF(r.entreprise); setPro(false); e.reload(); toast(`Plan Pro activé (réf. ${r.reference}).`) } catch (x) { toast(x instanceof ApiError ? x.all() : x.message, 'err') } }
  const est = e.data?.est_pro
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="card grid gap-4 p-6 sm:grid-cols-2" noValidate>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:col-span-2">Paramètres de l’entreprise</h1>
        <Field label="Nom de l’entreprise" error={err.nom} className="sm:col-span-2"><input className="input" value={f.nom} onChange={set('nom')} /></Field>
        <Field label="Adresse" error={err.adresse} className="sm:col-span-2"><input className="input" value={f.adresse} onChange={set('adresse')} /></Field>
        <Field label="Téléphone"><input className="input" value={f.telephone} onChange={set('telephone')} /></Field><Field label="E-mail" error={err.email}><input type="email" className="input" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label="IFU (identifiant fiscal)"><input className="input" value={f.ifu} onChange={set('ifu')} /></Field>
        <Field label="Devise par défaut"><select className="input" value={f.devise} onChange={set('devise')}><option value="XOF">FCFA (XOF)</option><option value="EUR">Euro (EUR)</option><option value="USD">Dollar (USD)</option></select></Field>
        <Field label="TVA par défaut (%)" error={err.tva_defaut}><input type="number" step="0.5" className="input" value={f.tva_defaut} onChange={set('tva_defaut')} /></Field>
        <Field label="Délai de paiement (jours)"><input type="number" className="input" value={f.delai_paiement} onChange={set('delai_paiement')} /></Field>
        <Field label="Mentions de pied de facture" className="sm:col-span-2" hint="Coordonnées de paiement, pénalités de retard, mentions légales…"><textarea className="input min-h-24" value={f.mentions} onChange={set('mentions')} maxLength={300} /></Field>
        <div className="sm:col-span-2"><button className="btn-primary">Enregistrer</button></div>
      </form>
      <aside className="card self-start p-6"><h2 className="font-extrabold text-slate-900">Votre abonnement</h2>
        <p className={`mt-3 inline-block badge ${est ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>{est ? 'Plan Pro' : 'Plan gratuit'}</p>
        {est ? <><p className="mt-3 text-sm text-slate-600">Documents illimités, relances automatiques. Actif jusqu’au {dateFr(e.data.plan_expire_le)}.</p><button className="btn-ghost mt-4 text-xs" onClick={async () => { await post('abonnement/gratuit'); e.reload(); setF(null); toast('Retour au plan gratuit.') }}>Repasser au plan gratuit</button></>
          : <><p className="mt-3 text-sm text-slate-600">5 documents par mois. Passez au Pro pour un usage illimité.</p><p className="mt-3 text-3xl font-extrabold text-brand-700">5 000 <span className="text-sm font-semibold text-slate-400">FCFA / mois</span></p><button className="btn-primary mt-4 w-full" onClick={() => setPro(true)}>Passer au Pro</button></>}
        <p className="mt-4 text-xs text-slate-400">Connecté : {user.email}</p></aside>
      {pro && (
        <Modal title="Passer au plan Pro — 5 000 FCFA" onClose={() => setPro(false)}>
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Simulation : aucun argent réel n’est débité.</p>
          <div className="mb-4 grid grid-cols-2 gap-2">{[['momo', 'MTN MoMo', '#facc15'], ['moov', 'Moov Money', '#2563eb']].map(([v, l, c]) => <button key={v} type="button" onClick={() => setPf({ ...pf, mode: v })} aria-pressed={pf.mode === v} className={`rounded-xl border-2 p-3 text-sm font-bold ${pf.mode === v ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}><span className="mr-1.5 inline-block h-3 w-3 rounded-full" style={{ background: c }} />{l}</button>)}</div>
          <Field label="Numéro Mobile Money"><input className="input" value={pf.numero} onChange={(ev) => setPf({ ...pf, numero: ev.target.value })} placeholder="+229 01 …" autoFocus /></Field>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setPro(false)}>Annuler</button><button className="btn-primary flex-1" disabled={pf.numero.length < 8} onClick={passerPro}>Payer 5 000 FCFA</button></div>
        </Modal>
      )}
    </div>
  )
}

/** Page publique envoyée au client : consultation et paiement en ligne (Mobile Money simulé). */
export function Payer() {
  const { token } = useParams()
  const toast = useToast()
  const r = useLoad(() => get(`public/${token}`), [token])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ mode: 'momo', numero: '' })
  const [done, setDone] = useState(null)
  if (r.loading && !r.data) return <Spinner />
  if (r.error) return <div className="grid min-h-screen place-items-center px-4"><Empty icon="🔒" title="Lien invalide ou expiré">Ce document n’existe pas ou n’est plus disponible.</Empty></div>
  const d = r.data
  const payee = d.statut === 'payee' || done
  const payer = async () => { try { const x = await post(`public/${token}/payer`, f); setDone(x.reference); setOpen(false); r.reload(); toast('Paiement reçu. Merci !') } catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } }
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between"><Logo /><a className="btn-ghost !py-2" href={`${BASE}api/public/${token}/pdf`} target="_blank" rel="noopener">📄 Télécharger le PDF</a></div>
        {payee ? <p className="mb-4 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">✓ Cette facture est payée{d.payee_le ? ` (le ${dateFr(d.payee_le)})` : ''}. Merci !</p>
          : d.type === 'facture' ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-700 p-5 text-white"><div><p className="text-sm text-brand-100">Montant à régler</p><p className="text-3xl font-extrabold">{fm(d.total_ttc, d.devise)}</p></div><button className="btn-ghost !border-white !bg-white !text-brand-700" onClick={() => setOpen(true)}>💳 Payer en ligne</button></div>
          : <p className="mb-4 rounded-xl bg-sky-50 p-4 font-semibold text-sky-800">Devis {d.statut === 'acceptee' ? 'accepté' : d.statut === 'refusee' ? 'refusé' : 'en attente de votre réponse'} — contactez {d.entreprise.nom} pour l’accepter.</p>}
        <Apercu d={d} />
        <p className="mt-4 text-center text-xs text-slate-400">Facture émise avec Facturo — projet de démonstration.</p>
      </div>
      {open && (
        <Modal title={`Payer ${fm(d.total_ttc, d.devise)}`} onClose={() => setOpen(false)}>
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Simulation : aucun argent réel n’est débité.</p>
          <div className="mb-4 grid grid-cols-2 gap-2">{[['momo', 'MTN MoMo', '#facc15'], ['moov', 'Moov Money', '#2563eb']].map(([v, l, c]) => <button key={v} type="button" onClick={() => setF({ ...f, mode: v })} aria-pressed={f.mode === v} className={`rounded-xl border-2 p-3 text-sm font-bold ${f.mode === v ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}><span className="mr-1.5 inline-block h-3 w-3 rounded-full" style={{ background: c }} />{l}</button>)}</div>
          <Field label="Numéro Mobile Money"><input className="input" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} placeholder="+229 01 …" autoFocus /></Field>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setOpen(false)}>Annuler</button><button className="btn-primary flex-1" disabled={f.numero.length < 8} onClick={payer}>Payer</button></div>
        </Modal>
      )}
    </div>
  )
}
