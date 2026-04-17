import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#edf8fa_0%,_#f9fcfd_45%,_#ffffff_100%)] flex flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
