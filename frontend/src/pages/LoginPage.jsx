import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  function handleChange(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(credentials);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__hero">
        <p className="eyebrow">Environmental Admin</p>
        <h1>Sign in to the surveillance dashboard.</h1>
        <p>
          Use your admin credentials to review device health, live environmental readings,
          alerts, and storage settings.
        </p>
      </div>
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Admin login</h2>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={credentials.username}
            onChange={handleChange}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={handleChange}
            required
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" className="primary-button" disabled={submitting || loading}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;