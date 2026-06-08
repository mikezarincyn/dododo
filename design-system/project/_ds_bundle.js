/* @ds-bundle: {"format":3,"namespace":"DododoDesignSystem_cdf388","components":[{"name":"Badge","sourcePath":"components/actions/Badge.jsx"},{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"CheckItem","sourcePath":"components/feedback/CheckItem.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"ConfettiBurst","sourcePath":"components/surfaces/ConfettiBurst.jsx"}],"sourceHashes":{"components/actions/Badge.jsx":"e3a9d6c83eee","components/actions/Button.jsx":"d1e577c18c22","components/brand/Logo.jsx":"43ccb08081a7","components/feedback/CheckItem.jsx":"322cb8c17079","components/feedback/ProgressBar.jsx":"cdb3ed2bba15","components/forms/Input.jsx":"723c61fe8f44","components/surfaces/Card.jsx":"c59296f4a7b1","components/surfaces/ConfettiBurst.jsx":"0352bffa411f","ui_kits/app/ProfileScreen.jsx":"8750402b6c37","ui_kits/app/TabBar.jsx":"445706fbf299","ui_kits/app/TodayScreen.jsx":"71794eb5c06b","ui_kits/app/app.jsx":"d1526fe23bc7","ui_kits/app/ios-frame.jsx":"be3343be4b51","ui_kits/app/shared.jsx":"824e74ec3ee5","ui_kits/website/Compare.jsx":"39ffcfeb7709","ui_kits/website/Hero.jsx":"b04c0a10ae75","ui_kits/website/Nav.jsx":"e7309c48ee01","ui_kits/website/Pricing.jsx":"6f696d7b935d","ui_kits/website/ProblemGrid.jsx":"7206dd37118e","ui_kits/website/ScreeningModal.jsx":"ec436dc3c966","ui_kits/website/Testimonials.jsx":"56ac6641ebfc","ui_kits/website/Understand.jsx":"a6aaf9af0832","ui_kits/website/app.jsx":"76fdc1e2df74","ui_kits/website/shared.jsx":"57b31ea8fb85"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DododoDesignSystem_cdf388 = window.DododoDesignSystem_cdf388 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dododo Badge — small pill label. Used for "most popular" (coral),
 * eyebrow chips, and soft status tags.
 */
function Badge({
  children,
  tone = 'coral',
  style = {},
  ...rest
}) {
  const tones = {
    coral: {
      bg: 'var(--coral-500)',
      color: 'var(--white)'
    },
    green: {
      bg: 'var(--green-100)',
      color: 'var(--green-500)'
    },
    yellow: {
      bg: 'var(--yellow-surface-100)',
      color: '#9A7B23'
    },
    lilac: {
      bg: 'var(--lilac-100)',
      color: 'var(--navy-700)'
    },
    navy: {
      bg: 'var(--navy-700)',
      color: 'var(--white)'
    }
  };
  const t = tones[tone] || tones.coral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '7px 16px',
      borderRadius: 'var(--radius-pill)',
      background: t.bg,
      color: t.color,
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: '14px',
      letterSpacing: '0.01em',
      lineHeight: 1,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Badge.jsx", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dododo Button — fully-rounded pill, the core action element.
 * Variants: primary (solid green), secondary (solid teal),
 * outline (ink stroke on white), soft (green-100 with green text).
 */
function Button({
  children,
  variant = 'primary',
  size = 'lg',
  uppercase = false,
  iconRight = null,
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const palettes = {
    primary: {
      bg: 'var(--green-500)',
      color: 'var(--white)',
      border: 'transparent',
      hoverBg: 'var(--green-400)'
    },
    secondary: {
      bg: 'var(--teal-500)',
      color: 'var(--white)',
      border: 'transparent',
      hoverBg: 'var(--teal-400)'
    },
    outline: {
      bg: 'transparent',
      color: 'var(--ink-900)',
      border: 'var(--ink-900)',
      hoverBg: 'var(--grey-surface-100)'
    },
    soft: {
      bg: 'var(--green-100)',
      color: 'var(--green-500)',
      border: 'transparent',
      hoverBg: '#CDEEDF'
    }
  };
  const p = palettes[variant] || palettes.primary;
  const [hover, setHover] = React.useState(false);
  const height = size === 'sm' ? 'var(--btn-height-sm)' : 'var(--btn-height)';
  const fontSize = size === 'sm' ? '16px' : 'var(--font-button)';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      minHeight: height,
      padding: `0 var(--btn-pad-x)`,
      borderRadius: 'var(--radius-pill)',
      border: `var(--border-width) solid ${p.border}`,
      background: disabled ? '#D9DCDE' : hover ? p.hoverBg : p.bg,
      color: disabled ? 'rgba(43,42,42,.45)' : p.color,
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize,
      letterSpacing: uppercase ? 'var(--ls-button)' : '0.01em',
      textTransform: uppercase ? 'uppercase' : 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background .18s ease, transform .12s ease',
      transform: hover && !disabled ? 'translateY(-1px)' : 'none',
      boxShadow: variant === 'primary' && !disabled ? 'var(--shadow-pill)' : 'none',
      ...style
    }
  }, rest), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dododo Logo — the lowercase wordmark SVG with confetti accents.
 * Point `assetBase` at the assets folder; size with `height`.
 */
