import { Link } from 'react-router-dom'

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`} aria-label="Facturo — accueil">
      <img src="icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
      <span className="text-lg">Factur<span className={light ? 'text-brand-500' : 'text-brand-700'}>o</span></span>
    </Link>
  )
}
