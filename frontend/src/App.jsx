import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import Directions from "./pages/Directions.jsx";
import { EmptyState, Skeleton } from "./components/ui.jsx";
import "./App.css";

// Maps and account screens load only when requested.
const Search = lazy(() => import("./pages/Search.jsx"));
const Lines = lazy(() => import("./pages/Lines.jsx"));
const Stations = lazy(() => import("./pages/Stations.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const UserProfile = lazy(() => import("./pages/UserProfile.jsx"));
function LoadingPage() {
  return (
    <div role="status" aria-label="Carregando página" className="page-loading">
      <Skeleton />
      <Skeleton />
      <Skeleton />
      <span className="sr-only">Carregando página…</span>
    </div>
  );
}
function Screen({ children }) {
  return (
    <AppLayout>
      <Suspense fallback={<LoadingPage />}>{children}</Suspense>
    </AppLayout>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/directions" replace />} />
      <Route
        path="/directions"
        element={
          <Screen>
            <Directions />
          </Screen>
        }
      />
      <Route
        path="/search"
        element={
          <Screen>
            <Search />
          </Screen>
        }
      />
      <Route
        path="/lines"
        element={
          <Screen>
            <Lines />
          </Screen>
        }
      />
      <Route
        path="/stations"
        element={
          <Screen>
            <Stations />
          </Screen>
        }
      />
      <Route
        path="/profile"
        element={
          <Screen>
            <UserProfile />
          </Screen>
        }
      />
      <Route
        path="/login"
        element={
          <Suspense fallback={<LoadingPage />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<LoadingPage />}>
            <Register />
          </Suspense>
        }
      />
      <Route
        path="*"
        element={
          <Screen>
            <EmptyState
              icon="map"
              title="Esse caminho ainda não existe"
              description="Volte ao início para encontrar seu próximo destino."
            >
              <Link to="/directions" className="button button-primary">
                Voltar ao início
              </Link>
            </EmptyState>
          </Screen>
        }
      />
    </Routes>
  );
}
