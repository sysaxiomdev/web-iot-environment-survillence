import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { createOpenApiSpec } from "../docs/openapi";
import { ADMIN_AUTH_HEADER } from "../constants/auth";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "https://iot-environmental-surveillance-app.onrender.com";

function SwaggerPage() {
  const spec = createOpenApiSpec(apiBaseUrl);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>Swagger UI</h2>
          <p className="section-copy">
            Interactive OpenAPI reference for the deployed backend. Protected requests automatically
            include the fixed admin bearer token.
          </p>
        </div>
      </header>

      <section className="panel swagger-shell">
        <SwaggerUI
          spec={spec}
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          persistAuthorization
          requestInterceptor={(request) => {
            const nextRequest = request;
            nextRequest.headers = {
              ...nextRequest.headers,
              Authorization: ADMIN_AUTH_HEADER,
            };
            return nextRequest;
          }}
        />
      </section>
    </section>
  );
}

export default SwaggerPage;
