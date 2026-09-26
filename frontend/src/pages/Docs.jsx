import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, BASE, api, get, post, put, del } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Empty, Field, Modal, Spinner, dateFr, useLoad, useToast } from '../lib/ui.jsx'
import { MODES, STATUTS, fm, today } from '../lib/fmt.js'
import { Badge } from './Dashboard.jsx'

// ---------- Liste ----------
export function DocList({ type }) {
  const [sp, setSp] = useSearchParams()
  const statut = sp.get('statut') || '', q = sp.get('q') || '', page = Number(sp.get('page') || 1)
  const res = useLoad(() => get('documents', { type, statut, q, page }), [type, statut, q, page])
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n) }
  const chips = type === 'facture' ? [['', 'Toutes'], ['brouillon', 'Brouillons'], ['envoyee', 'Envoyées'], ['en_retard', 'En retard'], ['payee', 'Payées']] : [['', 'Tous'], ['brouillon', 'Brouillons'], ['envoyee', 'Envoyés'], ['acceptee', 'Acceptés'], ['refusee', 'Refusés']]
  const d = res.data
  const nom = type === 'facture' ? 'Factures' : 'Devis'
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold text-slate-900">{nom}</h1>
        <div className="flex gap-2">{type === 'facture' && <a className="btn-ghost" href="#/app/export" onClick={async (e) => { e.preventDefault(); const b = await api('export/csv', { blob: true }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'export-factures.csv'; a.click() }}>⬇ Export CSV</a>}<Link to={`/app/${type === 'facture' ? 'factures' : 'devis'}/nouveau`} className="btn-primary">＋ Nouveau {type}</Link></div></div>
      <div className="mb-4 flex flex-wrap items-center gap-2">{chips.map(([k, l]) => <button key={k} onClick={() => set('statut', k)} aria-pressed={statut === k} className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statut === k ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>)}
        <input className="input ml-auto !w-56" placeholder="Rechercher…" value={q} onChange={(e) => set('q', e.target.value)} aria-label="Rechercher" /></div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead className="bg-slate-50"><tr><th className="th">Numéro</th><th className="th">Client</th><th className="th">Date</th><th className="th">Échéance</th><th className="th text-right">Total TTC</th><th className="th text-right">Statut</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{res.loading && !d ? <tr><td colSpan="6"><Spinner /></td></tr> : d.data.length === 0 ? <tr><td colSpan="6" className="td py-12 text-center text-slate-500">Aucun document.</td></tr> : d.data.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50"><td className="td font-bold"><Link className="text-slate-900 hover:text-brand-700" to={`/app/documents/${r.id}`}>{r.numero}</Link></td><td className="td">{r.client.nom}</td><td className="td text-slate-500">{dateFr(r.date_emission)}</td><td className="td text-slate-500">{dateFr(r.date_echeance)}</td><td className="td text-right font-bold">{fm(r.total_ttc, r.devise)}</td><td className="td text-right"><Badge s={r.statut_effectif} />{r.jours_retard > 0 && <span className="ml-1 text-xs text-rose-600">{r.jours_retard} j</span>}</td></tr>))}</tbody></table></div></div>
      {d && d.last_page > 1 && <div className="mt-4 flex items-center justify-center gap-3"><button className="btn-ghost" disabled={page <= 1} onClick={() => set('page', page - 1)}>←</button><span className="text-sm font-semibold text-slate-500">Page {d.current_page}/{d.last_page}</span><button className="btn-ghost" disabled={page >= d.last_page} onClick={() => set('page', page + 1)}>→</button></div>}
    </div>
  )
}

