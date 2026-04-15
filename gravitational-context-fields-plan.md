# Gravitational Context Fields — Implementation Plan

## Overview

A single-page HTML application implementing a spatial thought-mapping canvas where nodes exert gravitational influence on each other. The AI assembles its context window by weighting nodes based on proximity and mass relative to a user-designated focal point. The canvas supports inertial physics, zoom/pan navigation, persistent storage, and live LLM conversation.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Single HTML File                   │
├─────────────────────────────────────────────────────┤
│  Rendering          │  Simulation        │  State    │
│  ─────────          │  ──────────        │  ─────    │
│  Canvas (grid,      │  Verlet integrator │  Nodes[]  │
│  gravity wells,     │  Gravity forces    │  Edges[]  │
│  connection lines)  │  Drag constraints  │  Focal ID │
│  DOM (node cards)   │  Inertia/damping   │  Pan/Zoom │
│  CSS transforms     │  Collision bounds  │  Config   │
├─────────────────────┼────────────────────┼───────────┤
│  AI Layer           │  Storage Layer     │           │
│  ────────           │  ─────────────     │           │
│  Context assembler  │  localStorage      │           │
│  Anthropic API call │  Auto-save timer   │           │
│  Response renderer  │  Import/Export     │           │
└─────────────────────┴────────────────────┴───────────┘
```

### Why single-file HTML?

The entire application ships as one `index.html`. All CSS is inlined in `<style>`, all JS in `<script>`. External dependencies are loaded from CDNs. This keeps the artifact self-contained, shareable, and forkable.

---

## 1. Physics Engine — Inertial Gravity Simulation

### Framework choice: Custom Verlet integration

No library needed. A Verlet integrator is ~40 lines of code and gives us exactly the behavior we want: position-based physics with natural damping, no velocity drift, and trivial constraint solving.

### Data model per node

```js
{
  id: string,
  x: number,            // current position
  y: number,
  prevX: number,        // previous position (Verlet needs this)
  prevY: number,
  pinned: boolean,      // user is dragging or has locked it
  mass: number,         // computed from content + connections + references
  title: string,
  body: string,
  references: number,   // times this node was set as focal
  createdAt: number,
  updatedAt: number
}
```

### Simulation loop

Runs at 60fps via `requestAnimationFrame`. Each tick:

1. **Accumulate forces** — For every node pair, compute gravitational attraction:
   ```
   F = G * (m1 * m2) / (d² + softening)
   ```
   Softening term (`ε² ≈ 400`) prevents singularities when nodes overlap. Attraction is capped so nodes don't slingshot.

2. **Apply boundary repulsion** — Soft bounce off canvas edges so nodes don't escape the viewport.

3. **Verlet integrate** — Update positions:
   ```
   newX = x + (x - prevX) * damping + ax * dt²
   ```
   Damping factor of `0.97` gives a smooth deceleration that feels like sliding on ice, then settling.

4. **Constraint pass** — Pinned nodes (being dragged) snap to cursor. Minimum separation enforced so nodes don't collapse into each other.

5. **Sync DOM** — Update each node's `transform: translate()` to match physics position. Using `transform` instead of `left/top` keeps updates on the compositor thread.

### Drag interaction with inertia

When the user grabs a node:
- Pin the node to cursor, record last N cursor positions (ring buffer, 5 frames)
- On release, compute exit velocity from the buffer's delta
- Unpin and let Verlet carry the momentum forward
- The node arcs away and then curves back toward nearby massive nodes — the "escape velocity" feel

When a node enters a heavy node's gravity well (distance < well radius):
- Visual: subtle particle trail, grid distortion intensifies
- Haptic analog: CSS `transition-timing-function` shifts to `ease-in` on approach, simulating acceleration into the well

### Mass computation

```js
function computeMass(node) {
  const textMass = (node.title.length + node.body.length) / 50;
  const connectionMass = countNearbyNodes(node, GRAVITY_RADIUS) * 0.8;
  const refMass = node.references * 0.5;
  const ageMass = Math.min(daysSinceCreation(node) * 0.1, 1.0);
  return BASE_MASS + textMass + connectionMass + refMass + ageMass;
}
```

Mass grows organically: write more in a node, link it to more neighbors, reference it more often, and it gets heavier. No manual mass slider — the physics emerge from use.

---

## 2. Canvas — Zoom and Pan

### Transform model

A single `viewTransform` object tracks the camera:

```js
const view = {
  x: 0,       // pan offset in world coords
  y: 0,
  scale: 1,   // zoom level
  minScale: 0.15,
  maxScale: 3.0
};
```

All rendering goes through `worldToScreen(wx, wy)` and `screenToWorld(sx, sy)` converters. The grid canvas, connection SVG, and node DOM layer all share the same transform.

### Implementation

The node layer (`#node-layer`) gets a single CSS transform:
```css
transform: translate(${panX}px, ${panY}px) scale(${scale});
transform-origin: 0 0;
```

