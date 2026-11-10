import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  BrainCircuit,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  UserRound,
  Sparkles,
  Bot,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();

  const { accessToken, refreshToken, logout, setUser, user } = useAuth();

  const [profile, setProfile] = useState(user);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch authenticated user profile.
  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await api.get("/auth/profile/");

        if (isMounted) {
          setProfile(response.data);
          setUser(response.data);
        }
      } catch (err) {
        console.error("Profile loading failed:", err);

        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              "Unable to load your profile. Please try again.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, setUser]);

  // Logout user.
  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setMobileMenuOpen(false);

    try {
      if (refreshToken) {
        await api.post("/auth/logout/", {
          refresh: refreshToken,
        });
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      logout();
      navigate("/", { replace: true });
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="shrink-0 rounded-lg bg-blue-600 p-2 text-white">
              <BrainCircuit size={22} />
            </div>

            <span className="truncate text-lg font-bold text-slate-900 sm:text-xl">
              DocuMind AI
            </span>
          </div>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-5 md:flex">
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
              <UserRound size={17} className="shrink-0" />

              <span className="max-w-48 truncate">
                {profile?.email || "Loading profile..."}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingOut ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}

              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="shrink-0 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="mb-4 flex items-start gap-2 break-all text-sm text-slate-600">
              <UserRound size={17} className="mt-0.5 shrink-0" />

              <span>{profile?.email || "Loading profile..."}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <LogOut size={17} />
              )}

              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* Welcome section */}
        <section className="mb-8 sm:mb-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <Sparkles size={16} />
                Your AI-powered workspace
              </div>

              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Welcome back
                {profile?.first_name ? `, ${profile.first_name}` : ""}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Organize your documents, explore information and get intelligent
                answers with DocuMind AI.
              </p>
            </div>
          </div>

          {/* Profile loading */}
          {isLoading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle size={16} className="animate-spin" />
              Loading your profile...
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {/* Documents */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
              <FileText size={26} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              My Documents
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upload, organize and manage your PDF and DOCX documents.
            </p>

            <span className="mt-5 inline-block text-sm font-semibold text-blue-600">
              Coming soon
            </span>
          </div>

          {/* Conversations */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div className="inline-flex rounded-xl bg-purple-50 p-3 text-purple-600">
              <MessageSquare size={26} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              AI Conversations
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ask questions about your documents and receive context-aware
              answers.
            </p>

            <span className="mt-5 inline-block text-sm font-semibold text-purple-600">
              Coming soon
            </span>
          </div>

          {/* AI Assistant */}
          <Link
            to="/ai-chat"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg sm:p-7"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
              <Bot size={24} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">AI Assistant</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chat with DocuMind AI and get intelligent answers powered by
              OpenAI.
            </p>

            <div className="mt-5 text-sm font-semibold text-indigo-600">
              Start chatting →
            </div>
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 sm:mt-16">
          DocuMind AI · Intelligent Document Assistant
        </footer>
      </main>
    </div>
  );
}