// ---------- Éditeur ----------
export function DocEditor({ type }) {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const clients = useLoad(() => get('clients'), [])
  const ent = useLoad(() => get('entreprise'), [])
  const existing = useLoad(() => (id ? get(`documents/${id}`) : Promise.resolve(null)), [id])
  const [f, setF] = useState(null)
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const [newClient, setNewClient] = useState(false)

  if (!f && ent.data && (!id || existing.data)) {
    const d = existing.data, e = ent.data
    setF(d ? { client_id: String(d.client_id), date_emission: d.date_emission, date_echeance: d.date_echeance, devise: d.devise, taux_tva: d.taux_tva, notes: d.notes || '', lignes: d.lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire })) }
      : { client_id: '', date_emission: today(), date_echeance: new Date(Date.now() + e.delai_paiement * 86400000).toISOString().slice(0, 10), devise: e.devise, taux_tva: e.tva_defaut, notes: '', lignes: [{ designation: '', quantite: 1, prix_unitaire: 0 }] })
  }
  if (!f) return <Spinner />
  const realType = existing.data?.type || type
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setL = (i, k, v) => setF({ ...f, lignes: f.lignes.map((l, j) => (j === i ? { ...l, [k]: v } : l)) })
  const ht = f.lignes.reduce((s, l) => s + Number(l.quantite || 0) * Number(l.prix_unitaire || 0), 0)
  const tva = Math.round(ht * Number(f.taux_tva || 0)) / 100
  const save = async (send) => {
    setErr({}); setBusy(true)
    try {
      const body = { ...f, type: realType, client_id: Number(f.client_id), taux_tva: Number(f.taux_tva), date_echeance: f.date_echeance || null, lignes: f.lignes.map((l) => ({ ...l, quantite: Number(l.quantite), prix_unitaire: Number(l.prix_unitaire) })) }
      const d = id ? await put(`documents/${id}`, body) : await post('documents', body)
      if (send) await post(`documents/${d.id}/envoyer`)
      toast(send ? 'Document enregistré et envoyé au client.' : 'Brouillon enregistré.')
      nav(`/app/documents/${d.id}`)
    } catch (x) { if (x instanceof ApiError) setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); toast(x.message, 'err') } finally { setBusy(false) }
  }
  return (
    <div className="max-w-4xl">
      <Link to={`/app/${realType === 'facture' ? 'factures' : 'devis'}`} className="text-sm font-semibold text-slate-500 hover:text-brand-700">← {realType === 'facture' ? 'Factures' : 'Devis'}</Link>
      <h1 className="mb-5 mt-2 text-2xl font-extrabold text-slate-900">{id ? `Modifier ${existing.data.numero}` : realType === 'facture' ? 'Nouvelle facture' : 'Nouveau devis'}</h1>
      <div className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="cl">Client</label><div className="flex gap-2"><select id="cl" className="input" value={f.client_id} onChange={set('client_id')}><option value="">Choisir un client…</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select><button type="button" className="btn-ghost shrink-0" onClick={() => setNewClient(true)} aria-label="Nouveau client">＋</button></div>{err.client_id && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{err.client_id}</p>}</div>
          <Field label="Devise"><select className="input" value={f.devise} onChange={set('devise')}><option value="XOF">FCFA (XOF)</option><option value="EUR">Euro (EUR)</option><option value="USD">Dollar (USD)</option></select></Field>
          <Field label="Date d’émission"><input type="date" className="input" value={f.date_emission} onChange={set('date_emission')} /></Field>
          <Field label={realType === 'facture' ? 'Date d’échéance' : 'Valable jusqu’au'} error={err.date_echeance}><input type="date" className="input" value={f.date_echeance} onChange={set('date_echeance')} /></Field>
        </div>
        <div><span className="label">Lignes</span>
          <div className="hidden grid-cols-[1fr_90px_140px_140px_36px] gap-2 px-1 text-xs font-bold uppercase text-slate-400 sm:grid"><span>Désignation</span><span>Qté</span><span>Prix unitaire</span><span className="text-right">Total</span><span /></div>
          <div className="space-y-2">{f.lignes.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-100 p-2 sm:grid-cols-[1fr_90px_140px_140px_36px] sm:items-center sm:border-0 sm:p-0">
              <input className="input" placeholder="Désignation" value={l.designation} onChange={(e) => setL(i, 'designation', e.target.value)} aria-label="Désignation" />
              <input className="input" type="number" min="0" step="0.01" value={l.quantite} onChange={(e) => setL(i, 'quantite', e.target.value)} aria-label="Quantité" />
              <input className="input" type="number" min="0" step="any" value={l.prix_unitaire} onChange={(e) => setL(i, 'prix_unitaire', e.target.value)} aria-label="Prix unitaire" />
              <p className="px-1 text-right text-sm font-bold sm:px-0">{fm(Number(l.quantite || 0) * Number(l.prix_unitaire || 0), f.devise)}</p>
              <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" disabled={f.lignes.length === 1} onClick={() => setF({ ...f, lignes: f.lignes.filter((_, j) => j !== i) })} aria-label="Supprimer la ligne">🗑</button>
            </div>))}</div>
          {err.lignes && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{err.lignes}</p>}
          {Object.entries(err).filter(([k]) => k.startsWith('lignes.')).slice(0, 1).map(([k, v]) => <p key={k} role="alert" className="mt-1 text-xs font-semibold text-rose-600">{v}</p>)}
          <button type="button" className="btn-ghost mt-3 !py-1.5 text-xs" onClick={() => setF({ ...f, lignes: [...f.lignes, { designation: '', quantite: 1, prix_unitaire: 0 }] })}>＋ Ajouter une ligne</button></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_300px]">
          <Field label="Notes (facultatif)" error={err.notes}><textarea className="input min-h-24" value={f.notes} onChange={set('notes')} maxLength={400} placeholder="Conditions, précisions, remerciements…" /></Field>
          <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">TVA (%)</span><input type="number" min="0" max="30" step="0.5" className="input !w-20 !py-1 text-right" value={f.taux_tva} onChange={set('taux_tva')} aria-label="Taux de TVA" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Total HT</span><b>{fm(ht, f.devise)}</b></div><div className="flex justify-between"><span className="text-slate-500">TVA</span><b>{fm(tva, f.devise)}</b></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg"><b>Total TTC</b><b className="text-brand-700">{fm(ht + tva, f.devise)}</b></div></div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button className="btn-primary" disabled={busy} onClick={() => save(true)}>✉ Enregistrer et envoyer</button><button className="btn-ghost" disabled={busy} onClick={() => save(false)}>Enregistrer le brouillon</button></div>
      </div>
      {newClient && <ClientModal onClose={() => setNewClient(false)} onSaved={(c) => { setNewClient(false); clients.reload(); setF({ ...f, client_id: String(c.id) }) }} />}
    </div>
  )
}

