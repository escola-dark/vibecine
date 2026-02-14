import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContentProvider } from "@/contexts/ContentContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import MoviesPage from "./pages/Movies";
import SeriesPage from "./pages/Series";
import SearchPage from "./pages/Search";
import FavoritesPage from "./pages/Favorites";
import WatchPage from "./pages/Watch";
import SeriesDetailPage from "./pages/SeriesDetail";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/login";

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Verificando sessão...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ContentProvider>
      <Routes>
        {/* Watch page without sidebar */}
        <Route path="/watch/:id" element={<WatchPage />} />
        {/* All other pages with dashboard layout */}
        <Route path="*" element={
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/series" element={<SeriesPage />} />
              <Route path="/series/:id" element={<SeriesDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </ContentProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;