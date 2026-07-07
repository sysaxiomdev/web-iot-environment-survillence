import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";

function SettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/v1/admin/settings", { token })
      .then((data) => {
        if (!cancelled) {
          setSettings(data);
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

  if (error) {
    return <div className="screen-state">Failed to load settings: {error}</div>;
  }

  if (!settings) {
    return <Loader label="Loading settings..." />;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Static admin configuration</h2>
        </div>
      </header>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <h3>Authentication</h3>
          </div>
          <dl className="settings-list">
            <div>
              <dt>Mode</dt>
              <dd>{settings.authMode}</dd>
            </div>
            <div>
              <dt>Admin username</dt>
              <dd>{settings.username}</dd>
            </div>
            <div>
              <dt>Storage provider</dt>
              <dd>{settings.storageProvider}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h3>Alert thresholds</h3>
          </div>
          <dl className="settings-list">
            <div>
              <dt>AQI threshold</dt>
              <dd>{settings.alertThresholds.aqi}</dd>
            </div>
            <div>
              <dt>Temperature high</dt>
              <dd>{settings.alertThresholds.temperatureHigh} C</dd>
            </div>
            <div>
              <dt>Temperature low</dt>
              <dd>{settings.alertThresholds.temperatureLow} C</dd>
            </div>
            <div>
              <dt>Humidity high</dt>
              <dd>{settings.alertThresholds.humidityHigh}%</dd>
            </div>
            <div>
              <dt>Humidity low</dt>
              <dd>{settings.alertThresholds.humidityLow}%</dd>
            </div>
            <div>
              <dt>Active window</dt>
              <dd>{settings.activeDeviceWindowMinutes} minutes</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}

export default SettingsPage;
