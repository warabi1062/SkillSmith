import {
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import "./app.css";

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="layout">
          <header className="layout-header">
            <h1>
              <Link to="/">SkillSmith</Link>
            </h1>
            <nav>
              <Link to="/plugins">Plugins</Link>
            </nav>
          </header>
          <main>
            <Outlet />
          </main>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let status = 500;
  let title = "Unexpected Error";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = "Not Found";
      message = "The page you are looking for does not exist.";
    } else {
      title = `${status} Error`;
      message = error.statusText || message;
    }
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="layout">
          <header className="layout-header">
            <h1>
              <Link to="/">SkillSmith</Link>
            </h1>
            <nav>
              <Link to="/plugins">Plugins</Link>
            </nav>
          </header>
          <main>
            <div className="error-page">
              <h2>{title}</h2>
              <p>{message}</p>
              <p>
                <Link to="/" className="btn btn-secondary">
                  Back to Home
                </Link>
              </p>
            </div>
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
