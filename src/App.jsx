import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isOnboarded, resetSessionStats } from './core/StorageManager.js'

import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Home from './pages/Home.jsx'
import ChatPage from './pages/ChatPage.jsx'
import AnalysisPage from './pages/AnalysisPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AppShell from './components/layout/AppShell.jsx'

const ProtectedRoute = ({ children }) => {
  if (!isOnboarded()) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  useEffect(() => {
    resetSessionStats()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* App (protected) */}
        <Route path="/app" element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          <Route path="chat/:id" element={<ChatPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
