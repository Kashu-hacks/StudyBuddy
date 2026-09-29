import { useState, useRef, useMemo, useEffect } from "react";
import "./VisualLearning.css";

const BACKEND_URL = "http://127.0.0.1:8000";


function normalizeAiVisuals(uploadResponse) {
  if (!uploadResponse || typeof uploadResponse !== "object") return null;

  const visualsRaw = uploadResponse.visuals;
  if (!visualsRaw || typeof visualsRaw !== "object") return null;

  if ("raw_output" in visualsRaw) return null;

  const candidateArrays = [
    Array.isArray(visualsRaw) ? visualsRaw : null,
    visualsRaw.visuals,
    visualsRaw.sections,
    visualsRaw.cards,
    visualsRaw.items,
    visualsRaw.diagrams,
  ];

  const arr = candidateArrays.find(
    (a) => Array.isArray(a) && a.length > 0
  );
  if (!arr) return null;

  return arr.map((entry, idx) => {
    const id = entry?.id ?? `ai-visual-${idx}`;
    const title = entry?.title ?? entry?.name ?? entry?.topic ?? `Visual ${idx + 1}`;
    const badge = entry?.type ?? entry?.badge ?? entry?.visual_type ?? "AI Visual";
    
    const description = entry?.purpose ?? entry?.description ?? entry?.summary ?? "";
    
    const points = Array.isArray(entry?.key_takeaways)
      ? entry.key_takeaways
      : Array.isArray(entry?.points)
      ? entry.points
      : Array.isArray(entry?.key_points)
      ? entry.key_points
      : Array.isArray(entry?.bullets)
      ? entry.bullets
      : Array.isArray(entry?.steps)
      ? entry.steps
      : [];

    const centralConcept = entry?.central_concept ?? "";
    const examMemoryHook = entry?.exam_memory_hook ?? "";
    const nodes = Array.isArray(entry?.nodes) ? entry.nodes : [];
    const connections = Array.isArray(entry?.connections) ? entry.connections : [];

    return {
      id,
      title,
      badge,
      component: null, 
      description,
      points,
      centralConcept,
      examMemoryHook,
      nodes,
      connections,
      raw: entry,
    };
  });
}

export const TcpFlowchartSvg = () => (
  <svg
    viewBox="0 0 300 200"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: "visible" }}
  >
    <defs>
      <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
      </marker>
    </defs>

    {/* Connecting lines */}
    <line x1="150" y1="35" x2="150" y2="60" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
    <line x1="150" y1="95" x2="150" y2="120" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
    <line x1="150" y1="95" x2="65" y2="95" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
    <line x1="150" y1="95" x2="235" y2="95" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
    <line x1="65" y1="115" x2="115" y2="155" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
    <line x1="235" y1="115" x2="185" y2="155" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
    <line x1="150" y1="150" x2="150" y2="165" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />

    {/* Start Node */}
    <rect x="100" y="10" width="100" height="26" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
    <text x="150" y="27" textAnchor="middle" fill="#1e3a8a" fontSize="10" fontWeight="700">
      SYN Request
    </text>

    {/* Left Node */}
    <rect x="20" y="80" width="90" height="30" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
    <text x="65" y="99" textAnchor="middle" fill="#14532d" fontSize="9" fontWeight="600">
      Sequence #
    </text>

    {/* Center Core Node */}
    <rect x="110" y="60" width="80" height="35" rx="6" fill="url(#yellowGrad)" stroke="#d97706" strokeWidth="1.5" />
    <text x="150" y="78" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="700">
      3-Way Handshake
    </text>
    <text x="150" y="90" textAnchor="middle" fill="#78350f" fontSize="8">
      SYN-ACK
    </text>

    {/* Right Node */}
    <rect x="190" y="80" width="90" height="30" rx="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
    <text x="235" y="99" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="600">
      Ack Number
    </text>

    {/* Flow Node */}
    <rect x="105" y="120" width="90" height="30" rx="6" fill="url(#purpleGrad)" stroke="#6d28d9" strokeWidth="1.5" />
    <text x="150" y="139" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700">
      Data Transfer
    </text>

    {/* Finish Node */}
    <rect x="100" y="165" width="100" height="24" rx="6" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
    <text x="150" y="181" textAnchor="middle" fill="#991b1b" fontSize="9" fontWeight="600">
      FIN / Teardown
    </text>
  </svg>
);