function Logo({
  height = 40,
  assetBase = '../../assets',
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("img", _extends({
    src: `${assetBase}/dododo-logo.svg`,
    alt: "Dododo",
    style: {
      height,
      width: 'auto',
      display: 'block',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/feedback/CheckItem.jsx
try { (() => {
/**
 * CheckItem — a bullet with a circular lilac check bubble (positive list)
 * or an outlined square cross (problem list). Title bold navy + optional body.
 */
function CheckItem({
  title,
  children,
  kind = 'check',
  style = {}
}) {
  const isCheck = kind === 'check';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '14px',
      alignItems: 'flex-start',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      width: 26,
      height: 26,
      marginTop: 2,
      borderRadius: isCheck ? '50%' : '6px',
      background: isCheck ? 'var(--lilac-100)' : 'transparent',
      border: isCheck ? 'none' : '1.5px solid rgba(43,42,42,.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isCheck ? 'var(--navy-700)' : 'rgba(43,42,42,.7)',
      fontSize: 15,
      fontWeight: 700
    }
  }, isCheck ? '✓' : '✕'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: '19px',
      color: isCheck ? 'var(--navy-700)' : 'var(--ink-900)',
      lineHeight: 1.3
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '17px',
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, children)));
}
Object.assign(__ds_scope, { CheckItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/CheckItem.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
/**
 * ProgressBar — segmented developmental progress (as in the app's domain rows).
 * `filled` of `segments` lit in the status colour, plus an optional band label.
 */
function ProgressBar({
  filled = 2,
  segments = 6,
  status = 'typical',
  label,
  style = {}
}) {
  const colors = {
    typical: 'var(--green-500)',
    building: 'var(--teal-500)',
    emerging: 'var(--confetti-yellow)',
    watch: 'var(--coral-500)'
  };
  const c = colors[status] || colors.typical;
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, Array.from({
    length: segments
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: 7,
      borderRadius: 'var(--radius-pill)',
      background: i < filled ? c : '#E7E9EB'
    }
  }))), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginTop: 8
    }
  }, label));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dododo Input — soft rounded field with navy label. Calm focus ring (green).
 */
