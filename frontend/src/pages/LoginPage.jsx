import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  async function handleContinue() {
    await login();
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="login-page">
      <div className="login-page__hero">
        <p className="eyebrow">Environmental Admin</p>
        <h1>Static bearer token access for the surveillance backend.</h1>
        <p>
          The dashboard and mobile clients now use the same fixed admin bearer token for protected
          APIs.
        </p>
      </div>
      <div className="login-card">
        <h2>Admin access</h2>
        <p>
          If the dashboard does not redirect automatically, continue and it will reuse the
          preconfigured bearer token.
        </p>
        <button type="button" className="primary-button" onClick={handleContinue}>
          Continue to dashboard
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
