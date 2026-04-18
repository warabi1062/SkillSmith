import {
  Link,
  Outlet,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";

// SPA レイアウト: <html>/<body> は index.html 側で定義する
export default function Root() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* M3 Top app bar - surface-container */}
      <header className="bg-surface-container-low px-6 py-4 shrink-0">
        <div className="max-w-[1200px] mx-auto w-full flex items-center">
          <h1 className="font-display text-[1.375rem] font-semibold tracking-tight">
            <Link
              to="/"
              className="text-on-surface flex items-center gap-2.5 no-underline hover:no-underline"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <span className="text-on-primary text-sm font-bold">S</span>
              </span>
              SkillSmith
            </Link>
          </h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col">
        <div className="max-w-[1200px] mx-auto w-full flex-1 min-h-0 flex flex-col px-6 py-6">
          <Outlet />
        </div>
      </main>
      <ScrollRestoration />
    </div>
  );
}

// router の errorElement から参照するエラーページ
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface-container-low px-6 py-4 shrink-0">
        <div className="max-w-[1200px] mx-auto w-full flex items-center">
          <h1 className="font-display text-[1.375rem] font-semibold tracking-tight">
            <Link
              to="/"
              className="text-on-surface flex items-center gap-2.5 no-underline hover:no-underline"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <span className="text-on-primary text-sm font-bold">S</span>
              </span>
              SkillSmith
            </Link>
          </h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col">
        <div className="max-w-[1200px] mx-auto w-full flex-1 min-h-0 flex flex-col px-6 py-6">
          <div className="flex flex-col items-center justify-center flex-1 text-center p-12">
            <h2 className="font-display text-2xl font-semibold text-on-surface mb-2">
              {title}
            </h2>
            <p className="text-on-surface-variant mb-6">{message}</p>
            <p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 font-display text-sm font-medium rounded-full bg-primary text-on-primary no-underline hover:shadow-level1 hover:no-underline"
              >
                Back to Home
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
