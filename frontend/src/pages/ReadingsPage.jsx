import { useDeferredValue, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import ServerTableControls, { SortHeader } from "../components/ServerTableControls";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../hooks/useAuth";

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

function createQuery(filters, tableState, search) {
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

  if (search) {
    params.set("search", search);
  }

  params.set("page", tableState.page);
  params.set("pageSize", tableState.pageSize);
  params.set("sortBy", tableState.sortBy);
  params.set("sortDir", tableState.sortDir);
  return params.toString();
}

function ReadingsPage() {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    userId: "",
    nodeId: "",
    from: "",
    to: "",
    abnormal: false,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [tableState, setTableState] = useState(initialTableState);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [readingsPage, setReadingsPage] = useState(initialReadingsPage);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
          setAppliedFilters((current) => ({
            ...current,
            userId: current.userId || data[0] || "",
          }));
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
  }, [logout, token]);

  useEffect(() => {
    setTableState((current) => ({ ...current, page: 1 }));
  }, [deferredSearch]);

  useEffect(() => {
    if (!appliedFilters.userId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setSuccess("");

    apiRequest(
      `/api/v1/users/${appliedFilters.userId}/environmental-data?${createQuery(
        appliedFilters,
        tableState,
        deferredSearch,
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
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, deferredSearch, logout, refreshKey, tableState, token]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setAppliedFilters(filters);
    setTableState((current) => ({ ...current, page: 1 }));
  }

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

  async function handleDelete(reading) {
    const confirmed = window.confirm(
      `Delete reading for ${reading.nodeId} at ${formatDateTime(reading.timestamp)}?`,
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(reading.id);

    try {
      await apiRequest(`/api/v1/admin/readings/${encodeURIComponent(reading.id)}`, {
        method: "DELETE",
        token,
      });
      setSuccess("Reading deleted.");
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      if (requestError.status === 401) {
        logout();
        return;
      }
      setError(requestError.message || "Unable to delete reading.");
    } finally {
      setDeletingId("");
    }
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
      {success ? <div className="form-success">{success}</div> : null}

      <section className="panel">
        <div className="panel__header panel__header--stacked">
          <div>
            <p className="eyebrow">MongoDB</p>
            <h3>Readings</h3>
          </div>
          <ServerTableControls
            search={search}
            onSearchChange={setSearch}
            pageSize={tableState.pageSize}
            onPageSizeChange={updatePageSize}
            page={readingsPage.page}
            totalPages={readingsPage.totalPages}
            total={readingsPage.total}
            loading={loading}
            itemLabel="readings"
            searchPlaceholder="Search user or node"
            onPreviousPage={() => movePage(-1)}
            onNextPage={() => movePage(1)}
          />
        </div>

        {loading ? <Loader label="Loading readings..." /> : null}

        <div className="table-wrap" hidden={loading}>
          <table>
            <thead>
              <tr>
                <th>
                  <SortHeader field="timestamp" label="Timestamp" {...tableState} onSort={handleSort} />
                </th>
                <th>
                  <SortHeader field="userId" label="User" {...tableState} onSort={handleSort} />
                </th>
                <th>
                  <SortHeader field="nodeId" label="Node" {...tableState} onSort={handleSort} />
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
                  <SortHeader field="state" label="State" {...tableState} onSort={handleSort} />
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {readingsPage.items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-cell">No readings found in MongoDB.</td>
                </tr>
              ) : (
                readingsPage.items.map((reading) => (
                  <tr key={reading.id}>
                    <td>{formatDateTime(reading.timestamp)}</td>
                    <td>{reading.userId || appliedFilters.userId}</td>
                    <td>{reading.nodeId}</td>
                    <td>{formatNumber(reading.temperature, " C")}</td>
                    <td>{formatNumber(reading.humidity, "%")}</td>
                    <td>{formatNumber(reading.aqi)}</td>
                    <td>
                      <StatusPill status={reading.isAbnormal ? "alert" : "normal"} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        title="Delete reading"
                        aria-label={`Delete reading ${reading.id}`}
                        disabled={deletingId === reading.id}
                        onClick={() => handleDelete(reading)}
                      >
                        {deletingId === reading.id ? "..." : "x"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default ReadingsPage;