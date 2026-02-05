import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast, { Toaster } from "react-hot-toast";

// =============================
// ENV CONFIG
// =============================
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

// =============================
// MAIN APP
// =============================
function App() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  // =============================
  // FETCH LOGS
  // =============================
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/logs`);
        setLogs(response.data);
        calculateStats(response.data);
      } catch (error) {
        toast.error("⚠️ Backend connection failed");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (API_URL) fetchLogs();
  }, []);

  // =============================
  // ROBUST WEBSOCKET WITH RECONNECT
  // =============================
  useEffect(() => {
    if (!WS_URL) return;

    const connectWebSocket = () => {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);

        setLogs((prev) => {
          const updated = [message, ...prev].slice(0, 100);
          calculateStats(updated);
          return updated;
        });

        if (message.priority === "Critical") {
          toast.error(`🚨 Critical Alert: ${message.source}`);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");
        reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = () => {
        wsRef.current.close();
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current)
        clearTimeout(reconnectTimeout.current);
    };
  }, []);

  // =============================
  // FILTER LOGS
  // =============================
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesFilter =
        filter === "All" || log.priority === filter;

      const matchesSearch =
        log.message.toLowerCase().includes(search.toLowerCase()) ||
        (log.source || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [logs, filter, search]);

  // =============================
  // STATS
  // =============================
  function calculateStats(data) {
    const counts = {
      total: data.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    data.forEach((log) => {
      if (log.priority === "Critical") counts.critical++;
      else if (log.priority === "High") counts.high++;
      else if (log.priority === "Medium") counts.medium++;
      else counts.low++;
    });

    setStats(counts);
  }

  const chartData = [
    { name: "Critical", value: stats.critical, color: "#ef4444" },
    { name: "High", value: stats.high, color: "#f97316" },
    { name: "Medium", value: stats.medium, color: "#eab308" },
    { name: "Low", value: stats.low, color: "#22c55e" },
  ];

  const systemHealth = Math.max(
    100 - stats.critical * 10 - stats.high * 5,
    70
  );

  // =============================
  // UI
  // =============================
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Toaster position="top-right" />

      <div className="w-64 bg-slate-950 border-r border-slate-800 fixed h-full flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-slate-800">
          <span className="text-2xl font-semibold text-blue-400">
            OpsGuard.
          </span>
        </div>

        <nav className="flex-1 p-6 space-y-3">
          <MenuItem active>📊 Dashboard</MenuItem>
          <MenuItem>⚡ Live Events</MenuItem>
          <MenuItem>📁 Incident History</MenuItem>
          <MenuItem>⚙️ Configuration</MenuItem>
        </nav>
      </div>

      <div className="flex-1 ml-64 p-10">
        <h1 className="text-4xl font-semibold text-white mb-8">
          Command Center
        </h1>

        {loading ? (
          <div className="text-slate-400 animate-pulse">
            Loading incidents...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <KpiCard label="Total Incidents" value={stats.total} />
              <KpiCard label="Critical" value={stats.critical} critical />
              <KpiCard label="High Priority" value={stats.high} />
              <KpiCard
                label="System Health"
                value={`${systemHealth}%`}
                healthy
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    Live Incidents
                  </h2>

                  <div className="flex gap-2">
                    <input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                    />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                    >
                      <option>All</option>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Time</th>
                      <th className="p-3 text-left">Source</th>
                      <th className="p-3 text-left">Message</th>
                      <th className="p-3 text-right">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-800 hover:bg-slate-800/50 transition"
                      >
                        <td className="p-3 text-xs font-mono">
                          {log.timestamp}
                        </td>
                        <td className="p-3 text-slate-400">
                          {log.source || "System"}
                        </td>
                        <td className="p-3">{log.message}</td>
                        <td className="p-3 text-right">
                          <PriorityBadge priority={log.priority} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-semibold mb-4">
                  Severity Distribution
                </h2>

                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={90}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================
// COMPONENTS
// =============================

function MenuItem({ children, active }) {
  return (
    <div
      className={`px-3 py-2 rounded-lg cursor-pointer transition ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {children}
    </div>
  );
}

function KpiCard({ label, value, critical, healthy }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`text-3xl font-semibold mt-2 ${
          critical
            ? "text-red-400"
            : healthy
            ? "text-green-400"
            : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const colorMap = {
    Critical: "bg-red-500/20 text-red-400",
    High: "bg-orange-500/20 text-orange-400",
    Medium: "bg-yellow-500/20 text-yellow-400",
    Low: "bg-green-500/20 text-green-400",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        colorMap[priority] || "bg-slate-800 text-slate-300"
      }`}
    >
      {priority}
    </span>
  );
}

export default App;