export const TcpConnectionSvg = () => (
  <svg
    viewBox="0 0 300 200"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Mesh Connecting Lines */}
    <line x1="150" y1="35" x2="60" y2="100" stroke="#93c5fd" strokeWidth="2.5" strokeDasharray="4 3" />
    <line x1="150" y1="35" x2="240" y2="100" stroke="#93c5fd" strokeWidth="2.5" />
    <line x1="60" y1="100" x2="150" y2="165" stroke="#c4b5fd" strokeWidth="2.5" />
    <line x1="240" y1="100" x2="150" y2="165" stroke="#c4b5fd" strokeWidth="2.5" strokeDasharray="4 3" />
    <line x1="60" y1="100" x2="240" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />

    {/* Central connection badge */}
    <circle cx="150" cy="100" r="16" fill="#f8fafc" stroke="#6366f1" strokeWidth="2" />
    <text x="150" y="104" textAnchor="middle" fill="#4338ca" fontSize="9" fontWeight="800">
      TCP
    </text>

    {/* Top Node: Client Host */}
    <circle cx="150" cy="35" r="22" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2.5" />
    <circle cx="150" cy="35" r="12" fill="#3b82f6" />
    <text x="150" y="38" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
      CLI
    </text>
    <text x="150" y="11" textAnchor="middle" fill="#1e293b" fontSize="9" fontWeight="700">
      Host A
    </text>

    {/* Left Node: Router 1 */}
    <circle cx="60" cy="100" r="18" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" />
    <rect x="52" y="93" width="16" height="14" rx="2" fill="#22c55e" />
    <text x="60" y="130" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="600">
      Router 1
    </text>

    {/* Right Node: Router 2 */}
    <circle cx="240" cy="100" r="18" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
    <rect x="232" y="93" width="16" height="14" rx="2" fill="#f59e0b" />
    <text x="240" y="130" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="600">
      Router 2
    </text>

    {/* Bottom Node: Server */}
    <circle cx="150" cy="165" r="22" fill="#fdf2f8" stroke="#ec4899" strokeWidth="2.5" />
    <circle cx="150" cy="165" r="12" fill="#ec4899" />
    <text x="150" y="168" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
      SRV
    </text>
    <text x="150" y="196" textAnchor="middle" fill="#1e293b" fontSize="9" fontWeight="700">
      Host B (Server)
    </text>
  </svg>
);

export const TcpLayersSvg = () => (
  <svg
    viewBox="0 0 300 200"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Layer 4: Application */}
    <rect x="35" y="16" width="230" height="34" rx="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
    <text x="50" y="34" fill="#0369a1" fontSize="10" fontWeight="700">
      Application Layer
    </text>
    <text x="50" y="44" fill="#0284c7" fontSize="8">
      HTTP, DNS, FTP, SMTP
    </text>

    {/* Layer 3: Transport */}
    <rect x="30" y="58" width="240" height="42" rx="8" fill="url(#transportGrad)" stroke="#7c3aed" strokeWidth="2.5" />
    <defs>
      <linearGradient id="transportGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
    </defs>
    <text x="50" y="78" fill="#ffffff" fontSize="11" fontWeight="800">
      Transport Layer (TCP / UDP)
    </text>
    <text x="50" y="91" fill="#e9d5ff" fontSize="8.5">
      Reliable Streams · Flow Control · Ports
    </text>

    {/* Layer 2: Internet */}
    <rect x="35" y="108" width="230" height="34" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
    <text x="50" y="126" fill="#92400e" fontSize="10" fontWeight="700">
      Internet Layer
    </text>
    <text x="50" y="136" fill="#b45309" fontSize="8">
      IP (IPv4/IPv6), ICMP, Routing
    </text>

    {/* Layer 1: Network Access */}
    <rect x="35" y="150" width="230" height="34" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
    <text x="50" y="168" fill="#166534" fontSize="10" fontWeight="700">
      Network Access Layer
    </text>
    <text x="50" y="178" fill="#15803d" fontSize="8">
      Ethernet, Wi-Fi, MAC Framing
    </text>
  </svg>
);

