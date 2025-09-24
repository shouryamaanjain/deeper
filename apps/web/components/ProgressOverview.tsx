"use client";
import { motion } from "framer-motion";

export default function ProgressOverview({
  status,
  progress,
}: {
  status: string;
  progress: number;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-slate-300">Status: {status}</div>
        <div className="text-slate-400">{progress}%</div>
      </div>
      <div className="mt-3 h-3 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
