import type { CSSProperties } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Baby, Bike, BookOpen, Building2, Calendar,
  Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, ClipboardList, Clock,
  Ear, Eye, Film, Gauge, Globe, Hand, Heart, HeartHandshake, Inbox, KeyRound,
  LayoutGrid, ListChecks, Lock, Mail, Megaphone, MessageCircle, MoreHorizontal,
  MoveRight, PenLine, Play, Plus, Puzzle, Radio, RefreshCw, Send, Shield, ShieldAlert,
  SkipBack, Sparkles, Sun, Timer, TrendingDown, TrendingUp, Unlock, Upload, UploadCloud,
  UserPlus, Users, Utensils, X, Pause,
  type LucideIcon,
} from "lucide-react";

// Icon registry — kebab name (as used in the design source) → lucide-react
// component. Explicit imports keep the bundle tree-shakeable (vs. the prototype's
// runtime lucide CDN, which we drop for privacy). Add new icons here as screens
// need them.
const REGISTRY: Record<string, LucideIcon> = {
  "alert-triangle": AlertTriangle,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  baby: Baby,
  bike: Bike,
  "book-open": BookOpen,
  "building-2": Building2,
  calendar: Calendar,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clapperboard: Clapperboard,
  "clipboard-list": ClipboardList,
  clock: Clock,
  ear: Ear,
  eye: Eye,
  film: Film,
  gauge: Gauge,
  globe: Globe,
  hand: Hand,
  heart: Heart,
  "heart-handshake": HeartHandshake,
  inbox: Inbox,
  "key-round": KeyRound,
  "layout-grid": LayoutGrid,
  "list-checks": ListChecks,
  lock: Lock,
  mail: Mail,
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  "more-horizontal": MoreHorizontal,
  "move-right": MoveRight,
  pause: Pause,
  "pen-line": PenLine,
  play: Play,
  plus: Plus,
  puzzle: Puzzle,
  radio: Radio,
  "refresh-cw": RefreshCw,
  send: Send,
  shield: Shield,
  "shield-alert": ShieldAlert,
  "skip-back": SkipBack,
  sparkles: Sparkles,
  sun: Sun,
  timer: Timer,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  unlock: Unlock,
  upload: Upload,
  "upload-cloud": UploadCloud,
  "user-plus": UserPlus,
  users: Users,
  utensils: Utensils,
  x: X,
};

export function Icon({
  name,
  size = 18,
  color,
  style = {},
}: {
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const Cmp = REGISTRY[name];
  return (
    <span className="ico" aria-hidden="true" style={{ width: size, height: size, color: color || "currentColor", ...style }}>
      {Cmp ? <Cmp size={size} color={color || "currentColor"} /> : null}
    </span>
  );
}

// Alias matching the design source's component name, so ported screens read 1:1.
export { Icon as Ico };
