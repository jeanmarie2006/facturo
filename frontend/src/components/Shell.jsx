import { useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useAuth } from '../lib/auth.jsx'
import { InstallButton } from '../lib/pwa.jsx'
import { Spinner } from '../lib/ui.jsx'

const NAV = [['/app', '📊', 'Tableau de bord', true], ['/app/factures', '🧾', 'Factures'], ['/app/devis', '📝', 'Devis'], ['/app/clients', '👥', 'Clients'], ['/app/emails', '✉️', 'Boîte d’envoi'], ['/app/parametres', '⚙️', 'Paramètres']]

export default function Shell() {
  const { user, ready, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/connexion" replace />
  const link = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
  const Menu = () => (
    <>
      <nav className="flex-1 space-y-1" aria-label="Navigation principale" onClick={() => setOpen(false)}>{NAV.map(([to, i, l, end]) => <NavLink key={to} to={to} end={end} className={link}><span aria-hidden="true">{i}</span>{l}</NavLink>)}</nav>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><b className="block truncate">{user.name}</b><span className="text-xs text-slate-500">{user.email}</span>
        <button className="btn-ghost mt-2 w-full !py-1.5 text-xs" onClick={async () => { await logout(); nav('/') }}>Se déconnecter</button></div>
      <InstallButton className="btn-ghost mt-2 w-full !py-1.5 text-xs" label="⬇ Installer l’application" />
    </>
  )
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex"><div className="mb-6 px-2"><Logo to="/app" /></div><Menu /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden"><button className="btn-ghost !px-3 !py-1.5" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">☰</button><Logo to="/app" /></header>
        {open && <div className="no-print fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}><div className="absolute inset-0 bg-slate-900/40" /><aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4" onClick={(e) => e.stopPropagation()}><div className="mb-6 px-2"><Logo to="/app" /></div><Menu /></aside></div>}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8"><Outlet /></main>
      </div>
    </div>
  )
}
