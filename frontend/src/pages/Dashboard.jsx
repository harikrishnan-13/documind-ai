import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  BrainCircuit,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  UserRound,
  Sparkles,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();

  const { accessToken, refreshToken, logout, setUser, user } = useAuth();

  const [profile, setProfile] = useState(user);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/profile/", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        setProfile(response.data);
        setUser(response.data);
      } catch {
        setError("Unable to load your profile. Please sign in again.");
      }
    };

    fetchProfile();
  }, [accessToken, setUser]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post(
          "/auth/logout/",
          {
            refresh: refreshToken,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
      }
    } catch (err) {
      console.error("Server logout failed:", err);
    } finally {
      logout();
      navigate("/", { replace: true });
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UserRound size={17} />

              <span className="max-w-48 truncate">
                {profile?.email || "Loading profile..."}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="mb-4 flex items-center gap-2 break-all text-sm text-slate-600">
              <UserRound size={17} className="shrink-0" />

              {profile?.email || "Loading profile..."}
            </div>

            <button
              onClick={() => {
                closeMobileMenu();
                handleLogout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <LogOut size={17} />
              Logout
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

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Welcome back
                {profile?.first_name ? `, ${profile.first_name}` : ""}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Organize your documents, explore information and get intelligent
                answers with DocuMind AI.
              </p>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
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

          {/* AI assistant */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:col-span-2 sm:p-7 lg:col-span-1">
            <div className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <BrainCircuit size={26} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              AI Assistant
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Explore intelligent document analysis and AI-powered assistance.
            </p>

            <span className="mt-5 inline-block text-sm font-semibold text-emerald-600">
              Coming soon
            </span>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 sm:mt-16">
          DocuMind AI · Intelligent Document Assistant
        </footer>
      </main>
    </div>
  );
}
