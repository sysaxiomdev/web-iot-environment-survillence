import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import ServerTableControls, { SortHeader } from "../components/ServerTableControls";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../hooks/useAuth";

const initialPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  sortBy: "lastSeenAt",
  sortDir: "desc",
  search: "",
};

function createQuery(tableState, search) {
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

function DevicesPage() {
  const { token, logout } = useAuth();
  const [devicesPage, setDevicesPage] = useState(initialPage);
  const [tableState, setTableState] = useState(initialPage);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setTableState((current) => ({ ...current, page: 1 }));
  }, [deferredSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest(`/api/v1/devices?${createQuery(tableState, deferredSearch)}`, { token })
      .then((data) => {
        if (!cancelled) {
          setDevicesPage(data);
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
  }, [deferredSearch, logout, tableState, token]);

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
      page: Math.min(Math.max(1, current.page + direction), devicesPage.totalPages || 1),
    }));
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Devices</p>
          <h2>Node directory</h2>
        </div>
      </header>

      {error ? <div className="form-error">Failed to load devices: {error}</div> : null}

      <section className="panel">
        <div className="panel__header panel__header--stacked">
          <div>
            <p className="eyebrow">MongoDB</p>
            <h3>Devices</h3>
          </div>
          <ServerTableControls
            search={search}
            onSearchChange={setSearch}
            pageSize={tableState.pageSize}
            onPageSizeChange={updatePageSize}
            page={devicesPage.page}
            totalPages={devicesPage.totalPages}
            total={devicesPage.total}
            loading={loading}
            itemLabel="devices"
            searchPlaceholder="Search user, node, name, or location"
            onPreviousPage={() => movePage(-1)}
            onNextPage={() => movePage(1)}
          />
        </div>

        {loading ? <Loader label="Loading devices..." /> : null}

        <div className="table-wrap" hidden={loading}>
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
                  <SortHeader field="name" label="Name" {...tableState} onSort={handleSort} />
                </th>
                <th>
                  <SortHeader field="location" label="Location" {...tableState} onSort={handleSort} />
                </th>
                <th>Status</th>
                <th>
                  <SortHeader field="lastSeenAt" label="Last sync" {...tableState} onSort={handleSort} />
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
              </tr>
            </thead>
            <tbody>
              {devicesPage.items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-cell">No devices found in MongoDB.</td>
                </tr>
              ) : (
                devicesPage.items.map((device) => (
                  <tr key={`${device.userId}-${device.nodeId}`}>
                    <td>{device.userId || "-"}</td>
                    <td>
                      <Link to={`/devices/${device.userId}/${device.nodeId}`}>
                        {device.nodeId}
                      </Link>
                    </td>
                    <td>{device.name || "-"}</td>
                    <td>{device.location || "-"}</td>
                    <td>
                      <StatusPill status={device.status} />
                    </td>
                    <td>{formatDateTime(device.lastSeenAt)}</td>
                    <td>{formatNumber(device.latestReading?.temperature, " C")}</td>
                    <td>{formatNumber(device.latestReading?.humidity, "%")}</td>
                    <td>{formatNumber(device.latestReading?.aqi)}</td>
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

export default DevicesPage;