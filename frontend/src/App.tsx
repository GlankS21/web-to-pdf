import {BrowserRouter, Route, Routes} from 'react-router';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ConvertPage from './pages/ConvertPage';
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
          <Route element={<ProtectedRoute />}>
            <Route
              path='/'
              element={<ConvertPage/>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </> 
  )
}

export default App
