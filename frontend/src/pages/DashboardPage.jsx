import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import StatusPill from "../components/StatusPill";
import SummaryCard from "../components/SummaryCard";
import TrendChart from "../components/TrendChart";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";

function DashboardPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/v1/admin/settings", { token })
      .then((settings) => {
        if (!cancelled) {
          console.info(
            "[Admin Dashboard] STORAGE_PROVIDER:",
            settings.storageProvider,
          );
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.warn(
            "[Admin Dashboard] Unable to read STORAGE_PROVIDER:",
            requestError.message,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/v1/users", { token })
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          setSelectedUserId((current) => current || data[0] || "");
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedUserId) {
      return undefined;
    }

    let cancelled = false;
    setSummary(null);

    apiRequest(`/api/v1/users/${selectedUserId}/dashboard/summary`, { token })
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, token]);

  useEffect(() => {
    if (!selectedAlert) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedAlert(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAlert]);

  const userOptions = useMemo(
    () => users.map((userId) => ({ value: userId, label: userId })),
    [users],
  );

  if (error) {
    return <div className="screen-state">Failed to load dashboard: {error}</div>;
  }

  if (!selectedUserId && users.length === 0) {
    return <div className="screen-state">No users found in Firestore.</div>;
  }

  if (!summary) {
    return <Loader label="Loading dashboard..." />;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Operational snapshot</h2>
          <p className="section-copy">
            Users are the first-level entities. Nodes and readings below are scoped to the selected
            user.
          </p>
        </div>
        <div className="header-actions">
          <label className="field field--compact">
            <span>User</span>
            <select
              className="search-input"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {userOptions.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
            </select>
          </label>
          <Link to="/readings" className="ghost-button">
            View full reading log
          </Link>
        </div>
      </header>

      <div className="summary-grid">
        <SummaryCard label="Total users" value={users.length} accent="sand" />
        <SummaryCard label="User devices" value={summary.totals.devices} accent="sky" />
        <SummaryCard
          label="Active devices"
          value={summary.totals.activeDevices}
          accent="mint"
        />
        <SummaryCard
          label="Abnormal readings"
          value={summary.totals.abnormalReadings}
          accent="ember"
        />
      </div>

      <div className="chart-grid">
        <TrendChart
          readings={summary.recentTrend}
          field="temperature"
          stroke="#ef8354"
          unit=" C"
          title="Temperature trend"
        />
        <TrendChart
          readings={summary.recentTrend}
          field="humidity"
          stroke="#4f7cac"
          unit="%"
          title="Humidity trend"
        />
        <TrendChart
          readings={summary.recentTrend}
          field="aqi"
          stroke="#7d9d52"
          unit=""
          title="AQI trend"
        />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <h3>User and nodes</h3>
            <Link to="/devices" className="text-link">
              All devices
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Node</th>
                  <th>Timestamp</th>
                  <th>Temp</th>
                  <th>Humidity</th>
                  <th>AQI</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.latestReadings.map((reading) => (
                  <tr key={reading.id}>
                    <td>
                      <code>{reading.userId || selectedUserId}</code>
                    </td>
                    <td>
                      <Link to={`/devices/${reading.userId || selectedUserId}/${reading.nodeId}`}>
                        {reading.nodeId}
                      </Link>
                    </td>
                    <td>{formatDateTime(reading.timestamp)}</td>
                    <td>{formatNumber(reading.temperature, " C")}</td>
                    <td>{formatNumber(reading.humidity, "%")}</td>
                    <td>{formatNumber(reading.aqi)}</td>
                    <td>
                      <StatusPill status={reading.isAbnormal ? "alert" : "normal"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h3>Recent alerts</h3>
            <Link to="/alerts" className="text-link">
              Alerts page
            </Link>
          </div>
          <div className="alert-list">
            {summary.alertsPreview.length === 0 ? (
              <div className="empty-state">No abnormal readings detected.</div>
            ) : (
              summary.alertsPreview.map((alert) => (
                <article key={alert.id} className="alert-item">
                  <div className="alert-item__summary">
                    <span className="eyebrow">User {alert.userId || selectedUserId}</span>
                    <strong>{alert.nodeId}</strong>
                    <p>{formatDateTime(alert.timestamp)}</p>
                  </div>
                  <div className="alert-item__metrics">
                    <span>T {formatNumber(alert.temperature, " C")}</span>
                    <span>H {formatNumber(alert.humidity, "%")}</span>
                    <span>AQI {formatNumber(alert.aqi)}</span>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    View details
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {selectedAlert ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedAlert(null)}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-alert-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Recent alert</p>
                <h3 id="recent-alert-title">{selectedAlert.nodeId}</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </button>
            </div>

            <div className="modal-grid">
              <div>
                <span className="eyebrow">User</span>
                <strong>{selectedAlert.userId || selectedUserId}</strong>
              </div>
              <div>
                <span className="eyebrow">Timestamp</span>
                <strong>{formatDateTime(selectedAlert.timestamp)}</strong>
              </div>
              <div>
                <span className="eyebrow">Server time</span>
                <strong>{formatDateTime(selectedAlert.serverTimestamp)}</strong>
              </div>
              <div>
                <span className="eyebrow">Status</span>
                <StatusPill status="alert" />
              </div>
            </div>

            <div className="modal-grid">
              <div>
                <span className="eyebrow">Temperature</span>
                <strong>{formatNumber(selectedAlert.temperature, " C")}</strong>
              </div>
              <div>
                <span className="eyebrow">Humidity</span>
                <strong>{formatNumber(selectedAlert.humidity, "%")}</strong>
              </div>
              <div>
                <span className="eyebrow">AQI</span>
                <strong>{formatNumber(selectedAlert.aqi)}</strong>
              </div>
            </div>

            <div className="modal-panel">
              <p className="eyebrow">Triggered flags</p>
              <div className="modal-tags">
                {Object.entries(selectedAlert.alerts || {})
                  .filter(([, active]) => active)
                  .map(([key]) => (
                    <span key={key} className="status-pill status-pill--alert">
                      {key}
                    </span>
                  ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default DashboardPage;
