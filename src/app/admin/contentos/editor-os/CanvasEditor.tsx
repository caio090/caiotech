"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Type, ImageIcon, Square, Trash2, Copy, ChevronUp, ChevronDown,
  Undo2, Redo2, ZoomIn, ZoomOut, Download, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, FlaskConical,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ElemType = "text" | "image" | "rect";
export type Preset = "feed" | "story" | "carousel";

interface EditorElement {
  id: string;
  type: ElemType;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  textAlign?: "left" | "center" | "right";
  src?: string;
  fill?: string;
  opacity?: number;
}

interface DragState {
  elId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  origRot: number;
  mode: "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw" | "rotate";
}

const PRESETS: Record<Preset, { w: number; h: number; label: string }> = {
  feed:     { w: 1080, h: 1080, label: "Feed 1:1" },
  story:    { w: 1080, h: 1920, label: "Story 9:16" },
  carousel: { w: 1080, h: 1080, label: "Carrossel" },
};

const FONTS: { value: string; label: string }[] = [
  { value: "Inter, sans-serif",       label: "Inter" },
  { value: "Arial, sans-serif",       label: "Arial" },
  { value: "Georgia, serif",          label: "Georgia" },
  { value: "Courier New, monospace",  label: "Courier" },
  { value: "Trebuchet MS, sans-serif",label: "Trebuchet" },
  { value: "Impact, sans-serif",      label: "Impact" },
];

const HANDLE_R = 5;   // px in canvas coords
const ROT_OFFSET = 28; // how far above bounding box the rotation handle is

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line || " ");
  }
  return lines;
}

function worldCorners(el: EditorElement) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const rad = (el.rot * Math.PI) / 180;
  const localToWorld = (lx: number, ly: number): [number, number] => {
    const dx = lx - el.w / 2;
    const dy = ly - el.h / 2;
    return [
      cx + dx * Math.cos(rad) - dy * Math.sin(rad),
      cy + dx * Math.sin(rad) + dy * Math.cos(rad),
    ];
  };
  return {
    nw: localToWorld(0, 0),
    ne: localToWorld(el.w, 0),
    sw: localToWorld(0, el.h),
    se: localToWorld(el.w, el.h),
    rot: localToWorld(el.w / 2, -ROT_OFFSET),
  };
}

function hitTest(px: number, py: number, el: EditorElement): boolean {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const rad = (el.rot * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(-rad) - dy * Math.sin(-rad) + el.w / 2;
  const ly = dx * Math.sin(-rad) + dy * Math.cos(-rad) + el.h / 2;
  return lx >= 0 && lx <= el.w && ly >= 0 && ly <= el.h;
}

function hitHandle(px: number, py: number, el: EditorElement): DragState["mode"] | null {
  const corners = worldCorners(el);
  const threshold = HANDLE_R + 4;

  function near(wx: number, wy: number) {
    return Math.hypot(px - wx, py - wy) < threshold;
  }
  if (near(...corners.rot)) return "rotate";
  if (near(...corners.nw)) return "resize-nw";
  if (near(...corners.ne)) return "resize-ne";
  if (near(...corners.sw)) return "resize-sw";
  if (near(...corners.se)) return "resize-se";
  return null;
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: EditorElement,
  imgCache: Map<string, HTMLImageElement>,
  onImgLoad: () => void,
) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;

  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((el.rot * Math.PI) / 180);

  if (el.type === "rect") {
    ctx.fillStyle = el.fill ?? "#7c3aed";
    ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h);
  } else if (el.type === "text" && el.text) {
    const fs = el.fontSize ?? 48;
    const weight = el.bold ? "bold" : "normal";
    const style  = el.italic ? "italic" : "normal";
    ctx.font = `${style} ${weight} ${fs}px ${el.fontFamily ?? "Inter, sans-serif"}`;
    ctx.fillStyle = el.textColor ?? "#000000";
    ctx.textBaseline = "top";

    const align = el.textAlign ?? "left";
    ctx.textAlign = align;
    const lines = wrapText(ctx, el.text, el.w);
    const lineH = fs * 1.3;
    const totalH = lines.length * lineH;
    let startY = -el.h / 2 + Math.max(0, (el.h - totalH) / 2);
    let startX = -el.w / 2;
    if (align === "center") startX = 0;
    else if (align === "right") startX = el.w / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], startX, startY + i * lineH);
    }
  } else if (el.type === "image" && el.src) {
    let img = imgCache.get(el.src);
    if (!img) {
      img = new Image();
      img.onload = onImgLoad;
      img.src = el.src;
      imgCache.set(el.src, img);
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -el.w / 2, -el.h / 2, el.w, el.h);
    } else {
      ctx.fillStyle = "#d4d4d8";
      ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Carregando…", 0, 0);
    }
  }

  ctx.restore();
}

