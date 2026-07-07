import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { formatDateTime, formatNumber } from "../api/format";
import Loader from "../components/Loader";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../hooks/useAuth";

function groupDevicesByUser(users, devices) {
  const devicesByUser = new Map();

  for (const device of devices) {
    const userId = device.userId || "unknown";
    const group = devicesByUser.get(userId) || [];
    group.push(device);
    devicesByUser.set(userId, group);
  }

  const orderedUserIds = Array.from(
    new Set([
      ...users,
      ...Array.from(devicesByUser.keys()),
    ]),
  );

  return orderedUserIds.map((userId) => ({
    userId,
    devices: (devicesByUser.get(userId) || []).sort((left, right) =>
      String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")),
    ),
  }));
}

function DevicesPage() {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiRequest("/api/v1/users", { token }),
      apiRequest("/api/v1/devices", { token }),
    ])
      .then(([users, devices]) => {
        if (!cancelled) {
          setGroups(groupDevicesByUser(users, devices));
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

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      devices: group.devices.filter((device) =>
        `${group.userId} ${device.nodeId} ${device.name || ""} ${device.location || ""}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase()),
      ),
    }))
    .filter((group) => group.devices.length > 0);

  if (error) {
    return <div className="screen-state">Failed to load devices: {error}</div>;
  }

  if (groups.length === 0 && !error) {
    return <Loader label="Loading users and devices..." />;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Devices</p>
          <h2>Node directory</h2>
        </div>
        <input
          className="search-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search node, name, or location"
        />
      </header>

      <section className="panel">
        <div className="user-groups">
          {filteredGroups.map((group) => (
            <section className="user-group" key={group.userId}>
              <div className="panel__header">
                <div>
                  <p className="eyebrow">User</p>
                  <h3>{group.userId}</h3>
                </div>
                <span className="group-count">{group.devices.length} nodes</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Last sync</th>
                      <th>Temp</th>
                      <th>Humidity</th>
                      <th>AQI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.devices.map((device) => (
                      <tr key={`${group.userId}-${device.nodeId}`}>
                        <td>
                          <Link to={`/devices/${group.userId}/${device.nodeId}`}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </section>
    </section>
  );
}

export default DevicesPage;
