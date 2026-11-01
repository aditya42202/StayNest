import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SearchResultsPage from './pages/SearchResultsPage.jsx';
import PropertyDetailsPage from './pages/PropertyDetailsPage.jsx';
import PublicOwnerListingPage from './pages/PublicOwnerListingPage.jsx';
import OAuthSuccessPage from './pages/OAuthSuccessPage.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/property/:id" element={<PropertyDetailsPage />} />
        <Route path="/list-property" element={<PublicOwnerListingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard/*" element={<DashboardPage />} />
        </Route>
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
