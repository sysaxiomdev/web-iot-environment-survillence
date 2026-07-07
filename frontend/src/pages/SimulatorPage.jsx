import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../hooks/useAuth";

function nowLocalInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function groupDevices(users, devices) {
  const userIds = new Set(users);
  for (const device of devices) {
    if (device.userId) {
      userIds.add(device.userId);
    }
  }
  return Array.from(userIds).sort();
}

const initialForm = {
  type: "environmental_reading",
  userId: "",
  nodeId: "",
  temperature: "",
  humidity: "",
  aqi: "",
  timestamp: nowLocalInputValue(),
};

function SimulatorPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdReading, setCreatedReading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiRequest("/api/v1/users", { token }),
      apiRequest("/api/v1/devices", { token }),
    ])
      .then(([userList, deviceList]) => {
        if (cancelled) {
          return;
        }
        setUsers(userList);
        setDevices(deviceList);
        const firstDevice = deviceList[0];
        setForm((current) => ({
          ...current,
          userId: firstDevice?.userId || userList[0] || "",
          nodeId: firstDevice?.nodeId || "",
        }));
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

  const userOptions = useMemo(() => groupDevices(users, devices), [users, devices]);
  const filteredDevices = useMemo(
    () => devices.filter((device) => !form.userId || device.userId === form.userId),
    [devices, form.userId],
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleUserChange(value) {
    const nextDevice = devices.find((device) => device.userId === value);
    setForm((current) => ({
      ...current,
      userId: value,
      nodeId: nextDevice?.nodeId || current.nodeId,
    }));
  }

  function handleDeviceChange(value) {
    const selectedDevice = devices.find(
      (device) => `${device.userId || ""}::${device.nodeId}` === value,
    );
    if (!selectedDevice) {
      return;
    }
    setForm((current) => ({
      ...current,
      userId: selectedDevice.userId || current.userId,
      nodeId: selectedDevice.nodeId,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCreatedReading(null);
    setSubmitting(true);

    try {
      const payload = {
        userId: form.userId.trim(),
        nodeId: form.nodeId.trim(),
        temperature: Number(form.temperature),
        humidity: Number(form.humidity),
        aqi: Number(form.aqi),
        timestamp: form.timestamp ? new Date(form.timestamp).toISOString() : undefined,
      };
      const result = await apiRequest("/api/v1/admin/simulator/readings", {
        method: "POST",
        token,
        body: payload,
      });
      setCreatedReading(result.reading);
      setSuccess(result.duplicate ? "Existing reading updated." : "Simulated reading inserted.");
      setForm((current) => ({
        ...current,
        temperature: "",
        humidity: "",
        aqi: "",
        timestamp: nowLocalInputValue(),
      }));
    } catch (requestError) {
      setError(requestError.message || "Unable to insert simulated reading.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loader label="Loading simulator controls..." />;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Simulator</p>
          <h2>Manual data feed</h2>
        </div>
      </header>

      <section className="content-grid">
        <form className="panel form-grid" onSubmit={handleSubmit}>
          <label className="field field--wide">
            <span>Type</span>
            <select value={form.type} onChange={(event) => updateForm("type", event.target.value)}>
              <option value="environmental_reading">Environmental reading</option>
            </select>
          </label>

          <label className="field">
            <span>User</span>
            <select value={form.userId} onChange={(event) => handleUserChange(event.target.value)} required>
              <option value="">Select user</option>
              {userOptions.map((userId) => (
                <option key={userId} value={userId}>{userId}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Device</span>
            <select
              value={`${form.userId}::${form.nodeId}`}
              onChange={(event) => handleDeviceChange(event.target.value)}
            >
              <option value={`${form.userId}::${form.nodeId}`}>Select device</option>
              {filteredDevices.map((device) => (
                <option key={`${device.userId}-${device.nodeId}`} value={`${device.userId || ""}::${device.nodeId}`}>
                  {device.nodeId}{device.name ? ` - ${device.name}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Node</span>
            <input
              type="text"
              value={form.nodeId}
              onChange={(event) => updateForm("nodeId", event.target.value)}
              placeholder="node_1"
              required
            />
          </label>

          <label className="field">
            <span>Timestamp</span>
            <input
              type="datetime-local"
              value={form.timestamp}
              onChange={(event) => updateForm("timestamp", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Temperature</span>
            <input
              type="number"
              step="0.1"
              min="-50"
              max="100"
              value={form.temperature}
              onChange={(event) => updateForm("temperature", event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Humidity</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.humidity}
              onChange={(event) => updateForm("humidity", event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>AQI</span>
            <input
              type="number"
              step="1"
              min="0"
              max="500"
              value={form.aqi}
              onChange={(event) => updateForm("aqi", event.target.value)}
              required
            />
          </label>

          <div className="form-actions field--wide">
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Inserting..." : "Insert reading"}
            </button>
          </div>

          {error ? <div className="form-error field--wide">{error}</div> : null}
          {success ? <div className="form-success field--wide">{success}</div> : null}
        </form>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Preview</p>
              <h3>Latest simulated entry</h3>
            </div>
          </div>
          {createdReading ? (
            <div className="simulator-preview">
              <div>
                <span>User</span>
                <strong>{createdReading.userId || "global"}</strong>
              </div>
              <div>
                <span>Node</span>
                <strong>{createdReading.nodeId}</strong>
              </div>
              <div>
                <span>Temperature</span>
                <strong>{formatNumber(createdReading.temperature, " C")}</strong>
              </div>
              <div>
                <span>Humidity</span>
                <strong>{formatNumber(createdReading.humidity, "%")}</strong>
              </div>
              <div>
                <span>AQI</span>
                <strong>{formatNumber(createdReading.aqi)}</strong>
              </div>
              <div>
                <span>Timestamp</span>
                <strong>{formatDateTime(createdReading.timestamp)}</strong>
              </div>
              <div>
                <span>State</span>
                <StatusPill status={createdReading.isAbnormal ? "alert" : "normal"} />
              </div>
            </div>
          ) : (
            <div className="screen-state screen-state--compact">No simulated entry inserted yet.</div>
          )}
        </section>
      </section>
    </section>
  );
}

export default SimulatorPage;
