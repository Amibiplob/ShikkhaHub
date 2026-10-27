import ErrorBoundary from "@/components/shared/ErrorBoundary";
import AppProviders from "@/app/providers/AppProviders";
import AppRoutes from "@/app/router/AppRoutes";

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  );
}
