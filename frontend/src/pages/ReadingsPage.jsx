import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../hooks/useAuth";

function createQuery(filters) {
  const params = new URLSearchParams();

  if (filters.nodeId) {
    params.set("nodeId", filters.nodeId);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  if (filters.abnormal) {
    params.set("abnormal", "true");
  }

  params.set("limit", "200");
  return params.toString();
}

function ReadingsPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    userId: "",
    nodeId: "",
    from: "",
    to: "",
    abnormal: false,
  });
  const [query, setQuery] = useState(createQuery(filters));
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/v1/users", { token })
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          setFilters((current) => ({
            ...current,
            userId: current.userId || data[0] || "",
          }));
          setQuery((current) => current);
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

  useEffect(() => {
    if (!filters.userId) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    apiRequest(`/api/v1/users/${filters.userId}/environmental-data?${query}`, { token })
      .then((data) => {
        if (!cancelled) {
          setReadings(data);
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
  }, [filters.userId, query, token]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setQuery(createQuery(filters));
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Readings</p>
          <h2>Historical environmental log</h2>
        </div>
      </header>

      <form className="filter-bar" onSubmit={handleSubmit}>
        <label className="field">
          <span>User</span>
          <select
            value={filters.userId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, userId: event.target.value }))
            }
          >
            {users.map((userId) => (
              <option key={userId} value={userId}>
                {userId}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Node ID</span>
          <input
            type="text"
            value={filters.nodeId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, nodeId: event.target.value }))
            }
            placeholder="Optional node filter"
          />
        </label>
        <label className="field">
          <span>From</span>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(event) =>
              setFilters((current) => ({ ...current, from: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, to: event.target.value }))
            }
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={filters.abnormal}
            onChange={(event) =>
              setFilters((current) => ({ ...current, abnormal: event.target.checked }))
            }
          />
          <span>Only abnormal readings</span>
        </label>
        <button type="submit" className="primary-button">
          Apply filters
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? <Loader label="Loading readings..." /> : null}

      <section className="panel" hidden={loading}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Node</th>
                <th>Temp</th>
                <th>Humidity</th>
                <th>AQI</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id}>
                  <td>{formatDateTime(reading.timestamp)}</td>
                  <td>{reading.userId || filters.userId}</td>
                  <td>{reading.nodeId}</td>
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
    </section>
  );
}

export default ReadingsPage;