The grid `<canvas>` redraws on every pan/zoom tick, applying the transform in its drawing math. This is cheaper than transforming the canvas element because we need to redraw the distorted grid anyway.

### Interaction

| Input | Action |
|---|---|
| Scroll wheel | Zoom toward cursor (focal zoom) |
| Middle-click drag / two-finger drag | Pan |
| Pinch (touch) | Zoom |
| Trackpad scroll | Pan (with momentum) |
| `Ctrl + 0` | Reset view to fit all nodes |

Focal zoom formula (zoom targets the cursor position, not the center):
```js
const worldBeforeZoom = screenToWorld(cursorX, cursorY);
view.scale *= (delta > 0) ? 1.08 : 0.92;
view.scale = clamp(view.scale, view.minScale, view.maxScale);
const worldAfterZoom = screenToWorld(cursorX, cursorY);
view.x += (worldAfterZoom.x - worldBeforeZoom.x) * view.scale;
view.y += (worldAfterZoom.y - worldBeforeZoom.y) * view.scale;
```

### Level-of-detail

At low zoom levels (scale < 0.4), node bodies collapse to title-only pills. At very low zoom (scale < 0.2), nodes become colored dots with no text — showing the topological shape of the thought map. This keeps the canvas readable at any zoom level and improves rendering performance with hundreds of nodes.

---

## 3. Persistent Storage

### Primary store: `localStorage`

Chosen for zero-setup, synchronous reads, and 5–10MB capacity which is more than enough for thousands of nodes.

### Schema

```js
// Key: 'gcf_canvas_<canvasId>'
{
  version: 2,
  canvasId: string,
  name: string,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  focalNodeId: string | null,
  viewTransform: { x, y, scale },
  nodes: [
    { id, x, y, title, body, references, pinned, createdAt, updatedAt }
  ],
  conversationHistory: [
    { role: 'user' | 'assistant', content: string, focalNodeId: string, timestamp: ISO8601 }
  ]
}
```

### Save strategy

- **Auto-save**: Debounced at 2 seconds after any mutation (node move, text edit, conversation message). Uses `structuredClone` to snapshot current state, then `JSON.stringify` to localStorage.
- **Manual save**: `Ctrl+S` triggers immediate save with a brief toast confirmation.
- **Multiple canvases**: A canvas picker UI lists all saved canvases by name and last-modified date. Create new, duplicate, delete.

### Import / Export

- **Export**: Downloads the full JSON blob as `canvas-name.gcf.json`
- **Import**: File input accepts `.gcf.json`, validates schema version, and loads

### Migration

The `version` field enables forward-compatible schema changes. A `migrate(data)` function runs on load and upgrades old schemas to current.

---

## 4. AI Integration — Context Assembly and LLM Call

This is the core innovation: the spatial canvas directly determines what the AI "pays attention to."

### Context assembly pipeline

When the user sends a message (or the AI is triggered by a focal node change):

```
Step 1: Identify focal node
Step 2: Compute context weight for every node
Step 3: Sort by weight descending
Step 4: Greedily pack nodes into context budget
Step 5: Assemble system prompt + weighted context + user message
Step 6: Call Anthropic API
Step 7: Render response, optionally create/update nodes from it
```

### Weight computation

