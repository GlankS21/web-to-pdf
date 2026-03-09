import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ConvertPage from './pages/ConvertPage';
import HtmlToPdf from './pages/HtmlToPdf';
import WebToImage from './pages/WebToImage';
import History from './pages/HistoryPage';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuthStore } from './stores/useAuthStore';

function App() {
  const { refresh } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    refresh().finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path='/signin' element={<SignInPage />} />
          <Route path='/signup' element={<SignUpPage />} />
          <Route path='/htmltopdf' element={<HtmlToPdf />} />
          <Route path='/webtoimg' element={<WebToImage />} />
          <Route path='/history' element={<History />} />
          <Route path='/' element={<ConvertPage />} />
          <Route element={<ProtectedRoute />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App