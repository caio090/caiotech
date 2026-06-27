# UI Motion & Style Guide — LOKAT OS

> Design dark-premium como padrão. Clean como opção futura (sem toggle na V1).

---

## Identidade visual

**Paleta dark-premium:**
```
bg principal:  #0a0a0f
card:          #12121a
border:        #ffffff12
texto:         #f0f0f5
muted:         #888899
accent:        #7b6ef6
```

**Tipografia:**
- Títulos: `Plus Jakarta Sans` — peso 700, letter-spacing -0.03em
- Mono/tags: `JetBrains Mono` — peso 500, letter-spacing 0.18em, uppercase

---

## Glassmorphism

```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
```

---

## Radial gradient background

```css
.bg-radial-premium {
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, #7b6ef614 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 80% 80%, #a855f70a 0%, transparent 60%),
    #0a0a0f;
}
```

---

## Glow / hover glow

```css
.glow-hover {
  transition: box-shadow 0.3s ease;
}
.glow-hover:hover {
  box-shadow: 0 0 32px #7b6ef630, 0 0 8px #7b6ef618;
}

/* Pulsante */
.glow-pulse {
  animation: lokat-glow 5s ease-in-out infinite;
}
@keyframes lokat-glow {
  0%, 100% { box-shadow: 0 0 20px #7b6ef625; }
  50%       { box-shadow: 0 0 40px #7b6ef645, 0 0 80px #7b6ef610; }
}
```

---

## Animações CSS — globals.css

### Hero fade-up (entrada escalonada)

```css
.hero-fade-up    { animation: lk-fade-up 0.7s ease both; }
.hero-fade-up-d1 { animation: lk-fade-up 0.7s 0.15s ease both; }
.hero-fade-up-d2 { animation: lk-fade-up 0.7s 0.3s ease both; }
.hero-fade-up-d3 { animation: lk-fade-up 0.7s 0.45s ease both; }

@keyframes lk-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Float suave

```css
.lk-drop-float {
  animation: lk-drop-float 4s ease-in-out infinite;
}
@keyframes lk-drop-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
```

### Orbital (seção processo)

```css
/* Anel lento, sentido horário */
.orbit-slow {
  animation: lokat-orbit 22s linear infinite;
  transform-origin: center;
  transform-box: fill-box;
}

/* Anel rápido, sentido anti-horário */
.orbit-rev {
  animation: lokat-orbit-rev 35s linear infinite;
}

@keyframes lokat-orbit     { to { transform: rotate(360deg); } }
@keyframes lokat-orbit-rev { to { transform: rotate(-360deg); } }
```

---

## Scroll reveal (JS puro — sem Framer Motion)

```tsx
"use client";
import { useEffect, useRef } from "react";

export function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); } },
      { threshold }
    );
    el.style.cssText += "opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease;";
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}
```

---

## Staggered reveal (lista de cards)

```tsx
// Aplica delay progressivo nos filhos via CSS custom property
function StaggerList({ children }: { children: React.ReactNode[] }) {
  return (
    <div>
      {children.map((child, i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }} className="stagger-item">
          {child}
        </div>
      ))}
    </div>
  );
}
```

```css
.stagger-item {
  animation: lk-fade-up 0.5s ease both;
}
```

---

## Framer Motion (quando necessário)

Usar Framer Motion apenas em animações interativas complexas (drag, layout, shared element).
Para fade-in, scroll-reveal e stagger: preferir CSS + IntersectionObserver (menor bundle).

```tsx
// Exemplo básico com Framer Motion
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  ...
</motion.div>
```

---

## Regras

- **Nunca** adicionar toggle de tema na UI antes de V2
- **Nunca** usar `white` ou `#fff` como fundo de página no dark-premium
- Cards usam `#12121a` ou glass, nunca fundo branco sólido
- Animações de entrada: max 600ms, easing ease-out
- Glow: sempre com `opacity` baixa para não poluir (max `#color30`)
- Motion reduzido: respeitar `prefers-reduced-motion` com `@media`
