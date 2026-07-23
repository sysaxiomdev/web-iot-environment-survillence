import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import ServerTableControls, { SortHeader } from "../components/ServerTableControls";
import StatusPill from "../components/StatusPill";
import SummaryCard from "../components/SummaryCard";
import TrendChart from "../components/TrendChart";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";

const initialTableState = {
  page: 1,
  pageSize: 10,
  sortBy: "timestamp",
  sortDir: "desc",
};

const initialReadingsPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  sortBy: "timestamp",
  sortDir: "desc",
  search: "",
};

function createReadingsQuery(tableState, search) {
  const params = new URLSearchParams();
  params.set("page", tableState.page);
  params.set("pageSize", tableState.pageSize);
  params.set("sortBy", tableState.sortBy);
  params.set("sortDir", tableState.sortDir);
  if (search) {
    params.set("search", search);
  }
  return params.toString();
}
function DashboardPage() {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [summary, setSummary] = useState(null);
  const [readingsPage, setReadingsPage] = useState(initialReadingsPage);
  const [tableState, setTableState] = useState(initialTableState);
  const [readingSearch, setReadingSearch] = useState("");
  const deferredReadingSearch = useDeferredValue(readingSearch);
  const [readingsLoading, setReadingsLoading] = useState(false);
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
    setUsersLoading(true);

    apiRequest("/api/v1/users", { token })
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          setSelectedUserId((current) => current || data[0] || "");
        }
      })
      .catch((requestError) => {
        if (!cancelled && requestError.status === 401) {
          logout();
          return;
        }
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setUsersLoading(false);
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
        if (!cancelled && requestError.status === 401) {
          logout();
          return;
        }
        if (!cancelled) {
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [logout, selectedUserId, token]);


  useEffect(() => {
    setTableState((current) => ({ ...current, page: 1 }));
  }, [deferredReadingSearch, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      return undefined;
    }

    let cancelled = false;
    setReadingsLoading(true);

    apiRequest(
      `/api/v1/users/${selectedUserId}/environmental-data?${createReadingsQuery(
        tableState,
        deferredReadingSearch,
      )}`,
      { token },
    )
      .then((data) => {
        if (!cancelled) {
          setReadingsPage(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled && requestError.status === 401) {
          logout();
          return;
        }
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReadingsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredReadingSearch, logout, selectedUserId, tableState, token]);
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
  function handleSort(sortBy) {
    setTableState((current) => ({
      ...current,
      page: 1,
      sortBy,
      sortDir: current.sortBy === sortBy && current.sortDir === "asc" ? "desc" : "asc",
    }));
  }

  function updatePageSize(pageSize) {
    setTableState((current) => ({ ...current, page: 1, pageSize }));
  }

  function movePage(direction) {
    setTableState((current) => ({
      ...current,
      page: Math.min(Math.max(1, current.page + direction), readingsPage.totalPages || 1),
    }));
  }

  if (error) {
    return <div className="screen-state">Failed to load dashboard: {error}</div>;
  }

  if (usersLoading) {
    return <Loader label="Loading dashboard..." />;
  }

  if (!selectedUserId && users.length === 0) {
    return <div className="screen-state">No users found in MongoDB.</div>;
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
          <div className="panel__header panel__header--stacked">
            <div className="panel__header-row">
              <h3>User and nodes</h3>
              <Link to="/devices" className="text-link">
                All devices
              </Link>
            </div>
            <ServerTableControls
              search={readingSearch}
              onSearchChange={setReadingSearch}
              pageSize={tableState.pageSize}
              onPageSizeChange={updatePageSize}
              page={readingsPage.page}
              totalPages={readingsPage.totalPages}
              total={readingsPage.total}
              loading={readingsLoading}
              itemLabel="readings"
              searchPlaceholder="Search node"
              onPreviousPage={() => movePage(-1)}
              onNextPage={() => movePage(1)}
            />
          </div>
          {readingsLoading ? <Loader label="Loading readings..." /> : null}
          <div className="table-wrap" hidden={readingsLoading}>
            <table>
              <thead>
                <tr>
                  <th>
                    <SortHeader field="userId" label="User" {...tableState} onSort={handleSort} />
                  </th>
                  <th>
                    <SortHeader field="nodeId" label="Node" {...tableState} onSort={handleSort} />
                  </th>
                  <th>
                    <SortHeader field="timestamp" label="Timestamp" {...tableState} onSort={handleSort} />
                  </th>
                  <th>
                    <SortHeader field="temperature" label="Temp" {...tableState} onSort={handleSort} />
                  </th>
                  <th>
                    <SortHeader field="humidity" label="Humidity" {...tableState} onSort={handleSort} />
                  </th>
                  <th>
                    <SortHeader field="aqi" label="AQI" {...tableState} onSort={handleSort} />
                  </th>
                  <th>
                    <SortHeader field="state" label="Status" {...tableState} onSort={handleSort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {readingsPage.items.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-cell">No readings found in MongoDB.</td>
                  </tr>
                ) : (
                  readingsPage.items.map((reading) => (
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
                  ))
                )}
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
