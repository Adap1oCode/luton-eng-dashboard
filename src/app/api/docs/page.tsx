// src/app/api-docs/page.tsx
export default function ApiDocs() {
  return (
    <html>
      <head>
        <title>API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = () => {
                window.ui = SwaggerUIBundle({
                  url: "/openapi.json",
                  dom_id: "#swagger"
                });
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
