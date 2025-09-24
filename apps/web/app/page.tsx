"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useSessionSocket } from "../hooks/useSessionSocket";
import ProgressOverview from "../components/ProgressOverview";
import SubqueryCard from "../components/SubqueryCard";
import ActivityFeed from "../components/ActivityFeed";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const { state, startSession } = useSessionSocket();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <section className="text-center space-y-4 pt-8">
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Deeper Research
        </motion.h1>
        <p className="text-slate-300">Mega-parallel deep research with live progress</p>
        <div className="flex gap-2 max-w-3xl mx-auto pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to research?"
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 outline-none focus:ring-2 ring-cyan-400"
          />
          <button
            onClick={() => query.trim() && startSession(query.trim())}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-5"
          >
            Start
          </button>
        </div>
      </section>

      <ProgressOverview status={state.status} progress={state.overallProgress} />

      <section className="grid md:grid-cols-2 gap-4">
        {state.subQueries.map((sq) => (
          <SubqueryCard key={sq.id} subQuery={sq} />
        ))}
      </section>

      <ActivityFeed items={state.activity} />
    </main>
  );
}
