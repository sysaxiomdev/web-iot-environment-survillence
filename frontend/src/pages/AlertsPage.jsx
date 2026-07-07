import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";

function AlertsPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/v1/alerts?limit=200", { token })
      .then((data) => {
        if (!cancelled) {
          setAlerts(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return <div className="screen-state">Failed to load alerts: {error}</div>;
  }

  if (loading) {
    return <Loader label="Loading alerts..." />;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Alerts</p>
          <h2>Abnormal environmental events</h2>
        </div>
      </header>
      <section className="panel">
        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="empty-state">No abnormal readings available.</div>
          ) : (
            alerts.map((alert) => (
              <article className="alert-item" key={alert.id}>
                <div>
                  <span className="eyebrow">User {alert.userId || "unknown"}</span>
                  <strong>{alert.nodeId}</strong>
                  <p>{formatDateTime(alert.timestamp)}</p>
                </div>
                <div className="alert-item__metrics">
                  <span>T {formatNumber(alert.temperature, " C")}</span>
                  <span>H {formatNumber(alert.humidity, "%")}</span>
                  <span>AQI {formatNumber(alert.aqi)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

export default AlertsPage;
