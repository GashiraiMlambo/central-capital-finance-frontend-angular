// Helper script to convert Hex to CSS filter
// Run using Node
const hex = '#0A2540'; // Deep navy blue from the user's color swatch

class Color {
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
  toString() { return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`; }
  colorDifference(color) {
    return Math.sqrt(
      (this.r - color.r) ** 2 +
      (this.g - color.g) ** 2 +
      (this.b - color.b) ** 2
    );
  }
}

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16))
    : null;
}

class Solver {
  constructor(target) {
    this.target = target;
    this.targetHSL = this.rgbToHsl(target.r, target.g, target.b);
    this.results = [];
  }

  solve() {
    const result = this.solveNarrow(this.solveWide());
    return {
      values: result.values,
      loss: result.loss,
      filter: this.css(result.values)
    };
  }

  solveWide() {
    return this.solveLoop(1000, [100, 100, 100, 380, 100, 100]);
  }

  solveNarrow(wide) {
    return this.solveLoop(10000, wide.values);
  }

  solveLoop(iterations, fields) {
    let best = { loss: 1e9 };
    for (let i = 0; i < iterations; i++) {
      const currentFields = fields.map((f, idx) => {
        const val = f + (Math.random() - 0.5) * (idx === 3 ? 30 : 10);
        return Math.max(0, val);
      });
      const loss = this.loss(currentFields);
      if (loss < best.loss) {
        best = { loss, values: currentFields };
      }
    }
    return best;
  }

  css(filters) {
    const fmt = (idx, multiplier = 1) => Math.round(filters[idx] * multiplier);
    return `invert(${fmt(0)}%) sepia(${fmt(1)}%) saturate(${fmt(2)}%) hue-rotate(${fmt(3)}deg) brightness(${fmt(4)}%) contrast(${fmt(5)}%)`;
  }

  loss(filters) {
    // Math model to simulate filter operations starting from #FFF
    // We approximate the color resulting from applying the filters
    const color = new Color(255, 255, 255);
    // Invert
    const inv = filters[0] / 100;
    color.r = (1 - inv) * color.r + inv * (255 - color.r);
    color.g = (1 - inv) * color.g + inv * (255 - color.g);
    color.b = (1 - inv) * color.b + inv * (255 - color.b);

    // Simplify HSL conversion and adjustments
    const hsl = this.rgbToHsl(color.r, color.g, color.b);
    // Apply sepia (approximate)
    const sep = filters[1] / 100;
    const r = color.r, g = color.g, b = color.b;
    color.r = Math.min(255, (r * (1 - (0.607 * sep))) + (g * (0.769 * sep)) + (b * (0.189 * sep)));
    color.g = Math.min(255, (r * (0.349 * sep)) + (g * (1 - (0.314 * sep))) + (b * (0.168 * sep)));
    color.b = Math.min(255, (r * (0.272 * sep)) + (g * (0.534 * sep)) + (b * (1 - (0.869 * sep))));

    // Saturation
    const sat = filters[2] / 100;
    const gray = 0.2989 * color.r + 0.5870 * color.g + 0.1140 * color.b;
    color.r = Math.min(255, gray + sat * (color.r - gray));
    color.g = Math.min(255, gray + sat * (color.g - gray));
    color.b = Math.min(255, gray + sat * (color.b - gray));

    // Hue rotate
    const hue = (filters[3] * Math.PI) / 180;
    const cosVal = Math.cos(hue);
    const sinVal = Math.sin(hue);
    const r2 = color.r, g2 = color.g, b2 = color.b;
    color.r = Math.min(255, Math.max(0, r2 * (0.213 + 0.787 * cosVal - 0.213 * sinVal) + g2 * (0.715 - 0.715 * cosVal - 0.715 * sinVal) + b2 * (0.072 - 0.072 * cosVal + 0.928 * sinVal)));
    color.g = Math.min(255, Math.max(0, r2 * (0.213 - 0.213 * cosVal + 0.143 * sinVal) + g2 * (0.715 + 0.285 * cosVal + 0.140 * sinVal) + b2 * (0.072 - 0.072 * cosVal - 0.283 * sinVal)));
    color.b = Math.min(255, Math.max(0, r2 * (0.213 - 0.213 * cosVal - 0.787 * sinVal) + g2 * (0.715 - 0.715 * cosVal + 0.715 * sinVal) + b2 * (0.072 + 0.928 * cosVal + 0.072 * sinVal)));

    // Brightness
    const br = filters[4] / 100;
    color.r = Math.min(255, color.r * br);
    color.g = Math.min(255, color.g * br);
    color.b = Math.min(255, color.b * br);

    // Contrast
    const con = filters[5] / 100;
    color.r = Math.min(255, Math.max(0, (color.r - 128) * con + 128));
    color.g = Math.min(255, Math.max(0, (color.g - 128) * con + 128));
    color.b = Math.min(255, Math.max(0, (color.b - 128) * con + 128));

    return color.colorDifference(this.target);
  }

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }
}

const target = hexToRgb(hex);
const solver = new Solver(target);
const result = solver.solve();
console.log('Hex:', hex);
console.log('CSS Filter:', result.filter);
