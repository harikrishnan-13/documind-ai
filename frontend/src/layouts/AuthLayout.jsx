import { BrainCircuit, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-100 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-3 sm:mb-8">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200 sm:p-3">
            <BrainCircuit size={26} />
          </div>

          <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            DocuMind AI
          </span>
        </div>

        {/* Authentication content */}
        {children}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500 sm:mt-8">
          <ShieldCheck size={15} className="shrink-0" />

          <span>Your documents. Your intelligence. Your privacy.</span>
        </div>
      </div>
    </main>
  );
}
