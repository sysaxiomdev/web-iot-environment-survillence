import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import StatusPill from "../components/StatusPill";
import TrendChart from "../components/TrendChart";
import { useAuth } from "../hooks/useAuth";

function DeviceDetailsPage() {
  const { userId, nodeId } = useParams();
  const { token } = useAuth();
  const [device, setDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    name: "",
    location: "",
    notes: "",
    enabled: true,
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiRequest(`/api/v1/users/${userId}/devices/${nodeId}`, { token }),
      apiRequest(`/api/v1/users/${userId}/environmental-data/${nodeId}/history?limit=30`, { token }),
    ])
      .then(([deviceData, historyData]) => {
        if (!cancelled) {
          setDevice(deviceData);
          setHistory(historyData);
          setForm({
            name: deviceData.name || "",
            location: deviceData.location || "",
            notes: deviceData.notes || "",
            enabled: deviceData.enabled ?? true,
          });
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
  }, [nodeId, token, userId]);

  async function handleSave(event) {
    event.preventDefault();
    setNotice("");
    setError("");

    try {
      const updated = await apiRequest(`/api/v1/users/${userId}/devices/${nodeId}`, {
        method: "PATCH",
        token,
        body: form,
      });
      setDevice(updated);
      setNotice("Device metadata updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (error && !device) {
    return <div className="screen-state">Failed to load device: {error}</div>;
  }

  if (!device) {
    return <Loader label="Loading device..." />;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Device details</p>
          <h2>{device.nodeId}</h2>
          <p className="section-copy">User {device.userId || userId}</p>
        </div>
        <StatusPill status={device.status} />
      </header>

      <div className="summary-grid">
        <SummaryStat label="Last sync" value={formatDateTime(device.lastSeenAt)} />
        <SummaryStat
          label="Latest temperature"
          value={formatNumber(device.latestReading?.temperature, " C")}
        />
        <SummaryStat
          label="Latest humidity"
          value={formatNumber(device.latestReading?.humidity, "%")}
        />
        <SummaryStat label="Latest AQI" value={formatNumber(device.latestReading?.aqi)} />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <h3>Metadata</h3>
          </div>
          <form className="form-grid" onSubmit={handleSave}>
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
              />
            </label>
            <label className="field field--wide">
              <span>Notes</span>
              <textarea
                rows="4"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  setForm((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
              <span>Device enabled</span>
            </label>
            {notice ? <p className="form-success">{notice}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="primary-button">
              Save changes
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h3>Latest reading</h3>
          </div>
          <div className="metric-stack">
            <div>
              <span>Temperature</span>
              <strong>{formatNumber(device.latestReading?.temperature, " C")}</strong>
            </div>
            <div>
              <span>Humidity</span>
              <strong>{formatNumber(device.latestReading?.humidity, "%")}</strong>
            </div>
            <div>
              <span>AQI</span>
              <strong>{formatNumber(device.latestReading?.aqi)}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="chart-grid">
        <TrendChart
          readings={history}
          field="temperature"
          stroke="#ef8354"
          unit=" C"
          title="Temperature"
        />
        <TrendChart
          readings={history}
          field="humidity"
          stroke="#4f7cac"
          unit="%"
          title="Humidity"
        />
        <TrendChart readings={history} field="aqi" stroke="#7d9d52" unit="" title="AQI" />
      </div>
    </section>
  );
}

function SummaryStat({ label, value }) {
  return (
    <article className="summary-card">
      <span className="summary-card__label">{label}</span>
      <strong className="summary-card__value summary-card__value--sand">{value}</strong>
    </article>
  );
}

export default DeviceDetailsPage;
