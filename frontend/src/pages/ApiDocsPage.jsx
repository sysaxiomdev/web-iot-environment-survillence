import { apiDocSections } from "../docs/apiDocs";
import { ADMIN_AUTH_HEADER } from "../constants/auth";

function ApiDocsPage() {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>API documentation</h2>
          <p className="section-copy">
            Internal API reference for the admin panel, ingestion endpoints, and the user-first
            Firestore structure.
          </p>
        </div>
      </header>

      <section className="docs-callout">
        <div>
          <p className="eyebrow">Auth flow</p>
          <strong>1. Send the fixed admin bearer token</strong>
          <p>
            <code>{`Authorization: ${ADMIN_AUTH_HEADER}`}</code>
          </p>
        </div>
        <div>
          <p className="eyebrow">Ingestion flow</p>
          <strong>Preferred legacy-compatible endpoint</strong>
          <p>`POST /api/v1/users/{`{userId}`}/environmental-data/{`{nodeId}`}`</p>
        </div>
      </section>

      <div className="docs-grid">
        {apiDocSections.map((section) => (
          <article className="panel docs-panel" key={section.title}>
            <div className="panel__header">
              <div>
                <p className="eyebrow">Section</p>
                <h3>{section.title}</h3>
              </div>
            </div>
            <p className="section-copy">{section.description}</p>
            <div className="docs-endpoint-list">
              {section.endpoints.map((endpoint) => (
                <div className="docs-endpoint" key={`${endpoint.method}-${endpoint.path}`}>
                  <div className="docs-endpoint__top">
                    <span className={`docs-method docs-method--${endpoint.method.toLowerCase()}`}>
                      {endpoint.method}
                    </span>
                    <code>{endpoint.path}</code>
                  </div>
                  <p>{endpoint.summary}</p>
                  <span className="docs-auth">{endpoint.auth}</span>
                  {endpoint.body ? (
                    <pre className="docs-code">
                      <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ApiDocsPage;
