import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Shell from './components/Shell.jsx'
import Landing from './pages/Landing.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { Clients, DocEditor, DocList, DocView } from './pages/Docs.jsx'
import { Emails, Parametres, Payer } from './pages/Compte.jsx'
import Installer from './pages/Installer.jsx'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/connexion" element={<AuthPage mode="login" />} />
        <Route path="/inscription" element={<AuthPage mode="register" />} />
        <Route path="/installer" element={<Installer />} />
        <Route path="/payer/:token" element={<Payer />} />
        <Route path="/app" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="factures" element={<DocList type="facture" />} />
          <Route path="devis" element={<DocList type="devis" />} />
          <Route path="factures/nouveau" element={<DocEditor type="facture" />} />
          <Route path="devis/nouveau" element={<DocEditor type="devis" />} />
          <Route path="documents/:id" element={<DocView />} />
          <Route path="documents/:id/modifier" element={<DocEditor />} />
          <Route path="clients" element={<Clients />} />
          <Route path="emails" element={<Emails />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
