import { BrainCircuit, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-slate-100 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-3 sm:mb-8">
          <div className="shrink-0 rounded-xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200 sm:p-3">
            <BrainCircuit size={26} />
          </div>

          <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            DocuMind AI
          </span>
        </div>

        {/* Authentication content */}
        <div className="w-full">{children}</div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 px-2 text-center text-xs text-slate-500 sm:mt-8">
          <ShieldCheck size={15} className="shrink-0" />

          <span>Your documents. Your intelligence. Your privacy.</span>
        </div>
      </div>
    </main>
  );
}
