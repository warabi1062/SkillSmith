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
        <div className="px-8 py-6 h-screen flex flex-col max-w-[1400px] mx-auto w-full">
          <header className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle shrink-0">
            <h1 className="font-display text-xl font-bold tracking-tight">
              <Link
                to="/"
                className="text-text-primary flex items-center gap-2 hover:text-accent-teal transition-colors"
              >
                <span className="inline-block w-2 h-2 bg-accent-teal rounded-[2px] rotate-45 shadow-glow-teal" />
                SkillSmith
              </Link>
            </h1>
            <nav className="flex gap-4 items-center">
              <Link
                to="/plugins"
                className="font-display text-sm font-medium text-text-secondary px-4 py-1 rounded-full border border-transparent hover:text-text-primary hover:bg-bg-elevated hover:border-border-subtle tracking-[0.01em] transition-all"
              >
                Plugins
              </Link>
            </nav>
          </header>
          <main className="flex-1 min-h-0 flex flex-col">
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
        <div className="px-8 py-6 h-screen flex flex-col max-w-[1400px] mx-auto w-full">
          <header className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle shrink-0">
            <h1 className="font-display text-xl font-bold tracking-tight">
              <Link
                to="/"
                className="text-text-primary flex items-center gap-2 hover:text-accent-teal transition-colors"
              >
                <span className="inline-block w-2 h-2 bg-accent-teal rounded-[2px] rotate-45 shadow-glow-teal" />
                SkillSmith
              </Link>
            </h1>
            <nav className="flex gap-4 items-center">
              <Link
                to="/plugins"
                className="font-display text-sm font-medium text-text-secondary px-4 py-1 rounded-full border border-transparent hover:text-text-primary hover:bg-bg-elevated hover:border-border-subtle tracking-[0.01em] transition-all"
              >
                Plugins
              </Link>
            </nav>
          </header>
          <main className="flex-1 min-h-0 flex flex-col">
            <div className="flex flex-col items-center justify-center flex-1 text-center p-12">
              <h2 className="font-display text-2xl font-semibold text-text-primary mb-2">
                {title}
              </h2>
              <p className="text-text-secondary mb-4">{message}</p>
              <p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-[1.125rem] py-2 font-display text-sm font-medium rounded-md border border-border-default bg-bg-elevated text-text-primary hover:bg-bg-hover hover:border-border-strong transition-all tracking-[0.01em]"
                >
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