// ---------- Vue d'un document ----------
export function DocView() {
  const { id } = useParams()
  const toast = useToast()
  const nav = useNavigate()
  const r = useLoad(() => get(`documents/${id}`), [id])
  const [pay, setPay] = useState(false)
  const [mode, setMode] = useState('virement')
  const [busy, setBusy] = useState(false)
  if (r.loading && !r.data) return <Spinner />
  if (r.error) return <Empty icon="😕" title="Document introuvable"><Link to="/app" className="btn-primary mt-3">Retour</Link></Empty>
  const d = r.data
  const est = d.statut_effectif
  const run = async (fn, ok, after) => { setBusy(true); try { const x = await fn(); toast(ok); after ? after(x) : r.reload() } catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } finally { setBusy(false) } }
  const pdf = async () => { const b = await api(`documents/${d.id}/pdf`, { blob: true }); window.open(URL.createObjectURL(b), '_blank') }
  const lien = `${BASE}#/payer/${d.token}`
  return (
    <div className="max-w-4xl">
      <Link to={`/app/${d.type === 'facture' ? 'factures' : 'devis'}`} className="text-sm font-semibold text-slate-500 hover:text-brand-700">← {d.type === 'facture' ? 'Factures' : 'Devis'}</Link>
      <div className="mb-5 mt-2 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-slate-900">{d.numero} <Badge s={est} /></h1><p className="text-sm text-slate-500">{d.client.nom} · émis le {dateFr(d.date_emission)}{d.jours_retard > 0 && <span className="font-semibold text-rose-600"> · {d.jours_retard} jour(s) de retard</span>}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={pdf}>📄 PDF</button>
          {d.statut === 'brouillon' && <><Link className="btn-ghost" to={`/app/documents/${d.id}/modifier`}>✎ Modifier</Link><button className="btn-primary" disabled={busy} onClick={() => run(() => post(`documents/${d.id}/envoyer`), 'Envoyé au client (e-mail simulé).')}>✉ Envoyer</button></>}
          {d.type === 'facture' && ['envoyee', 'brouillon'].includes(d.statut) && <button className="btn-primary" onClick={() => setPay(true)}>✓ Marquer payée</button>}
          {d.type === 'facture' && est === 'en_retard' && <button className="btn-danger" disabled={busy} onClick={() => run(() => post(`documents/${d.id}/relancer`), 'Relance envoyée au client.')}>⏰ Relancer</button>}
          {d.type === 'devis' && d.statut === 'envoyee' && <><button className="btn-ghost" onClick={() => run(() => post(`documents/${d.id}/decision`, { statut: 'acceptee' }), 'Devis accepté.')}>Accepté</button><button className="btn-ghost" onClick={() => run(() => post(`documents/${d.id}/decision`, { statut: 'refusee' }), 'Devis refusé.')}>Refusé</button></>}
          {d.type === 'devis' && ['envoyee', 'acceptee'].includes(d.statut) && <button className="btn-primary" disabled={busy} onClick={() => run(() => post(`documents/${d.id}/convertir`), 'Facture créée à partir du devis.', (f) => nav(`/app/documents/${f.id}`))}>→ Convertir en facture</button>}
          {d.statut === 'brouillon' && <button className="btn-ghost text-rose-600" onClick={() => confirm('Supprimer ce brouillon ?') && run(() => del(`documents/${d.id}`), 'Brouillon supprimé.', () => nav(-1))}>🗑</button>}
        </div></div>
      {d.statut !== 'brouillon' && <p className="mb-4 break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-600">🔗 Lien client (consultation{d.type === 'facture' ? ' et paiement' : ''}) : <a className="font-semibold text-brand-700 underline" href={lien} target="_blank" rel="noopener">{lien}</a></p>}
      {d.statut === 'payee' && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">✓ Payée le {dateFr(d.payee_le)} — {MODES[d.paiement_mode] || d.paiement_mode} (réf. {d.paiement_ref})</p>}
      <Apercu d={d} />
      {pay && (
        <Modal title="Enregistrer le paiement" onClose={() => setPay(false)}>
          <p className="mb-3 text-sm text-slate-600">Montant reçu : <b>{fm(d.total_ttc, d.devise)}</b></p>
          <Field label="Mode de paiement"><select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setPay(false)}>Annuler</button><button className="btn-primary flex-1" disabled={busy} onClick={() => run(() => post(`documents/${d.id}/payer`, { mode }), 'Paiement enregistré. Un reçu a été envoyé au client.', () => { setPay(false); r.reload() })}>Confirmer</button></div>
        </Modal>
      )}
    </div>
  )
}