export const KeyConceptsSvg = () => (
  <svg
    viewBox="0 0 300 200"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Radiating Branch Lines */}
    <line x1="150" y1="100" x2="60" y2="45" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="150" y1="100" x2="240" y2="45" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="150" y1="100" x2="45" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="150" y1="100" x2="255" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="150" y1="100" x2="70" y2="160" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="150" y1="100" x2="230" y2="160" stroke="#cbd5e1" strokeWidth="1.5" />

    {/* Nodes */}
    <rect x="15" y="32" width="90" height="24" rx="5" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
    <text x="60" y="48" textAnchor="middle" fill="#1d4ed8" fontSize="8.5" fontWeight="600">
      Reliable Delivery
    </text>

    <rect x="195" y="32" width="90" height="24" rx="5" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
    <text x="240" y="48" textAnchor="middle" fill="#15803d" fontSize="8.5" fontWeight="600">
      Flow Control
    </text>

    <rect x="5" y="88" width="85" height="24" rx="5" fill="#fdf4ff" stroke="#c026d3" strokeWidth="1.5" />
    <text x="47" y="104" textAnchor="middle" fill="#86198f" fontSize="8" fontWeight="600">
      3-Way Handshake
    </text>

    <rect x="210" y="88" width="85" height="24" rx="5" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.5" />
    <text x="252" y="104" textAnchor="middle" fill="#9a3412" fontSize="8" fontWeight="600">
      Congestion Ctrl
    </text>

    <rect x="25" y="148" width="90" height="24" rx="5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
    <text x="70" y="164" textAnchor="middle" fill="#b45309" fontSize="8.5" fontWeight="600">
      Sequence #
    </text>

    <rect x="185" y="148" width="90" height="24" rx="5" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
    <text x="230" y="164" textAnchor="middle" fill="#334155" fontSize="8.5" fontWeight="600">
      Checksums
    </text>

    {/* Central Core */}
    <rect x="115" y="82" width="70" height="36" rx="18" fill="#7c3aed" stroke="#6d28d9" strokeWidth="2" />
    <text x="150" y="104" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">
      TCP Core
    </text>
  </svg>
);

