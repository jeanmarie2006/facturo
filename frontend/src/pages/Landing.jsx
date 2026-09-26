import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../lib/auth.jsx'
import { InstallButton } from '../lib/pwa.jsx'

const FEATS = [['📝', 'Devis et factures', 'Créez des documents professionnels en quelques clics, avec numérotation automatique et TVA.'], ['📄', 'PDF prêt à envoyer', 'Un PDF soigné avec vos coordonnées, votre IFU et vos mentions de paiement.'], ['📱', 'Paiement en ligne', 'Vos clients règlent via un lien, par MTN MoMo ou Moov Money (simulé dans la démo).'], ['⏰', 'Relances automatiques', 'Les factures en retard sont relancées par e-mail, sans y penser.'], ['📊', 'Tableau de bord', 'Chiffre d’affaires du mois, factures en attente, retards et meilleurs clients.'], ['🌍', 'Multi-devises', 'FCFA, euro ou dollar, avec TVA réglable et export comptable CSV.']]

export default function Landing() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const demo = async () => { setBusy(true); try { await login({ email: 'demo@facturo.bj', password: 'demo1234' }); nav('/app') } finally { setBusy(false) } }
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Logo />
        <nav className="flex items-center gap-2"><InstallButton className="btn-ghost hidden md:inline-flex" label="⬇ Installer" />{user ? <Link to="/app" className="btn-primary">Mon espace</Link> : <><Link to="/connexion" className="btn-ghost hidden sm:inline-flex">Connexion</Link><Link to="/inscription" className="btn-primary">Essai gratuit</Link></>}</nav></header>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-8 lg:grid-cols-2 lg:pt-14">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm">Pour freelances, TPE et PME du Bénin</p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">Facturez en 2 minutes. <span className="text-brand-700">Encaissez plus vite.</span></h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">Devis, factures, paiements et relances au même endroit. Une solution simple et locale, pour vous concentrer sur votre métier.</p>
            <div className="mt-8 flex flex-wrap gap-3"><button className="btn-primary px-6 py-3 text-base" onClick={demo} disabled={busy}>{busy ? 'Ouverture…' : 'Essayer la démo →'}</button><Link to="/inscription" className="btn-ghost px-6 py-3 text-base">Créer mon compte</Link></div>
            <p className="mt-4 text-sm text-slate-500">Gratuit jusqu’à 5 documents par mois · Sans carte bancaire</p>
          </div>
          <div className="relative" aria-hidden="true"><div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-500/25 to-transparent blur-2xl" />
            <div className="card overflow-hidden p-6 shadow-2xl shadow-slate-900/10">
              <div className="flex items-start justify-between"><div><p className="text-2xl font-extrabold tracking-wider text-brand-700">FACTURE</p><p className="text-xs text-slate-400">N° FAC-2026-0021</p></div><span className="badge bg-emerald-100 text-emerald-800">Payée ✓</span></div>
              <div className="mt-5 space-y-2 text-sm">{[['Création de site vitrine (5 pages)', '250 000'], ['Hébergement et maintenance', '60 000'], ['Formation (demi-journée)', '45 000']].map(([a, b]) => <div key={a} className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-600">{a}</span><b>{b} F</b></div>)}</div>
              <div className="mt-4 rounded-xl bg-brand-700 p-4 text-white"><div className="flex justify-between text-sm text-brand-100"><span>Total HT</span><span>355 000 F</span></div><div className="flex justify-between text-sm text-brand-100"><span>TVA 18 %</span><span>63 900 F</span></div><div className="mt-1 flex justify-between text-lg font-extrabold"><span>Total TTC</span><span>418 900 F</span></div></div>
            </div></div>
        </section>
        <section className="mx-auto max-w-6xl px-5 pb-16"><h2 className="text-center text-3xl font-extrabold text-slate-900">Tout pour être payé à temps</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{FEATS.map(([i, t, d]) => <article key={t} className="card p-6 transition hover:-translate-y-1 hover:shadow-lg"><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl">{i}</div><h3 className="font-bold text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></article>)}</div></section>
        <section className="mx-auto max-w-4xl px-5 pb-20"><h2 className="text-center text-3xl font-extrabold text-slate-900">Des tarifs simples</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="card p-7"><h3 className="text-lg font-extrabold">Gratuit</h3><p className="mt-2 text-4xl font-extrabold text-slate-900">0 <span className="text-base font-semibold text-slate-400">FCFA</span></p><ul className="mt-4 space-y-2 text-sm text-slate-600"><li>✓ 5 devis ou factures par mois</li><li>✓ Clients illimités</li><li>✓ PDF et envoi par e-mail</li><li>✓ Tableau de bord</li></ul></article>
            <article className="card p-7 ring-2 ring-brand-500"><h3 className="text-lg font-extrabold">Pro</h3><p className="mt-2 text-4xl font-extrabold text-brand-700">5 000 <span className="text-base font-semibold text-slate-400">FCFA / mois</span></p><ul className="mt-4 space-y-2 text-sm text-slate-600"><li>✓ Documents illimités</li><li>✓ Relances automatiques</li><li>✓ Paiement en ligne Mobile Money</li><li>✓ Export comptable CSV</li></ul></article>
          </div></section>
      </main>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500"><Link to="/installer" className="font-semibold text-brand-700 hover:underline">Installer l’application</Link> · Projet de démonstration · Réalisé par <a className="font-semibold text-brand-700 hover:underline" href="https://sedjame-vianney.vercel.app" target="_blank" rel="noopener">Sedjame Vianney</a></footer>
    </div>
  )
}