```js
function contextWeight(node, focalNode) {
  const dist = Math.hypot(node.x - focalNode.x, node.y - focalNode.y);
  const proximity = Math.max(0, 1 - dist / (GRAVITY_RADIUS * 3));
  const mass = computeMass(node);
  const isFocal = node.id === focalNode.id ? 1.0 : 0;

  return isFocal
    ? 1.0
    : Math.pow(proximity, 2) * (mass / MAX_EXPECTED_MASS);
}
```

Squared proximity creates a sharp falloff — nodes just outside the gravity field contribute almost nothing, while nodes deep in the well dominate. This matches the visual distortion.

### Context budget packing

```js
const TOKEN_BUDGET = 6000; // reserve for context, rest for system + response
const sorted = nodes
  .map(n => ({ node: n, weight: contextWeight(n, focalNode) }))
  .filter(({ weight }) => weight > 0.01)
  .sort((a, b) => b.weight - a.weight);

let usedTokens = 0;
const included = [];
for (const { node, weight } of sorted) {
  const tokens = estimateTokens(node.title + node.body);
  if (usedTokens + tokens > TOKEN_BUDGET) continue;
  included.push({ node, weight });
  usedTokens += tokens;
}
```

### Prompt structure

```
SYSTEM:
You are a thinking partner. The user is working on a spatial thought
canvas where ideas are arranged by importance and proximity. Below is
the context assembled from their canvas, weighted by spatial relevance
to their current focal point.

CONTEXT (sorted by relevance):
━━━ [100%] Core Thesis (FOCAL POINT)
"AI agents need spatial reasoning about their own context..."

━━━ [72%] Attention is Spatial
"Human cognition treats importance as proximity..."

━━━ [45%] Embodied Cognition
"Thinking is shaped by spatial and physical metaphors..."

━━━ [12%] Graph DBs
"Knowledge graphs capture relationships but not spatial intuition"

USER MESSAGE:
{user's question or prompt}
```

The weight percentages are included in the prompt so the AI can calibrate its response — leaning heavily on high-weight nodes and only lightly referencing low-weight context.

### API call

```js
async function queryAI(userMessage) {
  const contextBlock = assembleContext(focalNodeId);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT + '\n\n' + contextBlock,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ]
    })
  });

  const data = await response.json();
  const reply = data.content.map(b => b.text || '').join('');

  conversationHistory.push({ role: 'user', content: userMessage });
  conversationHistory.push({ role: 'assistant', content: reply });

  return reply;
}
```

### Response rendering

The AI response appears in a slide-out conversation panel anchored to the focal node. Optionally, the user can "extract" key claims from the response into new canvas nodes — the AI can suggest these by returning structured data alongside its prose.

### Conversation scoping

Each conversation is scoped to a focal node. Switching focal nodes starts a new conversational thread (though old threads persist and can be revisited). This means the AI's memory is spatially local — it remembers conversations "in this region" of the canvas.

---

## 5. Rendering Pipeline

### Layer stack (bottom to top)

| Layer | Technology | Content |
|---|---|---|
| 0 | `<canvas>` | Background gradient, gravity well glows, distorted grid |
| 1 | `<svg>` | Connection lines between nearby nodes (dashed, opacity-mapped) |
| 2 | `<div>` container | Node cards (DOM elements with CSS transforms) |
| 3 | Fixed-position DOM | HUD, controls, context panel, conversation panel |

### Render budget

The grid canvas is the most expensive layer (distortion requires per-vertex force accumulation). Optimizations:

- **Spatial hash**: Divide canvas into cells. Each grid vertex only checks nodes in its cell ± 1 neighbor. Reduces gravity calculation from O(vertices × nodes) to O(vertices × ~3 nodes).
- **Throttled grid redraw**: Grid redraws at 30fps max during drag, 10fps during idle settle. Node DOM updates stay at 60fps since they're just transform changes.
- **Off-screen culling**: Skip grid vertices and nodes outside the current viewport (accounting for zoom/pan).

### Node DOM structure

```html
<div class="node" style="transform: translate(Xpx, Ypx)">
  <div class="mass-indicator"></div>
  <div class="title" contenteditable>...</div>
  <div class="body" contenteditable>...</div>
  <div class="context-weight-bar">
    <div class="fill" style="width: W%"></div>
  </div>
  <div class="meta">mass: M · weight: W%</div>
</div>
```