export function Apercu({ d }) {
  const e = d.entreprise
  return (
    <article className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-3xl font-extrabold tracking-wider text-brand-700">{d.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p><p className="text-sm text-slate-400">N° {d.numero}</p></div>
        <div className="text-right text-sm text-slate-600"><b className="block text-base text-slate-900">{e.nom}</b>{e.adresse}<br />{e.telephone && <>Tél. {e.telephone}<br /></>}{e.email}{e.ifu && <><br />IFU : {e.ifu}</>}</div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4 text-sm"><p className="text-xs font-bold uppercase text-slate-400">Facturé à</p><b className="text-base text-slate-900">{d.client.nom}</b><p className="text-slate-600">{d.client.adresse}</p></div>
        <div className="rounded-xl border border-slate-200 p-4 text-sm"><p><span className="text-slate-400">Émission :</span> <b>{dateFr(d.date_emission)}</b></p><p><span className="text-slate-400">{d.type === 'facture' ? 'Échéance' : 'Valable jusqu’au'} :</span> <b>{dateFr(d.date_echeance)}</b></p><p><span className="text-slate-400">Devise :</span> <b>{d.devise}</b></p></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-brand-700 text-left text-xs uppercase text-white"><th className="px-3 py-2.5">Désignation</th><th className="px-3 py-2.5 text-right">Qté</th><th className="px-3 py-2.5 text-right">Prix unitaire</th><th className="px-3 py-2.5 text-right">Total HT</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{d.lignes.map((l) => <tr key={l.id}><td className="px-3 py-2.5">{l.designation}</td><td className="px-3 py-2.5 text-right">{l.quantite}</td><td className="px-3 py-2.5 text-right">{fm(l.prix_unitaire, d.devise)}</td><td className="px-3 py-2.5 text-right font-semibold">{fm(l.quantite * l.prix_unitaire, d.devise)}</td></tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><p className="max-w-sm text-sm text-slate-500">{d.notes}</p>
        <dl className="w-full space-y-1 text-sm sm:w-72"><div className="flex justify-between"><dt className="text-slate-500">Total HT</dt><dd>{fm(d.total_ht, d.devise)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">TVA ({d.taux_tva} %)</dt><dd>{fm(d.total_tva, d.devise)}</dd></div><div className="flex justify-between rounded-xl bg-brand-700 px-3 py-2 text-base font-extrabold text-white"><dt>Total TTC</dt><dd>{fm(d.total_ttc, d.devise)}</dd></div></dl></div>
      {e.mentions && <p className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-500">{e.mentions}</p>}
    </article>
  )
}

// ---------- Clients ----------
export function ClientModal({ client, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ nom: client?.nom || '', email: client?.email || '', telephone: client?.telephone || '', adresse: client?.adresse || '', ifu: client?.ifu || '' })
  const [err, setErr] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr({})
    try { const c = client ? await put(`clients/${client.id}`, f) : await post('clients', f); toast('Client enregistré.'); onSaved(c) } catch (x) { if (x instanceof ApiError) setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); toast(x.message, 'err') }
  }
  return (
    <Modal title={client ? 'Modifier le client' : 'Nouveau client'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Nom / raison sociale" error={err.nom}><input className="input" autoFocus value={f.nom} onChange={set('nom')} /></Field>
        <Field label="E-mail" error={err.email}><input type="email" className="input" value={f.email} onChange={set('email')} /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Téléphone"><input className="input" value={f.telephone} onChange={set('telephone')} /></Field><Field label="IFU"><input className="input" value={f.ifu} onChange={set('ifu')} /></Field></div>
        <Field label="Adresse"><input className="input" value={f.adresse} onChange={set('adresse')} /></Field>
        <div className="flex gap-2 pt-1"><button type="button" className="btn-ghost flex-1" onClick={onClose}>Annuler</button><button className="btn-primary flex-1">Enregistrer</button></div>
      </form>
    </Modal>
  )
}

