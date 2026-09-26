export function fm(n, devise = 'XOF') {
  const v = Number(n || 0)
  if (devise === 'EUR') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v).replace(/[ ]/g, ' ')
  if (devise === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v)).replace(/[  ]/g, ' ') + ' FCFA'
}
export const STATUTS = {
  brouillon: ['bg-slate-100 text-slate-700', 'Brouillon'], envoyee: ['bg-sky-100 text-sky-800', 'Envoyé'], payee: ['bg-emerald-100 text-emerald-800', 'Payée'],
  en_retard: ['bg-rose-100 text-rose-700', 'En retard'], acceptee: ['bg-emerald-100 text-emerald-800', 'Accepté'], refusee: ['bg-slate-200 text-slate-600', 'Refusé'],
}
export const MODES = { virement: 'Virement', especes: 'Espèces', cheque: 'Chèque', momo: 'MTN MoMo', moov: 'Moov Money' }
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
