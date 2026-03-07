import {BrowserRouter, Route, Routes} from 'react-router';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ConvertPage from './pages/ConvertPage';
import HtmlToPdf from './pages/HtmlToPdf';
import WebToImage from './pages/WebToImage';
import History from './pages/HistoryPage';

import {Toaster} from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <>
      <Toaster richColors/>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path='/signin'
            element={<SignInPage/>}
          />
          <Route
            path='/signup'
            element={<SignUpPage/>}
          />
          <Route
            path='/htmltopdf'
            element={<HtmlToPdf />}
          />
          <Route
            path='/webtoimg'
            element={<WebToImage />}
          />
          <Route
            path='/history'
            element={<History />}
          />
          <Route
            path='/'
            element={<ConvertPage/>}
          />
          <Route element={<ProtectedRoute />}>
          </Route>
        </Routes>
      </BrowserRouter>
    </> 
  )
}

export default App