function Input({
  label,
  hint,
  type = 'text',
  value,
  onChange,
  placeholder,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontWeight: 700,
      fontSize: 16,
      color: 'var(--navy-700)',
      marginBottom: 8
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      height: 56,
      padding: '0 20px',
      borderRadius: 'var(--radius-md)',
      border: `1.5px solid ${focus ? 'var(--green-500)' : 'var(--border-subtle)'}`,
      background: 'var(--white)',
      fontFamily: 'var(--font-body)',
      fontSize: 18,
      color: 'var(--ink-900)',
      outline: 'none',
      boxShadow: focus ? '0 0 0 4px rgba(114,188,161,.18)' : 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease'
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 14,
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dododo Card — white rounded surface with soft shadow, floating on
 * tinted section backgrounds. Tones tint the whole card (challenge=grey,
 * solution=mint with green border).
 */
function Card({
  children,
  tone = 'white',
  padding = 28,
  style = {},
  ...rest
}) {
  const tones = {
    white: {
      bg: 'var(--white)',
      border: 'var(--border-subtle)'
    },
    mint: {
      bg: '#EAF7F1',
      border: 'var(--green-500)'
    },
    grey: {
      bg: 'var(--grey-surface-100)',
      border: 'transparent'
    },
    yellow: {
      bg: 'var(--yellow-surface-100)',
      border: 'transparent'
    }
  };
  const t = tones[tone] || tones.white;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: tone === 'white' ? 'var(--shadow-card)' : 'none',
      padding: typeof padding === 'number' ? `${padding}px` : padding,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/ConfettiBurst.jsx
try { (() => {
/**
 * ConfettiBurst — sprinkles brand confetti shapes (dot / triangles / sparkle)
 * absolutely-positioned inside a relative parent. Decorative only.
 */
function ConfettiBurst({
  pieces = 'default',
  assetBase = '../../assets',
  style = {}
}) {
  const presets = {
    default: [{
      src: 'confetti-dot-yellow.svg',
      w: 22,
      top: '8%',
      left: '4%'
    }, {
      src: 'confetti-triangle-pink.svg',
      w: 20,
      top: '4%',
      left: '12%'
    }, {
      src: 'confetti-triangle-blue.svg',
      w: 20,
      top: '14%',
      left: '9%'
    }],
    sparkles: [{
      src: 'sparkle.svg',
      w: 28,
      top: '12%',
      left: '5%'
    }, {
      src: 'sparkle.svg',
      w: 22,
      top: '60%',
      left: '94%'
    }]
  };
  const list = Array.isArray(pieces) ? pieces : presets[pieces] || presets.default;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      ...style
    }
  }, list.map((p, i) => /*#__PURE__*/React.createElement("img", {
    key: i,
    src: `${assetBase}/${p.src}`,
    alt: "",
    style: {
      position: 'absolute',
      width: p.w,
      top: p.top,
      left: p.left,
      transform: 'translate(-50%, -50%)'
    }
  })));
}
Object.assign(__ds_scope, { ConfettiBurst });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/ConfettiBurst.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProfileScreen.jsx
try { (() => {
function Radar() {
  // 7-axis radar (the 6 areas + joint attention), values 0..1
  const axes = [{
    label: 'Communication',
    v: 0.78,
    icon: 'messages-square',
    tone: 'var(--green-500)'
  }, {
    label: 'Sensory',
    v: 0.55,
    icon: 'ear',
    tone: 'var(--green-500)'
  }, {
    label: 'Motor',
    v: 0.7,
    icon: 'hand',
    tone: 'var(--green-500)'
  }, {
    label: 'Routines',
    v: 0.62,
    icon: 'sun',
    tone: 'var(--green-500)'
  }, {
    label: 'Social',
    v: 0.5,
    icon: 'users',
    tone: 'var(--green-500)'
  }, {
    label: 'Visual',
    v: 0.38,
    icon: 'eye',
    tone: 'var(--coral-500)'
  }, {
    label: 'Emotional',
    v: 0.66,
    icon: 'brain',
    tone: 'var(--confetti-yellow)'
  }];
  const cx = 150,
    cy = 150,
    R = 96,
    n = axes.length;
  const pt = (i, r) => {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const grid = [0.33, 0.66, 1].map(f => axes.map((_, i) => pt(i, R * f).join(',')).join(' '));
  const shape = axes.map((ax, i) => pt(i, R * ax.v).join(',')).join(' ');
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 300 300",
    style: {
      width: '100%',
      maxWidth: 300,
      display: 'block',
      margin: '0 auto'
    }
  }, grid.map((g, i) => /*#__PURE__*/React.createElement("polygon", {
    key: i,
    points: g,
    fill: "none",
    stroke: "#E7E9EB",
    strokeWidth: "1"
  })), axes.map((_, i) => {
    const [x, y] = pt(i, R);
    return /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: cx,
      y1: cy,
      x2: x,
      y2: y,
      stroke: "#EDEEF0",
      strokeWidth: "1"
    });
  }), /*#__PURE__*/React.createElement("polygon", {
    points: shape,
    fill: "rgba(120,110,220,.18)",
    stroke: "#7A6FE0",
    strokeWidth: "2"
  }), axes.map((ax, i) => {
    const [x, y] = pt(i, R + 30);
    return /*#__PURE__*/React.createElement("foreignObject", {
      key: i,
      x: x - 17,
      y: y - 17,
      width: "34",
      height: "34"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: ax.tone,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": ax.icon,
      style: {
        width: 17,
        height: 17,
        color: '#fff'
      }
    })));
  }));
}
function ProfileScreen() {
  const {
    Card,
    ProgressBar
  } = window.DododoDesignSystem_cdf388;
  const {
    Ico
  } = window;
  const rows = [{
    t: 'Emotional Regulation',
    band: 'Typical for age',
    level: 'Basic',
    filled: 4,
    status: 'typical'
  }, {
    t: 'Joint Attention',
    band: 'Typical for age',
    level: 'Building',
    filled: 3,
    status: 'building'
  }, {
    t: 'Sensory Processing',
    band: 'Emerging',
    level: 'Emerging',
    filled: 2,
    status: 'emerging'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflowY: 'auto',
      background: '#FBF7F1',
      padding: '60px 18px 24px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 26,
      color: 'var(--navy-700)',
      margin: '4px 0 18px'
    }
  }, "Ada\u2019s development"), /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    padding: 18,
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 17,
      color: 'var(--ink-900)'
    }
  }, "Sensory needs"), /*#__PURE__*/React.createElement(Ico, {
    name: "chevron-right",
    size: 20,
    color: "var(--text-subtle)"
  })), /*#__PURE__*/React.createElement(Radar, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "white",
    padding: 18
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 16,
      color: 'var(--ink-900)'
    }
  }, r.t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-muted)',
      background: 'var(--grey-surface-100)',
      padding: '4px 10px',
      borderRadius: 99
    }
  }, r.band)), /*#__PURE__*/React.createElement(ProgressBar, {
    filled: r.filled,
    segments: 6,
    status: r.status,
    label: r.level
  })))));
}
window.ProfileScreen = ProfileScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TabBar.jsx
try { (() => {
function TabBar({
  active,
  onChange
}) {
  const {
    Ico
  } = window;
  const tabs = [{
    id: 'today',
    label: 'Today',
    icon: 'calendar'
  }, {
    id: 'foryou',
    label: 'For you',
    icon: 'book-open'
  }, {
    id: 'plan',
    label: "Kid's plan",
    icon: 'layout-grid'
  }, {
    id: 'profile',
    label: 'Profile',
    icon: 'sliders-horizontal'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '12px 8px 10px',
      background: 'var(--white)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, tabs.map(t => {
    const on = active === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onChange(t.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: on ? 'var(--green-500)' : 'rgba(43,42,42,.5)'
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      name: t.icon,
      size: 22
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: on ? 700 : 500
      }
    }, t.label));
  }));
}
window.TabBar = TabBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TabBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TodayScreen.jsx
try { (() => {
function TodayScreen({
  onOpenProfile
}) {
  const {
    Logo,
    Card,
    Badge
  } = window.DododoDesignSystem_cdf388;
  const {
    Ico,
    ActThumb
  } = window;
  const days = Array.from({
    length: 11
  }, (_, i) => ({
    n: i + 1,
    done: i < 4
  }));
  const activities = [{
    t: 'Gentle rocking (slow)',
    tag: 'VESTIBULAR',
    b: 'Provide slow, predictable input; support balance and calm.',
    min: 3,
    pts: 8,
    tone: '#E6E0F2'
  }, {
    t: 'Dry Texture Treasure',
    tag: 'TACTILE',
    b: 'Introduce safe, dry textures predictably; build confidence.',
    min: 7,
    pts: 12,
    tone: '#F3DEDA'
  }, {
    t: 'Cushion Sandwich',
    tag: 'PROPRIOCEPTIVE',
    b: 'Deep-pressure play that helps your child feel grounded.',
    min: 5,
    pts: 10,
    tone: '#DCEFE7'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflowY: 'auto',
      background: '#FBF7F1'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '54px 18px 12px',
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 26,
    assetBase: window.APP_ASSETS
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      color: 'var(--ink-900)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, "13 min"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--ink-900)'
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "star",
    size: 16,
    color: "var(--confetti-yellow)"
  }), " 28"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: '#CBD9E8'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      padding: '14px 18px',
      background: 'var(--white)'
    }
  }, days.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.n,
    style: {
      flexShrink: 0,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: d.done ? 'var(--green-500)' : 'var(--white)',
      border: d.done ? 'none' : '1.5px solid var(--green-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 13
    }
  }, d.done && /*#__PURE__*/React.createElement(Ico, {
    name: "check",
    size: 16,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-subtle)',
      marginTop: 5
    }
  }, "day ", d.n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 18px 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 22,
      color: 'var(--ink-900)',
      margin: 0
    }
  }, "For you"), /*#__PURE__*/React.createElement("button", {
    onClick: onOpenProfile,
    style: {
      border: 'none',
      background: 'transparent',
      color: 'var(--green-500)',
      fontWeight: 700,
      fontSize: 15,
      cursor: 'pointer'
    }
  }, "View all")), /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    padding: 18,
    style: {
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -18,
      left: -18,
      width: 70,
      height: 70,
      borderRadius: '50%',
      background: 'var(--confetti-pink)',
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 17,
      color: 'var(--ink-900)',
      marginBottom: 4
    }
  }, "Parent emotional wellbeing & calm"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.08em',
      color: 'var(--text-subtle)',
      marginBottom: 8
    }
  }, "DODODO FOUNDATION"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.45,
      color: 'var(--text-muted)'
    }
  }, "Build a strong foundation for both you and your child. Learn how to stay calm and create a supportive routine.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 18px 24px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 22,
      color: 'var(--ink-900)',
      margin: '0 0 14px'
    }
  }, "Today\u2019s plan"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, activities.map((a, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "white",
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(ActThumb, {
    tone: a.tone
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 16,
      color: 'var(--ink-900)'
    }
  }, a.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.07em',
      color: 'var(--green-500)',
      margin: '3px 0 6px'
    }
  }, a.tag), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      lineHeight: 1.4,
      color: 'var(--text-muted)'
    }
  }, a.b), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 10,
      fontSize: 13,
      color: 'var(--text-muted)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "clock",
    size: 14,
    color: "var(--green-500)"
  }), " ", a.min, " min"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "star",
    size: 14,
    color: "var(--confetti-yellow)"
  }), " +", a.pts)))))))));
}
window.TodayScreen = TodayScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TodayScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/app.jsx
try { (() => {
function App() {
  const {
    IOSDevice
  } = window;
  const {
    TodayScreen,
    ProfileScreen,
    TabBar
  } = window;
  const [active, setActive] = React.useState('today');

  // Re-render Lucide icons whenever the screen changes
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const screen = active === 'profile' || active === 'plan' ? /*#__PURE__*/React.createElement(ProfileScreen, null) : /*#__PURE__*/React.createElement(TodayScreen, {
    onOpenProfile: () => setActive('profile')
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#EEF2F6',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(IOSDevice, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#FBF7F1'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0
    }
  }, screen), /*#__PURE__*/React.createElement(TabBar, {
    active: active,
    onChange: setActive
  }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/shared.jsx
try { (() => {
/* App UI kit — shared helpers */
const APP_ASSETS = '../../assets';
function Ico({
  name,
  size = 22,
  color = 'currentColor',
  strokeWidth = 2
}) {
  return /*#__PURE__*/React.createElement("i", {
    "data-lucide": name,
    style: {
      width: size,
      height: size,
      color,
      strokeWidth
    }
  });
}

/** Soft tinted illustration placeholder for activity cards. */
function ActThumb({
  tone = '#F3DEDA'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 14,
      background: `linear-gradient(135deg, ${tone}, #FBF6EF)`,
      flexShrink: 0
    }
  });
}
window.Ico = Ico;
window.ActThumb = ActThumb;
window.APP_ASSETS = APP_ASSETS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/shared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Compare.jsx
try { (() => {
function Compare() {
  const {
    Card,
    CheckItem
  } = window.DododoDesignSystem_cdf388;
  const challenge = ['Frequent meltdowns', 'Difficulties with attention', 'Hard transitions between activities', 'Stress around everyday routines', 'Difficulty accessing specialist support', 'Too many conflicting opinions and advice'];
  const withd = ["You understand why it's happening", 'Clear daily steps, designed with therapists', 'Activities that fit into your routine', 'Professional support without the confusion', 'Calm. Confidence. Progress.'];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '40px 50px 90px',
      maxWidth: 1180,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "grey",
    padding: 40
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 40,
      color: 'rgba(43,42,42,.75)',
      margin: '0 0 28px'
    }
  }, "The challenge"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, challenge.map((c, i) => /*#__PURE__*/React.createElement(CheckItem, {
    key: i,
    kind: "cross",
    title: c
  })))), /*#__PURE__*/React.createElement(Card, {
    tone: "mint",
    padding: 40
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 40,
      color: 'var(--navy-700)',
      margin: '0 0 28px'
    }
  }, "With Dododo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, withd.map((c, i) => /*#__PURE__*/React.createElement(CheckItem, {
    key: i,
    title: c
  }))))));
}
window.Compare = Compare;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Compare.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
function Hero({
  onStart
}) {
  const {
    Button,
    Card,
    ConfettiBurst
  } = window.DododoDesignSystem_cdf388;
  const {
    Photo,
    Avatar
  } = window;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      padding: '72px 50px 100px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(ConfettiBurst, {
    pieces: [{
      src: 'confetti-dot-yellow.svg',
      w: 26,
      top: '12%',
      left: '40%'
    }, {
      src: 'confetti-triangle-pink.svg',
      w: 22,
      top: '8%',
      left: '46%'
    }, {
      src: 'confetti-triangle-blue.svg',
      w: 22,
      top: '20%',
      left: '44%'
    }],
    assetBase: window.ASSETS
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.05fr 1fr',
      gap: 56,
      alignItems: 'center',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 400,
      letterSpacing: '.02em',
      fontSize: 68,
      lineHeight: 1.02,
      color: 'var(--navy-700)',
      margin: '0 0 24px',
      textWrap: 'balance'
    }
  }, "The waiting list can take months. But your child\u2019s", ' ', /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: 700,
      background: 'linear-gradient(transparent 60%, var(--confetti-blue) 60%)'
    }
  }, "development isn\u2019t waiting.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 22,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      maxWidth: 460,
      margin: '0 0 32px'
    }
  }, "If you\u2019ve started to notice issues with behaviour, communication, or how your child responds, you don\u2019t have to wait to understand what\u2019s going on."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconRight: "\u2192",
    onClick: onStart
  }, "Get a clear picture"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      fontSize: 16,
      color: 'var(--text-subtle)'
    }
  }, "Get your child\u2019s plan today")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    label: "Mum & child painting",
    height: 460,
    tone: "#E9E2F2"
  }), /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    style: {
      position: 'absolute',
      left: -36,
      bottom: 48,
      width: 320,
      padding: 22,
      boxShadow: 'var(--shadow-float)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    size: 52,
    tone: "#CBD9E8"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--navy-700)',
      fontSize: 17
    }
  }, "Jaime A."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--text-muted)'
    }
  }, "Occupational Therapist"))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 15,
      lineHeight: 1.5,
      color: 'var(--text-muted)'
    }
  }, "\u201CChildren make faster progress when support continues at home. Small daily activities add up to meaningful change.\u201D")))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Nav.jsx
