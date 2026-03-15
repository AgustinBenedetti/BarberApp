import Link from "next/link";
import { Scissors } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 text-center">
      <Scissors className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
      <h1 className="text-6xl font-extrabold text-amber-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-zinc-100 mb-3">
        Esta barbería no existe
      </h2>
      <p className="text-zinc-400 mb-8 max-w-sm">
        El link que seguiste no corresponde a ninguna barbería registrada en
        BarberSaaS.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors"
      >
        Volver al inicio
      </Link>
      <p className="mt-12 text-zinc-600 text-sm">
        Powered by <span className="text-amber-500/70">BarberSaaS</span>
      </p>
    </div>
  );
}