function drawSelection(ctx: CanvasRenderingContext2D, el: EditorElement) {
  const corners = worldCorners(el);
  ctx.save();

  // Dashed box
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  const pts = [corners.nw, corners.ne, corners.se, corners.sw];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner handles
  for (const [wx, wy] of [corners.nw, corners.ne, corners.sw, corners.se]) {
    ctx.beginPath();
    ctx.arc(wx, wy, HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Rotation handle line + circle
  const midTop: [number, number] = [
    (corners.nw[0] + corners.ne[0]) / 2,
    (corners.nw[1] + corners.ne[1]) / 2,
  ];
  ctx.beginPath();
  ctx.moveTo(midTop[0], midTop[1]);
  ctx.lineTo(corners.rot[0], corners.rot[1]);
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(corners.rot[0], corners.rot[1], HANDLE_R + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#7c3aed";
  ctx.fill();

  ctx.restore();
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  clientName?: string;
}

export function CanvasEditor({ clientName }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgCache     = useRef(new Map<string, HTMLImageElement>());
  const dragging     = useRef<DragState | null>(null);

  const [preset, setPreset]     = useState<Preset>("feed");
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory]   = useState<EditorElement[][]>([[]]);
  const [histIdx, setHistIdx]   = useState(0);
  const [zoom, setZoom]         = useState(1.0);
  const [bgColor, setBgColor]   = useState("#ffffff");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [savedMsg, setSavedMsg]   = useState<string | null>(null);
  const [cursor, setCursor]       = useState("default");

  const { w: cw, h: ch } = PRESETS[preset];

  // ── Scale ──────────────────────────────────────────────────────────────────
  function getDisplayScale(): number {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const cWidth = canvas.getBoundingClientRect().width;
    return cWidth > 0 ? cWidth / canvas.width : 1;
  }

  // ── Redraw ─────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sorted = [...elements].sort((a, b) => a.z - b.z);
    for (const el of sorted) {
      drawElement(ctx, el, imgCache.current, redraw);
    }

    if (selectedId && !editingId) {
      const el = elements.find(e => e.id === selectedId);
      if (el) drawSelection(ctx, el);
    }
  }, [elements, selectedId, bgColor, editingId]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width  = cw;
    canvas.height = ch;
    // CSS size: fit container width, maintain aspect ratio
    const containerW = container.clientWidth - 48;
    const scale = Math.min(1, containerW / cw) * zoom;
    canvas.style.width  = `${Math.round(cw * scale)}px`;
    canvas.style.height = `${Math.round(ch * scale)}px`;
    redraw();
  }, [cw, ch, zoom, redraw]);

  // ── History ────────────────────────────────────────────────────────────────
  function pushHistory(elems: EditorElement[]) {
    setHistory(prev => {
      const next = [...prev.slice(0, histIdx + 1), elems.map(e => ({ ...e }))];
      return next.length > 60 ? next.slice(-60) : next;
    });
    setHistIdx(prev => Math.min(prev + 1, 60));
  }

  function undo() {
    if (histIdx <= 0) return;
    const idx = histIdx - 1;
    setHistIdx(idx);
    setElements(history[idx].map(e => ({ ...e })));
    setSelectedId(null);
  }

  function redo() {
    if (histIdx >= history.length - 1) return;
    const idx = histIdx + 1;
    setHistIdx(idx);
    setElements(history[idx].map(e => ({ ...e })));
    setSelectedId(null);
  }

  // ── Coordinates ────────────────────────────────────────────────────────────
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (canvas.width / rect.width),
      (e.clientY - rect.top)  * (canvas.height / rect.height),
    ];
  }

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (editingId) return;
    const [px, py] = toCanvas(e);

    if (selectedId) {
      const selEl = elements.find(el => el.id === selectedId);
      if (selEl) {
        const h = hitHandle(px, py, selEl);
        if (h) {
          dragging.current = {
            elId: selectedId,
            startX: px, startY: py,
            origX: selEl.x, origY: selEl.y,
            origW: selEl.w, origH: selEl.h,
            origRot: selEl.rot,
            mode: h,
          };
          return;
        }
      }
    }

    const sorted = [...elements].sort((a, b) => b.z - a.z);
    for (const el of sorted) {
      if (hitTest(px, py, el)) {
        setSelectedId(el.id);
        dragging.current = {
          elId: el.id,
          startX: px, startY: py,
          origX: el.x, origY: el.y,
          origW: el.w, origH: el.h,
          origRot: el.rot,
          mode: "move",
        };
        return;
      }
    }
    setSelectedId(null);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const [px, py] = toCanvas(e);

    // Update cursor
    if (!dragging.current) {
      if (selectedId) {
        const selEl = elements.find(el => el.id === selectedId);
        if (selEl) {
          const h = hitHandle(px, py, selEl);
          if (h === "rotate") { setCursor("crosshair"); return; }
          if (h?.startsWith("resize")) { setCursor("nwse-resize"); return; }
          if (hitTest(px, py, selEl)) { setCursor("grab"); return; }
        }
      }
      const topEl = [...elements].sort((a, b) => b.z - a.z).find(el => hitTest(px, py, el));
      setCursor(topEl ? "pointer" : "default");
      return;
    }

    setCursor(dragging.current.mode === "move" ? "grabbing" : "nwse-resize");
    const d = dragging.current;
    const dx = px - d.startX;
    const dy = py - d.startY;

    setElements(prev => prev.map(el => {
      if (el.id !== d.elId) return el;
      if (d.mode === "move") {
        return { ...el, x: d.origX + dx, y: d.origY + dy };
      }
      if (d.mode === "rotate") {
        const elCx = el.x + el.w / 2;
        const elCy = el.y + el.h / 2;
        const deg = Math.atan2(py - elCy, px - elCx) * 180 / Math.PI + 90;
        return { ...el, rot: deg };
      }
      if (d.mode === "resize-se") {
        return { ...el, w: Math.max(20, d.origW + dx), h: Math.max(20, d.origH + dy) };
      }
      if (d.mode === "resize-sw") {
        const nw = Math.max(20, d.origW - dx);
        return { ...el, x: d.origX + d.origW - nw, w: nw, h: Math.max(20, d.origH + dy) };
      }
      if (d.mode === "resize-ne") {
        const nh = Math.max(20, d.origH - dy);
        return { ...el, y: d.origY + d.origH - nh, w: Math.max(20, d.origW + dx), h: nh };
      }
      if (d.mode === "resize-nw") {
        const nw = Math.max(20, d.origW - dx);
        const nh = Math.max(20, d.origH - dy);
        return { ...el, x: d.origX + d.origW - nw, y: d.origY + d.origH - nh, w: nw, h: nh };
      }
      return el;
    }));
  }

  function onMouseUp() {
    if (dragging.current) {
      pushHistory(elements);
      dragging.current = null;
    }
  }

  function onDblClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const [px, py] = toCanvas(e);
    const sorted = [...elements].sort((a, b) => b.z - a.z);
    for (const el of sorted) {
      if (el.type === "text" && hitTest(px, py, el)) {
        setEditingId(el.id);
        setDraftText(el.text ?? "");
        setSelectedId(el.id);
        return;
      }
    }
  }

  // ── Element operations ─────────────────────────────────────────────────────
  function addText() {
    const el: EditorElement = {
      id: uid(), type: "text",
      x: cw / 2 - 240, y: ch / 2 - 60, w: 480, h: 120,
      rot: 0, z: elements.length,
      text: "Texto aqui", fontSize: 60,
      fontFamily: "Inter, sans-serif", textColor: "#000000",
      bold: false, italic: false, textAlign: "center",
    };
    const next = [...elements, el];
    setElements(next);
    pushHistory(next);
    setSelectedId(el.id);
  }

  function addRect() {
    const el: EditorElement = {
      id: uid(), type: "rect",
      x: cw / 2 - 180, y: ch / 2 - 120, w: 360, h: 240,
      rot: 0, z: elements.length, fill: "#7c3aed", opacity: 1,
    };
    const next = [...elements, el];
    setElements(next);
    pushHistory(next);
    setSelectedId(el.id);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const w = Math.round(cw * 0.5);
        const h = Math.round(w / aspect);
        imgCache.current.set(src, img);
        const el: EditorElement = {
          id: uid(), type: "image",
          x: cw / 2 - w / 2, y: ch / 2 - h / 2, w, h,
          rot: 0, z: elements.length, src, opacity: 1,
        };
        const next = [...elements, el];
        setElements(next);
        pushHistory(next);
        setSelectedId(el.id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function deleteSelected() {
    if (!selectedId) return;
    const next = elements.filter(e => e.id !== selectedId);
    setElements(next);
    pushHistory(next);
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedId) return;
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;
    const dup: EditorElement = { ...el, id: uid(), x: el.x + 30, y: el.y + 30, z: elements.length };
    const next = [...elements, dup];
    setElements(next);
    pushHistory(next);
    setSelectedId(dup.id);
  }

  function bringForward() {
    if (!selectedId) return;
    setElements(prev => prev.map(el =>
      el.id === selectedId ? { ...el, z: el.z + 1 } : el
    ));
  }

  function sendBackward() {
    if (!selectedId) return;
    setElements(prev => prev.map(el =>
      el.id === selectedId ? { ...el, z: Math.max(0, el.z - 1) } : el
    ));
  }

  function updateSel(patch: Partial<EditorElement>) {
    if (!selectedId) return;
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...patch } : el));
  }

  function commitText() {
    if (!editingId) return;
    const next = elements.map(el =>
      el.id === editingId ? { ...el, text: draftText } : el
    );
    setElements(next);
    pushHistory(next);
    setEditingId(null);
  }

  // ── Preset switch ──────────────────────────────────────────────────────────
  function switchPreset(p: Preset) {
    if (p === preset) return;
    setPreset(p);
    setElements([]);
    setSelectedId(null);
    setHistory([[]]);
    setHistIdx(0);
  }

  // ── Export PNG ─────────────────────────────────────────────────────────────
  function exportPNG() {
    const offscreen = document.createElement("canvas");
    offscreen.width  = cw;
    offscreen.height = ch;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);

    const sorted = [...elements].sort((a, b) => a.z - b.z);
    for (const el of sorted) {
      ctx.save();
      ctx.globalAlpha = el.opacity ?? 1;
      const cx2 = el.x + el.w / 2;
      const cy2 = el.y + el.h / 2;
      ctx.translate(cx2, cy2);
      ctx.rotate((el.rot * Math.PI) / 180);

      if (el.type === "rect") {
        ctx.fillStyle = el.fill ?? "#7c3aed";
        ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h);
      } else if (el.type === "text" && el.text) {
        const fs = el.fontSize ?? 48;
        const weight = el.bold ? "bold" : "normal";
        const style  = el.italic ? "italic" : "normal";
        ctx.font = `${style} ${weight} ${fs}px ${el.fontFamily ?? "Inter, sans-serif"}`;
        ctx.fillStyle = el.textColor ?? "#000000";
        ctx.textBaseline = "top";
        ctx.textAlign = el.textAlign ?? "left";
        const lines = wrapText(ctx, el.text, el.w);
        const lineH = fs * 1.3;
        const totalH = lines.length * lineH;
        let sy = -el.h / 2 + Math.max(0, (el.h - totalH) / 2);
        let sx = -el.w / 2;
        if (ctx.textAlign === "center") sx = 0;
        else if (ctx.textAlign === "right") sx = el.w / 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], sx, sy + i * lineH);
        }
      } else if (el.type === "image" && el.src) {
        const img = imgCache.current.get(el.src);
        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -el.w / 2, -el.h / 2, el.w, el.h);
        }
      }
      ctx.restore();
    }

    const link = document.createElement("a");
    link.download = `editor-os-${preset}-${Date.now()}.png`;
    link.href = offscreen.toDataURL("image/png");
    link.click();

    showSaved("PNG exportado!");
  }

  // ── Local draft ────────────────────────────────────────────────────────────
  function saveDraft() {
    try {
      localStorage.setItem(
        `editor_os_draft_${clientName ?? "default"}_${preset}`,
        JSON.stringify({ preset, elements, bgColor })
      );
      showSaved("Rascunho salvo neste navegador.");
    } catch {}
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(`editor_os_draft_${clientName ?? "default"}_${preset}`);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.elements)) {
        setElements(data.elements);
        pushHistory(data.elements);
      }
      if (data.bgColor) setBgColor(data.bgColor);
    } catch {}
  }

  // Load draft on mount / preset change
  useEffect(() => { loadDraft(); }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  function showSaved(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (meta && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if (meta && e.key === "d") { e.preventDefault(); duplicateSelected(); }
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement?.tagName !== "INPUT") {
        deleteSelected();
      }
      if (e.key === "Escape") { setEditingId(null); setSelectedId(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedId, elements, histIdx, history]); // eslint-disable-line react-hooks/exhaustive-deps

  const selEl = elements.find(e => e.id === selectedId) ?? null;

  // ── Overlay text input position ────────────────────────────────────────────
  function getOverlayStyle(): React.CSSProperties | null {
    if (!editingId || !canvasRef.current) return null;
    const el = elements.find(e => e.id === editingId);
    if (!el) return null;
    const rect    = canvasRef.current.getBoundingClientRect();
    const scaleX  = rect.width  / cw;
    const scaleY  = rect.height / ch;
    const contRect = containerRef.current?.getBoundingClientRect() ?? rect;
    return {
      position:      "absolute",
      left:          rect.left - contRect.left + el.x * scaleX,
      top:           rect.top  - contRect.top  + el.y * scaleY,
      width:         el.w * scaleX,
      height:        el.h * scaleY,
      fontSize:      (el.fontSize ?? 48) * scaleX,
      fontFamily:    el.fontFamily ?? "Inter, sans-serif",
      fontWeight:    el.bold ? "bold" : "normal",
      fontStyle:     el.italic ? "italic" : "normal",
      color:         el.textColor ?? "#000",
      textAlign:     el.textAlign ?? "left",
      lineHeight:    "1.3",
      background:    "rgba(255,255,255,0.05)",
      border:        "2px solid #7c3aed",
      outline:       "none",
      resize:        "none",
      padding:       0,
      zIndex:        20,
      transform:     `rotate(${el.rot}deg)`,
      transformOrigin: "top left",
      overflow:      "hidden",
      boxSizing:     "border-box",
    };
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 select-none">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 flex items-center gap-1.5 flex-wrap">
        {/* Presets */}
        <div className="flex gap-0.5 border border-zinc-700 rounded-lg p-0.5 mr-1">
          {(["feed", "story", "carousel"] as Preset[]).map(p => (
            <button
              key={p}
              onClick={() => switchPreset(p)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                preset === p ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {PRESETS[p].label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-zinc-700" />

        {/* Add tools */}
        <button onClick={addText}
          className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors">
          <Type className="w-3.5 h-3.5" /> Texto
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors">
          <ImageIcon className="w-3.5 h-3.5" /> Imagem
        </button>
        <button onClick={addRect}
          className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors">
          <Square className="w-3.5 h-3.5" /> Forma
        </button>

        <div className="w-px h-4 bg-zinc-700" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={histIdx <= 0}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors" title="Desfazer (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} disabled={histIdx >= history.length - 1}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors" title="Refazer (Ctrl+Y)">
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-700" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(1)))}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1" />

        {/* BG color */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Fundo</span>
          <input
            type="color"
            value={bgColor}
            onChange={e => setBgColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-zinc-600 p-0.5 bg-transparent"
            title="Cor do fundo"
          />
        </div>

        <button onClick={saveDraft}
          className="text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors">
          Salvar rascunho
        </button>

        <button onClick={exportPNG}
          className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar PNG
        </button>
      </div>

      {/* Saved message */}
      {savedMsg && (
        <div className="bg-zinc-800/80 text-zinc-300 text-xs text-center py-1 px-4">
          {savedMsg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Canvas area ────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-zinc-900 flex items-start justify-center p-6"
          style={{ position: "relative" }}
        >
          {/* Checkerboard bg to show canvas boundaries */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <canvas
              ref={canvasRef}
              style={{ cursor, display: "block", boxShadow: "0 0 0 1px #3f3f46" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onDoubleClick={onDblClick}
            />
            {/* Text editing overlay */}
            {editingId && (() => {
              const s = getOverlayStyle();
              if (!s) return null;
              return (
                <textarea
                  style={s}
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  onBlur={commitText}
                  onKeyDown={e => {
                    if (e.key === "Escape") { commitText(); }
                  }}
                  autoFocus
                />
              );
            })()}
          </div>
        </div>

        {/* ── Properties panel ────────────────────────────────────────── */}
        {selEl && (
          <aside className="w-52 shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto">
            <div className="p-3 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                {selEl.type === "text" ? "Texto" : selEl.type === "image" ? "Imagem" : "Forma"}
              </p>

              {/* Position & size */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "X", key: "x" as const, min: -cw },
                    { label: "Y", key: "y" as const, min: -ch },
                    { label: "W", key: "w" as const, min: 1 },
                    { label: "H", key: "h" as const, min: 1 },
                  ].map(({ label, key, min }) => (
                    <div key={key}>
                      <p className="text-[9px] text-zinc-500 mb-0.5">{label}</p>
                      <input
                        type="number"
                        value={Math.round(selEl[key] as number)}
                        onChange={e => updateSel({ [key]: Math.max(min, parseInt(e.target.value, 10) || 0) })}
                        onBlur={() => pushHistory(elements)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Rotation */}
                <div>
                  <p className="text-[9px] text-zinc-500 mb-0.5">Rotação (°)</p>
                  <input
                    type="number"
                    value={Math.round(selEl.rot)}
                    onChange={e => updateSel({ rot: parseInt(e.target.value, 10) || 0 })}
                    onBlur={() => pushHistory(elements)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Opacity */}
                <div>
                  <p className="text-[9px] text-zinc-500 mb-0.5">Opacidade</p>
                  <input
                    type="range"
                    min={0} max={1} step={0.05}
                    value={selEl.opacity ?? 1}
                    onChange={e => updateSel({ opacity: parseFloat(e.target.value) })}
                    onMouseUp={() => pushHistory(elements)}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Text properties */}
              {selEl.type === "text" && (
                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  {/* Font size */}
                  <div>
                    <p className="text-[9px] text-zinc-500 mb-0.5">Tamanho</p>
                    <input
                      type="number"
                      min={8} max={400}
                      value={selEl.fontSize ?? 48}
                      onChange={e => updateSel({ fontSize: Math.max(8, parseInt(e.target.value, 10) || 48) })}
                      onBlur={() => pushHistory(elements)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Font family */}
                  <div>
                    <p className="text-[9px] text-zinc-500 mb-0.5">Fonte</p>
                    <select
                      value={selEl.fontFamily ?? "Inter, sans-serif"}
                      onChange={e => { updateSel({ fontFamily: e.target.value }); pushHistory(elements); }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                    >
                      {FONTS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Text color */}
                  <div>
                    <p className="text-[9px] text-zinc-500 mb-0.5">Cor do texto</p>
                    <input
                      type="color"
                      value={selEl.textColor ?? "#000000"}
                      onChange={e => updateSel({ textColor: e.target.value })}
                      onBlur={() => pushHistory(elements)}
                      className="w-full h-7 rounded cursor-pointer border border-zinc-600 bg-transparent p-0.5"
                    />
                  </div>

                  {/* Bold / Italic */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => { updateSel({ bold: !selEl.bold }); pushHistory(elements); }}
                      className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs transition-colors ${
                        selEl.bold ? "bg-indigo-600 border-indigo-500 text-white" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                      title="Negrito"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { updateSel({ italic: !selEl.italic }); pushHistory(elements); }}
                      className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs transition-colors ${
                        selEl.italic ? "bg-indigo-600 border-indigo-500 text-white" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                      title="Itálico"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Text align */}
                  <div className="flex gap-1">
                    {(["left", "center", "right"] as const).map(a => {
                      const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                      return (
                        <button
                          key={a}
                          onClick={() => { updateSel({ textAlign: a }); pushHistory(elements); }}
                          className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs transition-colors ${
                            (selEl.textAlign ?? "left") === a
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Edit text button */}
                  <button
                    onClick={() => { setEditingId(selEl.id); setDraftText(selEl.text ?? ""); }}
                    className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-1.5 border border-zinc-700 transition-colors"
                  >
                    Editar texto
                  </button>
                </div>
              )}

              {/* Rect fill color */}
              {selEl.type === "rect" && (
                <div className="pt-1 border-t border-zinc-800">
                  <p className="text-[9px] text-zinc-500 mb-0.5">Cor</p>
                  <input
                    type="color"
                    value={selEl.fill ?? "#7c3aed"}
                    onChange={e => updateSel({ fill: e.target.value })}
                    onBlur={() => pushHistory(elements)}
                    className="w-full h-7 rounded cursor-pointer border border-zinc-600 bg-transparent p-0.5"
                  />
                </div>
              )}

              {/* Layer & element actions */}
              <div className="pt-1 border-t border-zinc-800 space-y-1.5">
                <div className="flex gap-1">
                  <button onClick={bringForward}
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-lg py-1.5 transition-colors"
                    title="Trazer para frente">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={sendBackward}
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-lg py-1.5 transition-colors"
                    title="Enviar para trás">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={duplicateSelected}
                  className="w-full flex items-center justify-center gap-1 text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-lg py-1.5 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                <button onClick={deleteSelected}
                  className="w-full flex items-center justify-center gap-1 text-xs border border-red-900/50 text-red-400 hover:bg-red-950/40 rounded-lg py-1.5 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Empty state when no element selected */}
        {!selEl && elements.length === 0 && (
          <aside className="w-52 shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center p-4 gap-2">
            <FlaskConical className="w-8 h-8 text-zinc-700" />
            <p className="text-xs text-zinc-600 text-center">
              Adicione texto, imagem ou forma para começar
            </p>
            <p className="text-[10px] text-zinc-700 text-center mt-2">
              Rascunho salvo localmente — não representa persistência em nuvem
            </p>
          </aside>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