try { (() => {
function Nav({
  onStart
}) {
  const {
    Logo,
    Button
  } = window.DododoDesignSystem_cdf388;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '22px 50px',
      background: 'rgba(255,255,255,.86)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 38,
    assetBase: window.ASSETS
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    size: "sm",
    uppercase: true,
    iconRight: "\u2192",
    onClick: onStart
  }, "Start screening"));
}
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Pricing.jsx
try { (() => {
function Pricing({
  onStart
}) {
  const {
    Card,
    Button,
    Badge
  } = window.DododoDesignSystem_cdf388;
  const Plan = ({
    name,
    price,
    unit,
    feats,
    cta,
    ctaVariant,
    popular
  }) => /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    padding: 34,
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      border: popular ? '1.5px solid var(--green-500)' : '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: '.04em',
      color: 'var(--text-muted)',
      textTransform: 'uppercase'
    }
  }, name), popular && /*#__PURE__*/React.createElement(Badge, {
    tone: "coral"
  }, "most popular")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 56,
      color: 'var(--navy-700)',
      lineHeight: 1
    }
  }, price), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      color: 'var(--text-muted)',
      margin: '6px 0 26px'
    }
  }, unit), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginBottom: 28,
      flex: 1
    }
  }, feats.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      fontSize: 17,
      color: 'var(--ink-900)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--green-500)',
      fontWeight: 700
    }
  }, "\u2713"), f))), /*#__PURE__*/React.createElement(Button, {
    variant: ctaVariant,
    onClick: onStart
  }, cta));
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      padding: '90px 50px 100px',
      background: 'linear-gradient(180deg, var(--green-500) 0%, #8FCBB4 55%, #DDF0E8 100%)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: '.14em',
      color: 'rgba(255,255,255,.9)',
      textTransform: 'uppercase',
      marginBottom: 14
    }
  }, "Pricing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 64,
      color: 'var(--white)',
      margin: 0
    }
  }, "Simple and transparent")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 26,
      maxWidth: 1100,
      margin: '0 auto',
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(Plan, {
    name: "Free",
    price: "\xA30",
    unit: "forever",
    ctaVariant: "outline",
    cta: "Start screening",
    feats: ['Full screening', 'Developmental results', 'PDF report']
  }), /*#__PURE__*/React.createElement(Plan, {
    name: "Daily plan",
    price: "\xA319",
    unit: "/ month",
    popular: true,
    ctaVariant: "primary",
    cta: "Let's go!",
    feats: ['Everything in free', 'Personalised activity plan', 'Progress tracking', 'Cancel anytime']
  }), /*#__PURE__*/React.createElement(Plan, {
    name: "Daily plan + OT support",
    price: "\xA3120",
    unit: "/ month",
    ctaVariant: "outline",
    cta: "Choose plan",
    feats: ['Everything in Daily plan', 'One OT call a month']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 36,
      fontSize: 22,
      color: 'rgba(43,42,42,.7)'
    }
  }, "No card needed for screening"));
}
window.Pricing = Pricing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Pricing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ProblemGrid.jsx
try { (() => {
function ProblemGrid() {
  const {
    Card
  } = window.DododoDesignSystem_cdf388;
  const items = [{
    t: 'Meltdowns still happen',
    b: "You're managing them alone, without understanding what's driving them or how to help."
  }, {
    t: 'School still raises concerns',
    b: 'Teachers are flagging behaviour. But without a diagnosis, nobody knows what to do next.'
  }, {
    t: "You're figuring it out alone",
    b: 'Hours of research, conflicting advice, late-night forum scrolling. Still no clear answers.'
  }, {
    t: 'No one tells you what actually helps',
    b: 'You\u2019ve been told to "wait and see." Nobody has told you what to actually do at home.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '90px 50px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 400,
      letterSpacing: '.02em',
      fontSize: 44,
      lineHeight: 1.12,
      color: 'var(--navy-700)',
      textAlign: 'center',
      margin: '0 0 56px',
      textWrap: 'balance'
    }
  }, "The system is overwhelmed.", ' ', /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: 700,
      display: 'block'
    }
  }, "But your child isn\u2019t pausing for it.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 22
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "white",
    padding: 26,
    style: {
      minHeight: 230
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 21,
      color: 'var(--navy-700)',
      margin: '0 0 16px',
      lineHeight: 1.25
    }
  }, it.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 16,
      lineHeight: 1.5,
      color: 'var(--text-muted)'
    }
  }, it.b)))));
}
window.ProblemGrid = ProblemGrid;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ProblemGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ScreeningModal.jsx
try { (() => {
function ScreeningModal({
  open,
  onClose
}) {
  const {
    Card,
    Button,
    Input,
    Logo
  } = window.DododoDesignSystem_cdf388;
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);
  if (!open) return null;
  const domains = ['Communication', 'Sensory processing', 'Emotional regulation', 'Social interaction', 'Motor skills', 'Daily routines'];
  const [picked, setPicked] = React.useState([]);
  const toggle = d => setPicked(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const Steps = [/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 30,
      color: 'var(--navy-700)',
      margin: '0 0 10px'
    }
  }, "Let\u2019s get a clear picture"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'var(--text-muted)',
      lineHeight: 1.5,
      margin: '0 0 26px'
    }
  }, "A free 20-minute screening across 6 developmental areas. No card needed."), /*#__PURE__*/React.createElement(Input, {
    label: "Child's first name",
    placeholder: "e.g. Ada",
    style: {
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Child's age",
    placeholder: "e.g. 4"
  })), /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 30,
      color: 'var(--navy-700)',
      margin: '0 0 10px'
    }
  }, "What\u2019s on your mind?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'var(--text-muted)',
      lineHeight: 1.5,
      margin: '0 0 24px'
    }
  }, "Pick the areas you\u2019ve noticed \u2014 there are no wrong answers."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12
    }
  }, domains.map(d => {
    const on = picked.includes(d);
    return /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => toggle(d),
      style: {
        padding: '14px 22px',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        border: `1.5px solid ${on ? 'var(--green-500)' : 'var(--border-subtle)'}`,
        background: on ? 'var(--green-100)' : 'var(--white)',
        color: on ? 'var(--green-500)' : 'var(--ink-900)',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 17
      }
    }, d);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '12px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: 'var(--green-100)',
      color: 'var(--green-500)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 30,
      margin: '0 auto 20px'
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 30,
      color: 'var(--navy-700)',
      margin: '0 0 10px'
    }
  }, "You\u2019re all set"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'var(--text-muted)',
      lineHeight: 1.5,
      margin: 0
    }
  }, "We\u2019ll build ", picked.length ? `a plan across ${picked.length} area${picked.length > 1 ? 's' : ''}` : 'your child\u2019s plan', " with a UK-certified occupational therapist. Your PDF report is on its way."))];
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(13,50,118,.32)',
      backdropFilter: 'blur(4px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 'min(560px, 94vw)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    padding: 40,
    style: {
      boxShadow: 'var(--shadow-float)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 26
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 32,
    assetBase: window.ASSETS
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      border: 'none',
      background: 'transparent',
      fontSize: 26,
      color: 'var(--text-subtle)',
      cursor: 'pointer',
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 28
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      height: 6,
      flex: 1,
      borderRadius: 99,
      background: i <= step ? 'var(--green-500)' : '#E7E9EB'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: 200
    }
  }, Steps[step]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 30,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => step === 0 ? onClose() : setStep(step - 1),
    style: {
      border: 'none',
      background: 'transparent',
      fontSize: 17,
      fontWeight: 600,
      color: 'var(--text-muted)',
      cursor: 'pointer'
    }
  }, step === 0 ? 'Cancel' : 'Back'), step < 2 ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconRight: "\u2192",
    onClick: () => setStep(step + 1)
  }, "Continue") : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: onClose
  }, "Done")))));
}
window.ScreeningModal = ScreeningModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ScreeningModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Testimonials.jsx
try { (() => {
function Testimonials({
  onStart
}) {
  const {
    Card,
    Button
  } = window.DododoDesignSystem_cdf388;
  const {
    Avatar
  } = window;
  const pros = [{
    n: 'Claire M.',
    r: 'Speech & Language Therapist, London',
    q: 'What happens between sessions matters as much as the session itself. Dododo gives families the structure to make that time count.'
  }, {
    n: 'Jaime A.',
    r: 'OT, Lisbon',
    q: "My families wait 12, 18, sometimes 24 months to see me. Dododo means that time isn't wasted, they arrive knowing their child, not just worrying about them."
  }, {
    n: 'Rachel B.',
    r: 'Speech & Language Therapist, Birmingham',
    q: 'When a parent comes to a session with observations, notes, and confidence — the whole session changes.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      padding: '80px 50px 90px',
      background: 'var(--blush-100)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${window.ASSETS}/sparkle.svg`,
    alt: "",
    style: {
      position: 'absolute',
      width: 34,
      top: 70,
      left: 70
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: `${window.ASSETS}/sparkle.svg`,
    alt: "",
    style: {
      position: 'absolute',
      width: 26,
      top: '52%',
      right: 60
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 12,
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: '.14em',
      color: 'var(--navy-700)',
      textTransform: 'uppercase'
    }
  }, "What professionals say"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 64,
      color: 'var(--ink-900)',
      textAlign: 'center',
      margin: '0 0 48px'
    }
  }, "Trusted by specialists"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 26,
      maxWidth: 1120,
      margin: '0 auto'
    }
  }, pros.map((p, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "white",
    padding: 28
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    size: 56,
    tone: "#D8E6F2"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--navy-700)',
      fontSize: 18
    }
  }, p.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--ink-900)'
    }
  }, p.r))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 16,
      lineHeight: 1.55,
      color: 'var(--text-muted)'
    }
  }, "\u201C", p.q, "\u201D")))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 44
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      color: 'var(--ink-900)',
      marginBottom: 22
    }
  }, "See your child\u2019s development clearly"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: onStart
  }, "Get a clear picture")));
}
window.Testimonials = Testimonials;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Testimonials.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Understand.jsx
try { (() => {
function Understand() {
  const {
    CheckItem
  } = window.DododoDesignSystem_cdf388;
  const {
    Photo
  } = window;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '40px 50px 90px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    label: "Mum & child laughing",
    height: 520,
    tone: "#F3DEDA"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      letterSpacing: '.02em',
      fontSize: 48,
      lineHeight: 1.08,
      color: 'var(--navy-700)',
      margin: '0 0 32px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(transparent 62%, var(--confetti-blue) 62%)'
    }
  }, "Understand"), /*#__PURE__*/React.createElement("br", null), "your child"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement(CheckItem, {
    title: "Know what's happening \u2014 right now"
  }, "A 20-minute developmental screening gives you a clear picture of your child across 6 key areas. Today, not in 18 months."), /*#__PURE__*/React.createElement(CheckItem, {
    title: "A plan you can trust"
  }, "Built by UK-certified occupational therapists. The same clinical framework used in NHS practice \u2014 made accessible at home."), /*#__PURE__*/React.createElement(CheckItem, {
    title: "Activities you can actually do"
  }, "15\u201320 minutes a day. No equipment. No specialist knowledge. Built around your child\u2019s interests and your real life.")), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 28,
      fontSize: 17,
      color: 'var(--text-subtle)'
    }
  }, "Three things that work together, so the wait becomes time well spent, not time lost."))));
}
window.Understand = Understand;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Understand.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/app.jsx
try { (() => {
function Footer() {
  const {
    Logo
  } = window.DododoDesignSystem_cdf388;
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: '48px 50px',
      background: 'var(--white)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 32,
    assetBase: window.ASSETS
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--text-subtle)'
    }
  }, "Built by UK-certified occupational therapists \xB7 Non-clinical support for families."));
}
function Site() {
  const {
    Nav,
    Hero,
    ProblemGrid,
    Understand,
    Compare,
    Pricing,
    Testimonials,
    ScreeningModal
  } = window;
  const [open, setOpen] = React.useState(false);
  const start = () => setOpen(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement(Nav, {
    onStart: start
  }), /*#__PURE__*/React.createElement(Hero, {
    onStart: start
  }), /*#__PURE__*/React.createElement(ProblemGrid, null), /*#__PURE__*/React.createElement(Understand, null), /*#__PURE__*/React.createElement(Compare, null), /*#__PURE__*/React.createElement(Pricing, {
    onStart: start
  }), /*#__PURE__*/React.createElement(Testimonials, {
    onStart: start
  }), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(ScreeningModal, {
    open: open,
    onClose: () => setOpen(false)
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Site, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/shared.jsx
try { (() => {
/* Shared helpers for the website UI kit */
const ASSETS = '../../assets';

/** Soft tinted image placeholder (no real brand photos supplied). */
function Photo({
  label = 'Parent & child photo',
  radius = 24,
  height = '100%',
  tone = '#E7EFF9',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(135deg, ${tone}, #F4F1EC)`,
      borderRadius: radius,
      height,
      width: '100%',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 18,
      boxSizing: 'border-box',
      color: 'rgba(43,42,42,.45)',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '.02em',
      ...style
    }
  }, label);
}

/** Round avatar placeholder. */
function Avatar({
  size = 56,
  tone = '#D8E6F2'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: tone,
      flexShrink: 0
    }
  });
}
window.Photo = Photo;
window.Avatar = Avatar;
window.ASSETS = ASSETS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/shared.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.CheckItem = __ds_scope.CheckItem;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ConfettiBurst = __ds_scope.ConfettiBurst;

})();
