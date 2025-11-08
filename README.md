# Arrows.js

**Lightweight, SSR-friendly arrow drawing library for connecting DOM elements**

Draw beautiful curved and straight arrows between any DOM elements with automatic positioning updates via ResizeObserver. Perfect for flowcharts, diagrams, network visualizations, and UI connection indicators.

## Features

- **Lightweight**: ~5KB minified, zero dependencies
- **SSR-Compatible**: Works with Phoenix LiveView, Next.js, and other server-side frameworks
- **Smart Positioning**: Automatic updates using ResizeObserver (not window resize events)
- **Curved & Straight**: Bezier curves or straight lines with configurable curvature
- **Anchor System**: Connect from any side (top, right, bottom, left, center) or let it auto-detect
- **Smooth Animations**: Beautiful draw-in effects using SVG stroke animations
- **Performance**: Single global SVG container, optimized for 50-100+ simultaneous arrows
- **Clean API**: Simple, tasteful design with sensible defaults
- **Framework Agnostic**: Vanilla JS that works everywhere

## Quick Start

### Installation

```bash
npm install arrows-js
```

Or use directly:

```html
<script type="module">
  import { Arrow, autoInit } from './src/arrows.js';
</script>
```

### Basic Usage

#### JavaScript API

```javascript
import { Arrow } from './src/arrows.js';

const arrow = new Arrow({
  from: '#element-a',        // Selector or DOM element
  to: '#element-b',          // Selector or DOM element
  fromAnchor: 'bottom',      // Where arrow starts: top, right, bottom, left, center, auto
  toAnchor: 'top',           // Where arrow ends
  color: '#667eea',          // Arrow color
  strokeWidth: 3,            // Line thickness
  curvature: 0.2,            // 0 = straight, 1 = very curved
  animationDuration: 300,    // Draw-in animation (ms)
});
```

#### HTML Data Attributes

```html
<!-- Define elements -->
<div id="box-a">Element A</div>
<div id="box-b">Element B</div>

<!-- Create arrow using data attributes -->
<div data-arrow
     data-from="#box-a"
     data-to="#box-b"
     data-from-anchor="right"
     data-to-anchor="left"
     data-color="#3b82f6"
     data-curvature="0.2">
</div>

<script type="module">
  import { autoInit } from './src/arrows.js';
  autoInit(); // Finds and initializes all [data-arrow] elements
</script>
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `from` | string \| Element | required | Source element (selector or DOM element) |
| `to` | string \| Element | required | Target element (selector or DOM element) |
| `fromAnchor` | string | `'auto'` | Start anchor: `top`, `right`, `bottom`, `left`, `center`, `auto` |
| `toAnchor` | string | `'auto'` | End anchor: `top`, `right`, `bottom`, `left`, `center`, `auto` |
| `color` | string | `'#64748b'` | Arrow color (any CSS color) |
| `strokeWidth` | number | `2` | Line thickness in pixels |
| `headSize` | number | `8` | Arrow head size |
| `curvature` | number | `0.2` | Curve amount: `0` = straight, `1` = very curved |
| `animationDuration` | number | `300` | Draw-in animation duration (ms), `0` to disable |

### Methods

```javascript
// Force update arrow position (usually automatic via ResizeObserver)
arrow.update();

// Change arrow color
arrow.setColor('#ff0000');

// Change curvature
arrow.setCurvature(0.5);

// Destroy arrow (with optional animation)
arrow.destroy({ animate: true });
```

### Auto-initialization

```javascript
import { autoInit } from './src/arrows.js';

// Initialize all arrows from data attributes
const arrows = autoInit();

// Returns array of Arrow instances
console.log(`Created ${arrows.length} arrows`);
```

## How It Works

### Automatic Position Updates

Unlike other libraries that rely on window resize events, **Arrows.js uses ResizeObserver** to watch connected elements:

```javascript
// Automatically updates when elements resize, move, or change
this.resizeObserver = new ResizeObserver(() => {
  this._scheduleUpdate();
});

