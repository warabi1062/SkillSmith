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
        <div className="px-6 py-8 md:px-8 h-screen flex flex-col max-w-[1400px] mx-auto w-full">
          <header className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)] shrink-0">
            <h1 className="font-heading text-xl font-bold tracking-tight">
              <Link to="/" className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--accent-teal)] transition-colors no-underline">
                <span className="inline-block w-2 h-2 bg-[var(--accent-teal)] rounded-[2px] rotate-45 shadow-[0_0_20px_rgba(10,158,128,0.1)]" />
                SkillSmith
              </Link>
            </h1>
            <nav className="flex gap-4 items-center">
              <Link to="/plugins" className="font-heading text-[0.8125rem] font-medium text-muted-foreground px-4 py-1 rounded-full border border-transparent hover:text-foreground hover:bg-[var(--bg-elevated)] hover:border-[var(--border-subtle)] transition-colors tracking-[0.01em] no-underline">Plugins</Link>
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
        <div className="px-6 py-8 md:px-8 h-screen flex flex-col max-w-[1400px] mx-auto w-full">
          <header className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)] shrink-0">
            <h1 className="font-heading text-xl font-bold tracking-tight">
              <Link to="/" className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--accent-teal)] transition-colors no-underline">
                <span className="inline-block w-2 h-2 bg-[var(--accent-teal)] rounded-[2px] rotate-45 shadow-[0_0_20px_rgba(10,158,128,0.1)]" />
                SkillSmith
              </Link>
            </h1>
            <nav className="flex gap-4 items-center">
              <Link to="/plugins" className="font-heading text-[0.8125rem] font-medium text-muted-foreground px-4 py-1 rounded-full border border-transparent hover:text-foreground hover:bg-[var(--bg-elevated)] hover:border-[var(--border-subtle)] transition-colors tracking-[0.01em] no-underline">Plugins</Link>
            </nav>
          </header>
          <main className="flex-1 min-h-0 flex flex-col">
            <div className="flex flex-col items-center justify-center flex-1 text-center p-12 animate-[fadeInUp_0.4s_ease-out]">
              <h2 className="font-heading text-2xl font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
              <p className="text-[var(--text-secondary)] mb-4">{message}</p>
              <p>
                <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 font-heading text-[0.8125rem] font-medium rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors no-underline">Back to Home</Link>
              </p>
            </div>
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
