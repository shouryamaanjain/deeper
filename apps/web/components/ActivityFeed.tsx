"use client";
import { motion } from "framer-motion";

export default function ActivityFeed({
  items,
}: {
  items: { message: string; level: "info" | "success" | "warning" | "error"; timestamp: string }[];
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="font-semibold mb-2 text-slate-200">Activity</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
            <span className="text-slate-400">[{new Date(item.timestamp).toLocaleTimeString()}]</span>{" "}
            <span className="text-slate-200">{item.message}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