this.resizeObserver.observe(this.from);
this.resizeObserver.observe(this.to);
```

This means:
- ✅ Updates when element size changes (e.g., content reflow, manual resize)
- ✅ Updates when elements are moved (absolute positioning changes)
- ✅ More efficient than polling or global resize listeners
- ✅ Perfect for dynamic UIs and LiveView applications

### SVG Rendering

Arrows.js creates a **single global SVG container** for all arrows:

```html
<div id="arrows-container">
  <svg>
    <defs>
      <!-- Reusable arrow markers -->
    </defs>
    <!-- All arrow paths -->
  </svg>
</div>
```

Benefits:
- Better performance (single paint layer)
- Smaller DOM (shared definitions)
- Easier z-index management

### Anchor System

```javascript
const ANCHORS = {
  'top': center of top edge,
  'right': center of right edge,
  'bottom': center of bottom edge,
  'left': center of left edge,
  'center': center of element,
  'auto': best anchor based on relative positions
};
```

## Phoenix LiveView Integration

### Using Phoenix Hooks

```javascript
// app.js
import { Arrow } from './arrows.js';

const ArrowHook = {
  mounted() {
    this.arrow = new Arrow({
      from: this.el.dataset.from,
      to: this.el.dataset.to,
      fromAnchor: this.el.dataset.fromAnchor,
      toAnchor: this.el.dataset.toAnchor,
      color: this.el.dataset.color,
    });
  },

  updated() {
    this.arrow.update();
  },

  destroyed() {
    this.arrow.destroy();
  }
};

let liveSocket = new LiveSocket("/live", Socket, {
  hooks: { ArrowLine: ArrowHook }
});
```

```elixir
# In your LiveView template
<div
  phx-hook="ArrowLine"
  data-from="#box-a"
  data-to="#box-b"
  data-from-anchor="bottom"
  data-to-anchor="top"
  data-color="#667eea">
</div>
```

## Examples

### Flowchart

```javascript
new Arrow({ from: '#step1', to: '#step2', fromAnchor: 'bottom', toAnchor: 'top' });
new Arrow({ from: '#step2', to: '#step3', fromAnchor: 'bottom', toAnchor: 'top' });
new Arrow({ from: '#step2', to: '#step4', fromAnchor: 'right', toAnchor: 'left' });
```

### Network Diagram (Hub & Spoke)

```javascript
const hub = '#central-node';
const nodes = ['#node1', '#node2', '#node3', '#node4'];

nodes.forEach(node => {
  new Arrow({
    from: node,
    to: hub,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    curvature: 0.15
  });
});
```

### Dependency Graph

```javascript
new Arrow({ from: '#moduleA', to: '#moduleB', color: '#3b82f6' });
new Arrow({ from: '#moduleA', to: '#moduleC', color: '#3b82f6' });
new Arrow({ from: '#moduleB', to: '#moduleD', color: '#10b981' });
```

## Performance

Tested with **100+ simultaneous arrows** with smooth performance:

- Uses `requestAnimationFrame` for batched updates
- Single global SVG container (not one per arrow)
- Cached arrow markers (reused by color)
- ResizeObserver instead of polling
- Efficient cleanup and memory management

## Browser Support

Modern browsers only (ES6+):
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

Uses:
- ResizeObserver
- MutationObserver
- SVG 2.0
- ES6 Classes

## Comparison with Leader-Line

| Feature | Leader-Line | Arrows.js |
|---------|-------------|-----------|
| Size | 50KB+ min | ~5KB min |
| SSR Support | ❌ Poor | ✅ Excellent |
| Phoenix Integration | ⚠️ Manual | ✅ Native |
| Performance | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐ (archived) | ⭐⭐⭐⭐⭐ |
| API Design | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Position Updates | Window resize | ResizeObserver |

## Development

```bash
# Start demo server
npm run dev

# Open browser to http://localhost:8000/demo/
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Roadmap

- [ ] TypeScript definitions
- [ ] npm package
- [ ] React/Vue/Svelte wrappers
- [ ] Advanced path routing (obstacle avoidance)
- [ ] Label support
- [ ] Accessibility improvements