Using `contenteditable` for inline editing avoids modal dialogs. Focus/blur events toggle between edit mode (cursor: text, physics paused for this node) and canvas mode (cursor: grab, physics active).

---

## 6. UI Components

### Conversation panel

A slide-out drawer anchored to the right edge. Contains:
- Text input with send button
- Scrollable message history (scoped to current focal node)
- "Extract to node" button on each AI response
- Animated typing indicator during API call

### Context weights sidebar

Shows the ranked list of nodes by context weight, with mini progress bars. Clicking a node in the list pans/zooms to it on the canvas. Live-updates as the user drags nodes.

### Canvas controls

Minimal bottom-center toolbar:
- **Fit all**: Zoom to show all nodes
- **Add node**: Alternative to double-click
- **Toggle physics**: Pause/resume simulation
- **Toggle grid**: Show/hide the distortion grid
- **Save indicator**: Dot that pulses on auto-save

### Minimap

A small (160×100px) overview in the bottom-right corner showing all nodes as dots with the current viewport as a rectangle. Click to jump. Essential once the canvas grows beyond one screen.

---

## 7. External Dependencies (CDN)

| Library | Version | Purpose |
|---|---|---|
| None required | — | Core app is vanilla JS |
| `marked` (optional) | 15.x | Render markdown in AI responses |
| Google Fonts | — | DM Mono + Instrument Serif |

The deliberate choice to avoid frameworks (React, Vue) keeps the file self-contained, eliminates build steps, and keeps the bundle tiny. The DOM manipulation is simple enough (< 100 nodes typically) that virtual DOM overhead is unnecessary.

---

## 8. File Structure (single file)

```
index.html
├── <style>
│   ├── CSS variables (theme)
│   ├── Canvas & layer layout
│   ├── Node card styles
│   ├── UI panel styles
│   └── Animations & transitions
│
├── <body>
│   ├── #canvas-container
│   │   ├── <canvas> (grid)
│   │   ├── <svg> (connections)
│   │   └── #node-layer (DOM nodes)
│   ├── #hud (title, instructions)
│   ├── #controls (toolbar)
│   ├── #context-panel (weights sidebar)
│   ├── #conversation-panel (AI chat)
│   └── #minimap
│
└── <script>
    ├── Config & constants
    ├── State (nodes, view, conversation)
    ├── Physics (Verlet, gravity, constraints)
    ├── Rendering (grid, connections, node sync)
    ├── Interaction (drag, pan, zoom, edit)
    ├── AI (context assembly, API call, response handling)
    ├── Storage (save, load, export, import)
    ├── UI (panels, minimap, controls)
    └── Init (load saved state or show welcome)
```

### Approximate size budget

| Section | Est. lines |
|---|---|
| CSS | ~250 |
| HTML structure | ~80 |
| Physics engine | ~120 |
| Grid renderer | ~100 |
| Node management | ~150 |
| Interaction (drag, pan, zoom) | ~180 |
| AI integration | ~120 |
| Storage layer | ~80 |
| UI panels | ~120 |
| **Total** | **~1,200** |

---

## 9. Implementation Sequence

Build in this order, each step producing a working artifact:

| Phase | Deliverable | Depends on |
|---|---|---|
| 1. Canvas + Pan/Zoom | Empty canvas with grid, pan, zoom, minimap | — |
| 2. Nodes + Editing | Create, edit, delete nodes on canvas | Phase 1 |
| 3. Physics | Verlet sim, gravity, inertial drag | Phase 2 |
| 4. Grid Distortion | Gravity-warped grid, well glows, connections | Phase 3 |
| 5. Context Weights | Focal node, weight computation, sidebar | Phase 4 |
| 6. Storage | Auto-save, load, multi-canvas, export/import | Phase 5 |
| 7. AI Chat | Context assembly, API call, conversation panel | Phase 5 |
| 8. Polish | LOD, minimap, animations, mobile touch, perf | All |

Each phase is independently testable and produces a usable (if incomplete) tool.