export function Clients() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const c = useLoad(() => get('clients', { q }), [q])
  const [edit, setEdit] = useState(null)
  const suppr = async (x) => { if (!confirm(`Supprimer « ${x.nom} » ?`)) return; try { await del(`clients/${x.id}`); toast('Client supprimé.'); c.reload() } catch (e) { toast(e.message, 'err') } }
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold text-slate-900">Clients</h1><div className="flex gap-2"><input className="input !w-56" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un client" /><button className="btn-primary" onClick={() => setEdit({})}>＋ Nouveau client</button></div></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{c.loading && !c.data ? <Spinner /> : (c.data || []).length === 0 ? <Empty icon="👥" title="Aucun client" /> : c.data.map((x) => (
        <article key={x.id} className="card p-5"><h2 className="font-extrabold text-slate-900">{x.nom}</h2><p className="text-xs text-slate-400">{x.documents_count} document(s)</p>
          <ul className="mt-3 space-y-0.5 text-sm text-slate-600">{x.email && <li>✉ {x.email}</li>}{x.telephone && <li>☎ {x.telephone}</li>}{x.adresse && <li>⌂ {x.adresse}</li>}</ul>
          <div className="mt-4 flex gap-2"><button className="btn-ghost !py-1.5 text-xs" onClick={() => setEdit(x)}>✎ Modifier</button><button className="btn-ghost !py-1.5 text-xs text-rose-600" onClick={() => suppr(x)}>🗑</button></div></article>))}</div>
      {edit && <ClientModal client={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); c.reload() }} />}
    </div>
  )
}
