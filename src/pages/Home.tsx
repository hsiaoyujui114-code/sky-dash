import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Gamepad2, Users, Trophy } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 font-sans p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Sky Dash</h1>
        <p className="text-zinc-400 text-lg max-w-md mx-auto">
          Collect stars as fast as you can. Play solo or compete against others in real-time.
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center">
        <Link to="/single" className="flex-1">
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center text-center h-full transition-colors hover:border-indigo-500/50 hover:bg-zinc-800/50"
          >
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-indigo-400">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Single Player</h2>
            <p className="text-zinc-400 text-sm">
              Practice your skills with different difficulty levels.
            </p>
          </motion.div>
        </Link>

        <Link to="/multi" className="flex-1">
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center text-center h-full transition-colors hover:border-emerald-500/50 hover:bg-zinc-800/50"
          >
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-emerald-400">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Multiplayer</h2>
            <p className="text-zinc-400 text-sm">
              Compete against other players in real-time.
            </p>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