export const DynamicAiDiagram = ({ visual }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  if (!visual) return null;

  const nodes = Array.isArray(visual.nodes) ? visual.nodes : [];
  const connections = Array.isArray(visual.connections) ? visual.connections : [];
  const centralConcept = visual.centralConcept || "";

  if (nodes.length === 0) {
    return (
      <div className="vl-ai-fallback-view">
        {centralConcept && (
          <div className="vl-ai-central-concept-chip">
            <span>✦ Core Concept:</span> {centralConcept}
          </div>
        )}
        <div className="vl-ai-generic-diagram">
          {visual.points && visual.points.length > 0 ? (
            visual.points.map((pt, idx) => (
              <div key={idx} className="vl-ai-generic-node">
                <span className="vl-ai-generic-node-index">{idx + 1}</span>
                <span>{typeof pt === "string" ? pt : JSON.stringify(pt)}</span>
              </div>
            ))
          ) : (
            <p className="vl-ai-generic-empty">
              No diagram elements provided in this visual response.
            </p>
          )}
        </div>
      </div>
    );
  }

  const width = 640;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.min(220, 150 + nodes.length * 12);
  const ry = Math.min(105, 75 + nodes.length * 6);

  const nodeMap = {};
  nodes.forEach((node, i) => {
    let x, y;
    if (nodes.length === 1) {
      x = cx;
      y = cy;
    } else if (nodes.length === 2) {
      x = i === 0 ? cx - 130 : cx + 130;
      y = cy;
    } else {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      x = cx + rx * Math.cos(angle);
      y = cy + ry * Math.sin(angle);
    }
    nodeMap[node.id] = { ...node, x, y };
  });

  const nodeWidth = 136;
  const nodeHeight = 44;

  return (
    <div className="vl-ai-diagram-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="vl-ai-diagram-svg"
      >
        <defs>
          <linearGradient id="aiNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
          <linearGradient id="aiSelectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="100%" stopColor="#e9d5ff" />
          </linearGradient>
          <marker
            id="aiArrowHead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#7C5CFC" />
          </marker>
        </defs>

        {/* Central Core Concept Node if provided */}
        {centralConcept && (
          <g>
            <circle
              cx={cx}
              cy={cy}
              r="38"
              fill="#faf5ff"
              stroke="#c084fc"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fill="#7e22ce"
              fontSize="7.5"
              fontWeight="800"
              letterSpacing="0.5"
            >
              CONCEPT
            </text>
            <text
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              fill="#581c87"
              fontSize="8"
              fontWeight="700"
            >
              {centralConcept.length > 14
                ? centralConcept.slice(0, 12) + "…"
                : centralConcept}
            </text>
          </g>
        )}

        {/* Connections */}
        {connections.map((conn, idx) => {
          const fromNode = nodeMap[conn.from];
          const toNode = nodeMap[conn.to];
          if (!fromNode || !toNode) return null;

          const isHighlighted =
            selectedNodeId &&
            (conn.from === selectedNodeId || conn.to === selectedNodeId);

          const mx = (fromNode.x + toNode.x) / 2;
          const my = (fromNode.y + toNode.y) / 2;
          const isContrast =
            conn.relationship &&
            (conn.relationship.toLowerCase().includes("contrast") ||
             conn.relationship.toLowerCase().includes("differ"));

          return (
            <g key={idx}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isHighlighted ? "#7C5CFC" : "#94a3b8"}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeDasharray={isContrast ? "4 3" : undefined}
                markerEnd="url(#aiArrowHead)"
              />
              {conn.relationship && (
                <g>
                  <rect
                    x={mx - (conn.relationship.length * 3 + 6)}
                    y={my - 7}
                    width={conn.relationship.length * 6 + 12}
                    height="14"
                    rx="4"
                    fill="#ffffff"
                    stroke={isHighlighted ? "#7C5CFC" : "#cbd5e1"}
                    strokeWidth="0.8"
                  />
                  <text
                    x={mx}
                    y={my + 3}
                    textAnchor="middle"
                    fill={isHighlighted ? "#6d28d9" : "#475569"}
                    fontSize="7"
                    fontWeight="600"
                  >
                    {conn.relationship}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = nodeMap[node.id];
          if (!pos) return null;
          const isSelected = selectedNodeId === node.id;

          const displayLabel =
            node.label && node.label.length > 18
              ? node.label.slice(0, 16) + "…"
              : node.label || node.id;

          return (
            <g
              key={node.id}
              onClick={() =>
                setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
              }
              style={{ cursor: "pointer" }}
            >
              <title>{`${node.label || node.id}: ${node.description || ""}`}</title>
              <rect
                x={pos.x - nodeWidth / 2}
                y={pos.y - nodeHeight / 2}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                fill={isSelected ? "url(#aiSelectedGrad)" : "url(#aiNodeGrad)"}
                stroke={isSelected ? "#7C5CFC" : "#cbd5e1"}
                strokeWidth={isSelected ? 2 : 1.2}
              />
              {/* Node ID label */}
              <text
                x={pos.x}
                y={pos.y - 6}
                textAnchor="middle"
                fill="#7C5CFC"
                fontSize="7.5"
                fontWeight="700"
                letterSpacing="0.3"
              >
                {node.id.toUpperCase()}
              </text>
              {/* Node Main Title */}
              <text
                x={pos.x}
                y={pos.y + 7}
                textAnchor="middle"
                fill="#1e293b"
                fontSize="8.5"
                fontWeight="700"
              >
                {displayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ==========================================
// VISUAL LEARNING COMPONENT
// ==========================================

export default function VisualLearning({ onNavigate }) {
  const [showViewer, setShowViewer] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [activeVisualIndex, setActiveVisualIndex] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle | uploading | success | error
  const [uploadError, setUploadError] = useState(null);
  const [uploadDuration, setUploadDuration] = useState(0);
  const fileInputRef = useRef(null);

  // New quiz-related state
  const [quizStatus, setQuizStatus] = useState("idle"); // idle|generating|active|submitting|feedback|completed|error
  const [quizData, setQuizData] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [conversationLog, setConversationLog] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [quizError, setQuizError] = useState(null);
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Timer effect for tracking processing duration and rendering staged user-friendly progress messages
  useEffect(() => {
    let interval;
    if (uploadStatus === "uploading") {
      interval = setInterval(() => {
        setUploadDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadStatus]);

  // Dynamic progress message while Azure Foundry agent pipeline runs (typically 20-30s)
  const getProcessingMessage = (seconds) => {
    if (seconds < 7) {
      return "Analyzing handwritten notes (Notes-Digitizer v7)...";
    } else if (seconds < 18) {
      return "Extracting concepts & generating visual diagrams (Visuals v6)...";
    } else if (seconds < 26) {
      return "Synthesizing diagram relationships & exam key points...";
    } else {
      return "Finalizing AI visual response...";
    }
  };

  const demoVisuals = [
    {
      id: "flowchart",
      title: "TCP Flowchart",
      badge: "Connection Lifecycle",
      component: <TcpFlowchartSvg />,
      description:
        "Detailed state machine of TCP connection establishment and teardown. Demonstrates the synchronized sequence exchange between client and host.",
      points: [
        "SYN: Client sends initial sequence number to establish connection.",
        "SYN-ACK: Server responds with acknowledgment and its own sequence number.",
        "ACK: Client acknowledges server response, completing 3-way handshake.",
        "FIN: Graceful teardown ensures all in-flight buffers are drained.",
      ],
    },
    {
      id: "connection",
      title: "TCP Connection",
      badge: "Network Topology",
      component: <TcpConnectionSvg />,
      description:
        "Point-to-point end-to-end transport layer connection across multi-hop intermediate routers and packet networks.",
      points: [
        "End-to-End Reliability: Only source and destination manage state.",
        "Router Independence: Intermediate routers forward IP packets without maintaining TCP state.",
        "Full-Duplex: Bidirectional streams operate simultaneously over a single logical socket.",
      ],
    },
    {
      id: "layers",
      title: "TCP Layers",
      badge: "Protocol Stack",
      component: <TcpLayersSvg />,
      description:
        "4-Layer TCP/IP architectural model showing where TCP sits between higher-level applications and lower-level IP routing.",
      points: [
        "Application (Layer 4): Encapsulates payloads from HTTP, DNS, SSH, etc.",
        "Transport (Layer 3): Segment formatting, port multiplexing, and window flow control.",
        "Internet (Layer 2): Logical IP packet addressing and routing across subnets.",
        "Network Access (Layer 1): Physical framing, MAC addresses, and wire signaling.",
      ],
    },
    {
      id: "concepts",
      title: "Key Concepts",
      badge: "Concept Map",
      component: <KeyConceptsSvg />,
      description:
        "Hierarchical knowledge breakdown of TCP features: reliability guarantees, flow control, sequence numbering, and error detection.",
      points: [
        "Reliability: Automatic Repeat reQuest (ARQ) retransmits dropped packets.",
        "Flow Control: Sliding window mechanism prevents buffer overflow on slow receivers.",
        "Congestion Control: AIMD, Slow Start, and Congestion Avoidance protect network bandwidth.",
        "Data Integrity: 16-bit one's complement checksum detects corrupted bits.",
      ],
    },
  ];

  // Single upload path used by BOTH the click-to-browse file input and drag-and-drop.
  const uploadFile = async (file) => {
    if (!file) {
      console.log("[VisualLearning] uploadFile called with no file.");
      return;
    }

    if (uploadStatus === "uploading") {
      console.warn("[VisualLearning] Upload already in progress. Ignoring duplicate upload trigger.");
      return;
    }

    console.log(
      `[VisualLearning] File selected — name='${file.name}' type='${file.type}' size=${file.size}B`
    );

    setUploadedFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
    });
    setUploadStatus("uploading");
    setUploadError(null);
    setUploadDuration(0);

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = `${BACKEND_URL}/upload-image`;
    console.log(`[VisualLearning] Initiating POST request to: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      console.log(`[VisualLearning] Server responded with status: ${response.status}`);

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(
          `Backend response was not valid JSON (${parseErr.message}) (HTTP ${response.status})`
        );
      }

      console.log("[VisualLearning] Response payload:", data);

      if (!response.ok) {
        throw new Error(data.detail || `Server returned error ${response.status}`);
      }

      setAiData(data);
      localStorage.setItem("aiData", JSON.stringify(data));
      setUploadStatus("success");
      setActiveVisualIndex(0);
      console.log("[VisualLearning] Upload and Foundry AI pipeline succeeded.");
    } catch (error) {
      console.error("[VisualLearning] Upload pipeline error:", error);
      setUploadStatus("error");
      setUploadError(error.message || "Failed to reach backend server");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[VisualLearning] File input changed with no file.");
      return;
    }
    uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (uploadStatus === "uploading") return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log("[VisualLearning] File dropped:", file.name);
      uploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (uploadStatus === "uploading") return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // -------------------------------------------------
  // Quiz handling functions
  // -------------------------------------------------
  const handleGenerateQuiz = async () => {
    if (!aiData?.notes) {
      console.warn('[Quiz] No notes available to generate quiz.');
      return;
    }
    setQuizStatus('generating');
    setQuizError(null);
    try {
      const payload = {
        notes: aiData.notes,
        visuals: aiData.visuals,
        question_count: 5,
        difficulty: 'mixed',
        chat_history: quizHistory.map((h) => h.qa),
      };
      const resp = await fetch(`${BACKEND_URL}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || 'Quiz generation failed');
      }
      const parsed = parseQuizResponse(data.quiz);
      setQuizData(parsed);
      setQuizStatus('active');
    } catch (e) {
      console.error('[Quiz] generate error:', e);
      setQuizError(e.message);
      setQuizStatus('error');
    }
  };

  const parseQuizResponse = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const questionLine = lines.find((l) => !/^[A-D]\)/i.test(l) && !/^Answer:/i.test(l));
    const options = [];
    let correctOption = null;
    lines.forEach((l) => {
      const optMatch = l.match(/^([A-D])\)\s*(.*)$/i);
      if (optMatch) {
        options.push({ label: optMatch[1].toUpperCase(), text: optMatch[2] });
      }
      const answerMatch = l.match(/^Answer:\s*([A-D])/i);
      if (answerMatch) {
        correctOption = answerMatch[1].toUpperCase();
      }
    });
    return { question: questionLine || 'Question', options, correctOption };
  };

  const handleSubmitAnswer = () => {
    if (!quizData) return;
    const isCorrect = selectedOption === quizData.correctOption;
    if (isCorrect) setScore((s) => s + 1);
    const entry = {
      question: quizData.question,
      selected: selectedOption,
      correct: quizData.correctOption,
      isCorrect,
    };
    setQuizHistory((h) => [...h, { qa: entry }]);
    setQuizStatus('feedback');
    setSelectedOption('');
    setTimeout(() => {
      if (quizHistory.length + 1 >= 5) {
        setQuizStatus('completed');
      } else {
        handleGenerateQuiz();
      }
    }, 1500);
  };
  const aiVisuals = useMemo(() => normalizeAiVisuals(aiData), [aiData]);
  const usingAiVisuals = Boolean(aiVisuals && aiVisuals.length > 0);
  const visuals = usingAiVisuals ? aiVisuals : demoVisuals;
  const currentVisual = visuals[Math.min(activeVisualIndex, visuals.length - 1)];

  return (
    <div className="visual-learning-app">
      {/* ================= SIDEBAR ================= */}
      <aside className="vl-sidebar">
        <div className="vl-brand">
          <div className="vl-brand-icon">✦</div>
          <div>
            <div className="vl-brand-name">StudyAI</div>
            <div className="vl-brand-tagline">Learn · Practice · Grow</div>
          </div>
        </div>

        <nav className="vl-sidebar-nav">
          <button className="vl-nav-item" onClick={() => onNavigate?.("home")}>
            <span>⌂</span>
            Home
          </button>

          <button className="vl-nav-item active">
            <span>🎴</span>
            Visual Learning
          </button>

          <button className="vl-nav-item" onClick={() => onNavigate?.("quiz")}>
            <span>▣</span>
            Quiz
          </button>

          <button className="vl-nav-item" onClick={() => onNavigate?.("progress")}>
            <span>◔</span>
            My Progress
          </button>

          <button className="vl-nav-item" onClick={() => onNavigate?.("past-attempts")}>
            <span>↶</span>
            Past Attempts
          </button>

          <button className="vl-nav-item" onClick={() => onNavigate?.("notes")}>
            <span>▤</span>
            Notes
          </button>

          <button className="vl-nav-item" onClick={() => onNavigate?.("settings")}>
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="vl-sidebar-tip">
          <div>
            <strong>Small steps</strong>
            <br />
            build big results.
          </div>
          <span>⌁</span>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="vl-main">
        {/* TOPBAR */}
        <header className="vl-topbar">
          <div className="vl-student-profile">
            <div className="vl-avatar">S</div>
            <div className="vl-student-name">Student</div>
            <span className="vl-profile-arrow">⌄</span>
          </div>
        </header>

        {/* HEADER */}
        <section className="vl-header">
          <h1 className="vl-title">Visual Learning</h1>
          <p className="vl-subtitle">Turn your notes into understanding with AI.</p>
        </section>

        {/* ================= DRAG AND DROP & VIEW VISUAL LEARNING ================= */}
        <div className="vl-single-container">
          <div className="vl-upload-card-standalone">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.webp"
              style={{ display: "none" }}
              disabled={uploadStatus === "uploading"}
            />

            <div
              className={`vl-dropzone ${isDragging ? "dragging" : ""} ${uploadStatus === "uploading" ? "disabled" : ""}`}
              onDrop={uploadStatus === "uploading" ? undefined : handleDrop}
              onDragOver={uploadStatus === "uploading" ? undefined : handleDragOver}
              onDragLeave={uploadStatus === "uploading" ? undefined : handleDragLeave}
              onClick={() => {
                if (uploadStatus !== "uploading") {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="vl-upload-icon-circle">
                {uploadStatus === "uploading" ? (
                  <span className="vl-upload-spinner"></span>
                ) : (
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                )}
              </div>

              <h3 className="vl-drop-title">
                {uploadStatus === "uploading"
                  ? "Processing Handwritten Notes..."
                  : "Drop your image or notes here"}
              </h3>
              <p className="vl-drop-formats">Supports images (JPG, PNG) or WebP</p>

              {uploadedFile ? (
                <div
                  className="vl-uploaded-preview"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="vl-file-icon">📄</span>
                  <div className="vl-file-info">
                    <div className="vl-file-name">{uploadedFile.name}</div>
                    <div
                      className={`vl-file-status vl-file-status-${uploadStatus}`}
                    >
                      {uploadStatus === "uploading" && (
                        <span className="vl-processing-indicator">
                          <span className="vl-pulsing-dot"></span>
                          <span>
                            {getProcessingMessage(uploadDuration)} ({uploadDuration}s)
                          </span>
                        </span>
                      )}
                      {uploadStatus === "success" && (
                        <span>✓ AI Processing Completed ({uploadedFile.size})</span>
                      )}
                      {uploadStatus === "error" && (
                        <span>✗ Failed: {uploadError}</span>
                      )}
                      {uploadStatus === "idle" && (
                        <span>{uploadedFile.size} selected</span>
                      )}
                    </div>
                  </div>
                  {uploadStatus !== "uploading" && (
                    <button
                      className="vl-clear-file"
                      title="Clear file"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadStatus("idle");
                        setUploadError(null);
                        setAiData(null);
                        setUploadDuration(0);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="vl-browse-btn"
                  disabled={uploadStatus === "uploading"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (uploadStatus !== "uploading") {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  Browse Files
                </button>
              )}

              <p className="vl-drop-subtext">
                {uploadStatus === "uploading"
                  ? "Please wait — Microsoft Foundry agents are reading & analyzing your notes..."
                  : "Or drag and drop"}
              </p>
            </div>
          </div>

          {uploadStatus === "success" && usingAiVisuals && (
            <div className="vl-ai-success-banner">
              <span>✦</span> AI Visuals ready! Click below to view the interactive diagrams.
            </div>
          )}

          {uploadStatus === "success" && !usingAiVisuals && (
            <div className="vl-ai-raw-warning">
              The AI pipeline completed, but its response couldn't be
              turned into structured visuals, so the demo set below is
              still shown.{" "}
              {aiData?.visuals?.raw_output && (
                <details>
                  <summary>Show raw AI output</summary>
                  <pre>{String(aiData.visuals.raw_output)}</pre>
                </details>
              )}
            </div>
          )}

          <button
            className="vl-view-learning-standalone-btn"
            onClick={() => setShowViewer(true)}
          >
            View Visual Learning <span>→</span>
          </button>
        </div>
      </main>

      {/* ================= INTERACTIVE VISUAL LEARNING VIEWER MODAL ================= */}
      {showViewer && (
        <div
          className="vl-modal-backdrop"
          onClick={() => setShowViewer(false)}
        >
          <div
            className="vl-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vl-modal-header">
              <div className="vl-modal-title-group">
                <span className="vl-modal-badge">{currentVisual.badge}</span>
                <h3 className="vl-modal-title">{currentVisual.title}</h3>
                <span className="vl-modal-source-tag">
                  {usingAiVisuals
                    ? "Generated from your notes (Foundry Visuals)"
                    : "Demo (upload notes to replace this)"}
                </span>
              </div>
              <button
                className="vl-modal-close"
                onClick={() => setShowViewer(false)}
              >
                ✕
              </button>
            </div>

            <div className="vl-modal-tabs">
              {visuals.map((v, idx) => (
                <button
                  key={v.id}
                  className={`vl-modal-tab ${activeVisualIndex === idx ? "active" : ""}`}
                  onClick={() => setActiveVisualIndex(idx)}
                >
                  {v.title}
                </button>
              ))}
            </div>

            <div className="vl-modal-body">
              {/* Dynamic Diagram Stage */}
              <div className="vl-modal-svg-stage">
                {currentVisual.component ? (
                  currentVisual.component
                ) : (
                  <DynamicAiDiagram visual={currentVisual} />
                )}
              </div>

              {/* Exam Memory Hook Card if present */}
              {currentVisual.examMemoryHook && (
                <div className="vl-ai-exam-hook-card">
                  <span className="vl-ai-hook-icon">🧠</span>
                  <div className="vl-ai-hook-content">
                    <strong>Exam Memory Hook</strong>
                    <p>{currentVisual.examMemoryHook}</p>
                  </div>
                </div>
              )}

              {/* Conceptual Breakdown */}
              <div className="vl-modal-explanation-box">
                <div className="vl-modal-exp-title">
                  <span>💡</span> Conceptual Breakdown
                </div>
                <p className="vl-modal-exp-text">
                  {currentVisual.description || "No conceptual breakdown description provided."}
                </p>
              </div>

              {/* Key Points & Takeaways */}
              <div className="vl-modal-explanation-box">
                <div className="vl-modal-exp-title">
                  <span>✦</span> Key Points & Takeaways
                </div>
                <div className="vl-modal-key-points">
                  {currentVisual.points && currentVisual.points.length > 0 ? (
                    currentVisual.points.map((pt, idx) => (
                      <div key={idx} className="vl-modal-point">
                        <span style={{ color: "#2ECC71", fontWeight: "bold" }}>✓</span>
                        <span>{typeof pt === "string" ? pt : JSON.stringify(pt)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="vl-ai-generic-empty">No key points provided in this visual.</p>
                  )}
                </div>
              </div>

              {/* Concept Elements Cards (Nodes) if present */}
              {currentVisual.nodes && currentVisual.nodes.length > 0 && (
                <div className="vl-modal-explanation-box">
                  <div className="vl-modal-exp-title">
                    <span>🧩</span> Concept Elements ({currentVisual.nodes.length})
                  </div>
                  <div className="vl-ai-node-cards-grid">
                    {currentVisual.nodes.map((node) => (
                      <div key={node.id} className="vl-ai-node-card">
                        <div className="vl-ai-node-card-header">
                          <span className="vl-ai-node-chip">{node.id}</span>
                          <span className="vl-ai-node-title">{node.label}</span>
                        </div>
                        {node.description && (
                          <p className="vl-ai-node-desc">{node.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concept Relationships (Connections) if present */}
              {currentVisual.connections && currentVisual.connections.length > 0 && (
                <div className="vl-modal-explanation-box">
                  <div className="vl-modal-exp-title">
                    <span>🔗</span> Concept Relationships ({currentVisual.connections.length})
                  </div>
                  <div className="vl-ai-connections-list">
                    {currentVisual.connections.map((conn, idx) => (
                      <div key={idx} className="vl-ai-conn-pill">
                        <span className="vl-ai-conn-from">{conn.from}</span>
                        <span className="vl-ai-conn-rel">
                          {conn.relationship ? `— ${conn.relationship} →` : "→"}
                        </span>
                        <span className="vl-ai-conn-to">{conn.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}