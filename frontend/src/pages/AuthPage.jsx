import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { ApiError } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Field } from '../lib/ui.jsx'

export default function AuthPage({ mode }) {
  const isReg = mode === 'register'
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', entreprise: '', email: '', password: '' })
  const [err, setErr] = useState({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/app" replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const enter = async (creds) => {
    setErr({}); setMsg(''); setBusy(true)
    try { creds ? await login(creds) : isReg ? await register(f) : await login(f); nav('/app') }
    catch (x) { if (x instanceof ApiError) { setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); setMsg(x.message) } else setMsg('Erreur inattendue.') } finally { setBusy(false) }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md"><div className="mb-6 flex justify-center"><Logo /></div>
        <form onSubmit={(e) => { e.preventDefault(); enter() }} className="card space-y-4 p-7" noValidate>
          <div><h1 className="text-2xl font-extrabold text-slate-900">{isReg ? 'Créer mon compte' : 'Connexion'}</h1><p className="text-sm text-slate-500">{isReg ? 'Gratuit, sans carte bancaire.' : 'Retrouvez vos factures.'}</p></div>
          {msg && !Object.keys(err).length && <div role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{msg}</div>}
          {isReg && <><Field label="Votre nom" error={err.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></Field><Field label="Nom de l’entreprise" error={err.entreprise}><input className="input" value={f.entreprise} onChange={set('entreprise')} placeholder="Ex. Studio Kpanou" /></Field></>}
          <Field label="E-mail" error={err.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Mot de passe" error={err.password} hint={isReg ? '8 caractères minimum' : undefined}><input type="password" className="input" value={f.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} /></Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Patientez…' : isReg ? 'Créer mon compte' : 'Se connecter'}</button>
          {!isReg && <button type="button" className="btn-ghost w-full" disabled={busy} onClick={() => enter({ email: 'demo@facturo.bj', password: 'demo1234' })}>Essayer avec le compte démo</button>}
          <p className="text-center text-sm text-slate-500">{isReg ? <>Déjà inscrit ? <Link className="font-semibold text-brand-700 hover:underline" to="/connexion">Connexion</Link></> : <>Nouveau ? <Link className="font-semibold text-brand-700 hover:underline" to="/inscription">Créer un compte</Link></>}</p>
        </form></div>
    </div>
  )
}
