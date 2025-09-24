"use client";
import { motion } from "framer-motion";
import type { SubQuery } from "@deeper/shared-types";

const statusStyles: Record<SubQuery["status"], string> = {
  queued: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  researching: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  retrying: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  completed: "bg-green-500/20 text-green-300 border-green-500/40",
  failed: "bg-red-500/20 text-red-300 border-red-500/40",
  paused: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

export default function SubqueryCard({ subQuery }: { subQuery: SubQuery }) {
  const cls = statusStyles[subQuery.status] ?? statusStyles.queued;
  return (
    <motion.div
      className={`rounded-xl border ${cls} p-4 bg-slate-900/60`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-100">{subQuery.text}</h3>
        <span className="text-xs px-2 py-1 rounded bg-slate-950/40 border border-current">
          {subQuery.status}
        </span>
      </div>
      <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${subQuery.progress}%` }}
        />
      </div>
      <div className="mt-2 text-sm text-slate-300 line-clamp-3 min-h-[3.6em]">
        {subQuery.preview || "…"}
      </div>
      <div className="mt-2 text-xs text-slate-400">Sources: {subQuery.sourceCount}</div>
    </motion.div>
  );
}
