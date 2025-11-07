/**
 * arrows-js - Lightweight arrow drawing library
 * Connects DOM elements with curved or straight SVG arrows
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Tasteful default configuration
const DEFAULTS = {
  color: '#64748b',           // Slate 500 - neutral, professional
  strokeWidth: 2,             // Thin but visible
  headSize: 8,                // Proportional to stroke
  curvature: 0.2,            // Subtle curve (0 = straight, 1 = very curved)
  fromAnchor: 'auto',         // top, right, bottom, left, center, auto
  toAnchor: 'auto',
  animationDuration: 300,     // ms for draw-in animation
};

// Global SVG container (singleton for performance)
let globalSVGContainer = null;
let globalSVG = null;
let globalDefs = null;
let arrowMarkers = new Map(); // Cache arrow markers by color

/**
 * Initialize global SVG container
 */
function initGlobalSVG() {
  if (globalSVGContainer) return;

  globalSVGContainer = document.createElement('div');
  globalSVGContainer.id = 'arrows-container';
  globalSVGContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  `;

  globalSVG = document.createElementNS(SVG_NS, 'svg');
  globalSVG.style.cssText = 'width: 100%; height: 100%;';
  globalSVG.setAttribute('xmlns', SVG_NS);

  globalDefs = document.createElementNS(SVG_NS, 'defs');
  globalSVG.appendChild(globalDefs);

  globalSVGContainer.appendChild(globalSVG);
  document.body.appendChild(globalSVGContainer);
}

/**
 * Create or get cached arrow marker
 */
function getArrowMarker(color, size) {
  const key = `${color}-${size}`;

  if (arrowMarkers.has(key)) {
    return arrowMarkers.get(key);
  }

  const markerId = `arrow-${key.replace('#', '')}`;

  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', markerId);
  marker.setAttribute('markerWidth', size);
  marker.setAttribute('markerHeight', size);
  marker.setAttribute('refX', size);
  marker.setAttribute('refY', size / 2);
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', `M 0 0 L ${size} ${size / 2} L 0 ${size} z`);
  path.setAttribute('fill', color);

  marker.appendChild(path);
  globalDefs.appendChild(marker);

  arrowMarkers.set(key, markerId);
  return markerId;
}

/**
 * Anchor point calculations
 */
const ANCHORS = {
  top: (rect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top
  }),
  right: (rect) => ({
    x: rect.right,
    y: rect.top + rect.height / 2
  }),
  bottom: (rect) => ({
    x: rect.left + rect.width / 2,
    y: rect.bottom
  }),
  left: (rect) => ({
    x: rect.left,
    y: rect.top + rect.height / 2
  }),
  center: (rect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }),

  // Auto: choose best anchor based on relative positions
  auto: (fromRect, toRect) => {
    const fromCenter = {
      x: fromRect.left + fromRect.width / 2,
      y: fromRect.top + fromRect.height / 2,
    };
    const toCenter = {
      x: toRect.left + toRect.width / 2,
      y: toRect.top + toRect.height / 2,
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // Determine primary direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      return dx > 0 ? ANCHORS.right(fromRect) : ANCHORS.left(fromRect);
    } else {
      // Vertical
      return dy > 0 ? ANCHORS.bottom(fromRect) : ANCHORS.top(fromRect);
    }
  }
};

/**
 * Main Arrow class
 */
export class Arrow {
  constructor(options) {
    // Initialize global SVG if needed
    if (!globalSVGContainer) {
      initGlobalSVG();
    }

    // Resolve elements
    this.from = this._resolveElement(options.from);
    this.to = this._resolveElement(options.to);

    if (!this.from || !this.to) {
      console.error('Arrow: Invalid from/to elements', options);
      return;
    }

    // Configuration
    this.fromAnchor = options.fromAnchor || DEFAULTS.fromAnchor;
    this.toAnchor = options.toAnchor || DEFAULTS.toAnchor;
    this.color = options.color || DEFAULTS.color;
    this.strokeWidth = options.strokeWidth || DEFAULTS.strokeWidth;
    this.headSize = options.headSize || DEFAULTS.headSize;
    this.curvature = options.curvature ?? DEFAULTS.curvature;
    this.animationDuration = options.animationDuration ?? DEFAULTS.animationDuration;

    // SVG elements
    this.pathElement = null;
    this.markerId = getArrowMarker(this.color, this.headSize);

    // Observers
    this.resizeObserver = null;
    this.mutationObserver = null;

    // Bind methods
    this._updateBound = this.update.bind(this);
    this._onScrollBound = this._onScroll.bind(this);

    // Initialize
    this._init();
  }

  /**
   * Initialize arrow rendering and observers
   */
  _init() {
    // Create path element
    this.pathElement = document.createElementNS(SVG_NS, 'path');
    this.pathElement.setAttribute('stroke', this.color);
    this.pathElement.setAttribute('stroke-width', this.strokeWidth);
    this.pathElement.setAttribute('fill', 'none');
    this.pathElement.setAttribute('stroke-linecap', 'round');
    this.pathElement.setAttribute('stroke-linejoin', 'round');
    this.pathElement.setAttribute('marker-end', `url(#${this.markerId})`);

    globalSVG.appendChild(this.pathElement);

    // Initial render
    this._recalculatePath();

    // Animate in
    if (this.animationDuration > 0) {
      this._animateIn();
    }

    // Set up observers
    this._setupObservers();
  }

  /**
   * Set up ResizeObserver and MutationObserver
   */
  _setupObservers() {
    // ResizeObserver for element size changes
    this.resizeObserver = new ResizeObserver(() => {
      this._scheduleUpdate();
    });

    this.resizeObserver.observe(this.from);
    this.resizeObserver.observe(this.to);

    // MutationObserver for element removal
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node.contains && (node.contains(this.from) || node.contains(this.to))) {
            this.destroy();
            return;
          }
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Scroll listener for position updates
    window.addEventListener('scroll', this._onScrollBound, true);
  }

  /**
   * Handle scroll events
   */
  _onScroll() {
    this._scheduleUpdate();
  }

  /**
   * Schedule update with requestAnimationFrame (debouncing)
   */
  _scheduleUpdate() {
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      requestAnimationFrame(() => {
        this._recalculatePath();
        this._updateScheduled = false;
      });
    }
  }

  /**
   * Resolve element from selector or element
   */
  _resolveElement(input) {
    if (typeof input === 'string') {
      return document.querySelector(input);
    }
    return input;
  }

  /**
   * Get anchor point for an element
   */
  _getAnchorPoint(element, anchor, otherElement) {
    const rect = element.getBoundingClientRect();
    const otherRect = otherElement ? otherElement.getBoundingClientRect() : null;

    if (anchor === 'auto' && otherRect) {
      return ANCHORS.auto(rect, otherRect);
    }

    const anchorFn = ANCHORS[anchor] || ANCHORS.center;
    return anchorFn(rect);
  }

  /**
   * Calculate SVG path
   */
  _calculatePath(start, end) {
    if (this.curvature === 0) {
      // Straight line
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    // Curved line using cubic Bezier
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curveAmount = distance * this.curvature;

    // Determine curve direction based on anchors
    let cp1x, cp1y, cp2x, cp2y;

    // Horizontal curve
    if (Math.abs(dx) > Math.abs(dy)) {
      cp1x = start.x + curveAmount;
      cp1y = start.y;
      cp2x = end.x - curveAmount;
      cp2y = end.y;
    } else {
      // Vertical curve
      cp1x = start.x;
      cp1y = start.y + curveAmount;
      cp2x = end.x;
      cp2y = end.y - curveAmount;
    }

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  /**
   * Recalculate and update path
   */
  _recalculatePath() {
    if (!this.pathElement || !this.from || !this.to) return;

    const start = this._getAnchorPoint(this.from, this.fromAnchor, this.to);
    const end = this._getAnchorPoint(this.to, this.toAnchor, this.from);

    const pathData = this._calculatePath(start, end);
    this.pathElement.setAttribute('d', pathData);
  }

  /**
   * Animate arrow drawing in
   */
  _animateIn() {
    if (!this.pathElement) return;

    const length = this.pathElement.getTotalLength();

    this.pathElement.style.strokeDasharray = length;
    this.pathElement.style.strokeDashoffset = length;
    this.pathElement.style.transition = `stroke-dashoffset ${this.animationDuration}ms ease-out`;

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.pathElement.style.strokeDashoffset = '0';
      });
    });

    // Clean up after animation
    setTimeout(() => {
      if (this.pathElement) {
        this.pathElement.style.strokeDasharray = '';
        this.pathElement.style.strokeDashoffset = '';
        this.pathElement.style.transition = '';
      }
    }, this.animationDuration + 50);
  }

  /**
   * Animate arrow drawing out
   */
  _animateOut(callback) {
    if (!this.pathElement) {
      callback?.();
      return;
    }

    const length = this.pathElement.getTotalLength();

    this.pathElement.style.strokeDasharray = length;
    this.pathElement.style.strokeDashoffset = '0';
    this.pathElement.style.transition = `stroke-dashoffset ${this.animationDuration}ms ease-in`;

    requestAnimationFrame(() => {
      this.pathElement.style.strokeDashoffset = length;
    });

    setTimeout(() => {
      callback?.();
    }, this.animationDuration);
  }

  /**
   * Public: Force update arrow position
   */
  update() {
    this._recalculatePath();
  }

  /**
   * Public: Update arrow color
   */
  setColor(color) {
    this.color = color;
    if (this.pathElement) {
      this.pathElement.setAttribute('stroke', color);
      this.markerId = getArrowMarker(color, this.headSize);
      this.pathElement.setAttribute('marker-end', `url(#${this.markerId})`);
    }
  }

  /**
   * Public: Update curvature
   */
  setCurvature(curvature) {
    this.curvature = curvature;
    this._recalculatePath();
  }

  /**
   * Public: Destroy arrow and clean up
   */
  destroy(options = {}) {
    const animate = options.animate ?? false;

    const cleanup = () => {
      // Remove observers
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }

      // Remove event listeners
      window.removeEventListener('scroll', this._onScrollBound, true);

      // Remove SVG element
      if (this.pathElement && this.pathElement.parentNode) {
        this.pathElement.remove();
      }

      this.pathElement = null;
      this.from = null;
      this.to = null;
    };

    if (animate) {
      this._animateOut(cleanup);
    } else {
      cleanup();
    }
  }
}

/**
 * Auto-initialize arrows from data attributes
 */
export function autoInit() {
  const arrows = [];

  document.querySelectorAll('[data-arrow]').forEach(el => {
    const arrow = new Arrow({
      from: el.dataset.from,
      to: el.dataset.to,
      fromAnchor: el.dataset.fromAnchor,
      toAnchor: el.dataset.toAnchor,
      color: el.dataset.color,
      strokeWidth: el.dataset.strokeWidth ? parseFloat(el.dataset.strokeWidth) : undefined,
      headSize: el.dataset.headSize ? parseFloat(el.dataset.headSize) : undefined,
      curvature: el.dataset.curvature ? parseFloat(el.dataset.curvature) : undefined,
      animationDuration: el.dataset.animationDuration ? parseFloat(el.dataset.animationDuration) : undefined,
    });

    arrows.push(arrow);

    // Store reference on element for later access
    el._arrowInstance = arrow;
  });

  return arrows;
}

/**
 * Export default
 */
export default {
  Arrow,
  autoInit,
};
