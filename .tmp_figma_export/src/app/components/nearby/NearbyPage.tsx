import { useState } from "react";
import {
  MapPin, Search, Star, Clock, ChevronRight, Bookmark,
  BookmarkCheck, Filter, X, Phone, Globe, ArrowUpRight,
  Dumbbell, Utensils, User, Map, List, Navigation, Shield,
  Sparkles, Check, ExternalLink, Calendar, MessageSquare,
} from "lucide-react";

// ─── Types & Data ─────────────────────────────────────────────────────────────

type PlaceType = "gym" | "restaurant" | "nutritionist" | "trainer" | "yoga";

interface Place {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  distance: number;
  rating: number;
  reviewCount: number;
  hours: string;
  isOpen: boolean;
  priceLevel: number;
  tags: string[];
  verified?: boolean;
  featured?: boolean;
  image: string;
  phone?: string;
  website?: string;
  specialties?: string[];
  description: string;
}

const PLACES: Place[] = [
  {
    id: "p1",
    name: "FitZone Performance Gym",
    type: "gym",
    address: "Marina Walk, Dubai Marina",
    distance: 0.3,
    rating: 4.8,
    reviewCount: 312,
    hours: "Open 24/7",
    isOpen: true,
    priceLevel: 2,
    tags: ["24/7", "Olympic lifting", "Sauna", "Parking"],
    featured: true,
    image: "https://images.unsplash.com/photo-1765728617805-b9f22d64e5b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    phone: "+971 4 123 4567",
    website: "fitzoneae.com",
    description: "State-of-the-art 3-floor gym with Olympic lifting platforms, functional training zone, and recovery spa.",
  },
  {
    id: "p2",
    name: "Dr. Sara Khalil",
    type: "nutritionist",
    address: "Jumeirah Lake Towers, Dubai",
    distance: 1.2,
    rating: 5.0,
    reviewCount: 89,
    hours: "Mon–Fri 9am–6pm",
    isOpen: true,
    priceLevel: 3,
    tags: ["Online sessions", "Sports nutrition", "Allergy specialist"],
    verified: true,
    image: "https://images.unsplash.com/photo-1601341348280-550b5e87281b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    phone: "+971 55 234 5678",
    website: "drsarakhalil.com",
    specialties: ["Sports nutrition", "Weight management", "Allergy-safe diets"],
    description: "Registered dietitian with 12 years experience specializing in sports performance and allergy-safe nutrition planning.",
  },
  {
    id: "p3",
    name: "Green Bowl Kitchen",
    type: "restaurant",
    address: "JBR The Walk, Dubai",
    distance: 0.7,
    rating: 4.6,
    reviewCount: 547,
    hours: "10am–11pm",
    isOpen: true,
    priceLevel: 2,
    tags: ["Calorie-labeled", "Gluten-free", "Vegan options", "Dairy-free"],
    featured: true,
    image: "https://images.unsplash.com/photo-1651978595428-b79169f223a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    description: "Health-focused restaurant with full calorie and allergen labeling on every dish. Extensive dairy-free and vegan menu.",
  },
  {
    id: "p4",
    name: "Ahmed Al-Farsi — Elite Trainer",
    type: "trainer",
    address: "Al Quoz Fitness District",
    distance: 2.1,
    rating: 4.9,
    reviewCount: 156,
    hours: "Flexible hours",
    isOpen: true,
    priceLevel: 3,
    tags: ["Strength & conditioning", "Online coaching", "Injury rehab"],
    verified: true,
    image: "https://images.unsplash.com/photo-1758875569414-120ebc62ada3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    specialties: ["Strength training", "Injury rehabilitation", "Body composition"],
    description: "NASM-certified trainer with 8 years experience, specializing in strength training and post-injury rehabilitation programs.",
  },
  {
    id: "p5",
    name: "Serenity Yoga & Wellness",
    type: "yoga",
    address: "Downtown Dubai",
    distance: 1.8,
    rating: 4.7,
    reviewCount: 203,
    hours: "6am–10pm",
    isOpen: true,
    priceLevel: 2,
    tags: ["Heated yoga", "Pilates", "Meditation", "Beginners welcome"],
    image: "https://images.unsplash.com/photo-1658191034407-ae6765a68d4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    description: "Boutique wellness studio offering heated Vinyasa yoga, reformer Pilates, and guided meditation — great for active recovery.",
  },
  {
    id: "p6",
    name: "The Protein Lab",
    type: "restaurant",
    address: "Business Bay, Dubai",
    distance: 3.2,
    rating: 4.4,
    reviewCount: 298,
    hours: "7am–10pm",
    isOpen: false,
    priceLevel: 1,
    tags: ["Meal prep", "High protein", "Budget-friendly", "Macros listed"],
    image: "https://images.unsplash.com/photo-1772827210055-9449904925fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    description: "Affordable meal prep restaurant with full macro tracking. Every item has protein, carbs, fat, and calorie counts displayed.",
  },
];

const FILTERS = [
  { key: "all", label: "All", icon: MapPin },
  { key: "gym", label: "Gyms", icon: Dumbbell },
  { key: "restaurant", label: "Food", icon: Utensils },
  { key: "nutritionist", label: "Nutritionists", icon: User },
  { key: "trainer", label: "Trainers", icon: User },
  { key: "yoga", label: "Wellness", icon: Sparkles },
];

const SORT_OPTIONS = ["Distance", "Rating", "Price (Low)", "Price (High)"];

// ─── Star rating ──────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${i < Math.floor(rating) ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#44403c]"}`}
        />
      ))}
    </div>
  );
}

function PriceLevel({ level }: { level: number }) {
  return (
    <span className="text-xs">
      {"$".repeat(level).split("").map((c, i) => (
        <span key={i} className={i < level ? "text-[#a8a29e]" : "text-[#44403c]"}>{c}</span>
      ))}
      {"$".repeat(3 - level).split("").map((c, i) => (
        <span key={i} className="text-[#292524]">{c}</span>
      ))}
    </span>
  );
}

// ─── Map placeholder ──────────────────────────────────────────────────────────

function MapView({ places, selectedId, onSelect }: {
  places: Place[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const positions = [
    { x: 30, y: 60 }, { x: 70, y: 35 }, { x: 50, y: 70 },
    { x: 20, y: 40 }, { x: 65, y: 65 }, { x: 80, y: 50 },
  ];

  const typeColor: Record<PlaceType, string> = {
    gym: "#3b82f6",
    restaurant: "#22c55e",
    nutritionist: "#8b5cf6",
    trainer: "#f59e0b",
    yoga: "#ec4899",
  };

  return (
    <div className="relative bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden" style={{ height: 260 }}>
      {/* Map grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }} />

      {/* Roads */}
      <div className="absolute inset-0">
        <div className="absolute left-0 right-0 top-[45%] h-px bg-[#292524]" />
        <div className="absolute left-0 right-0 top-[65%] h-px bg-[#292524]" />
        <div className="absolute top-0 bottom-0 left-[35%] w-px bg-[#292524]" />
        <div className="absolute top-0 bottom-0 left-[68%] w-px bg-[#292524]" />
      </div>

      {/* User location dot */}
      <div
        className="absolute"
        style={{ left: "48%", top: "52%", transform: "translate(-50%, -50%)" }}
      >
        <div className="relative">
          <div className="size-4 rounded-full bg-[#3b82f6] border-2 border-white shadow-lg" />
          <div className="absolute inset-0 size-4 rounded-full bg-[#3b82f6]/30 animate-ping" />
        </div>
      </div>

      {/* Place pins */}
      {places.slice(0, 6).map((place, i) => {
        const pos = positions[i];
        const color = typeColor[place.type];
        const isSelected = selectedId === place.id;
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place.id)}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -100%)" }}
          >
            <div
              className={`px-2 py-1 rounded-full text-white text-[9px] font-bold shadow-lg transition-all whitespace-nowrap ${
                isSelected ? "scale-110 shadow-xl" : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            >
              {place.name.split(" ")[0]}
            </div>
            <div className="flex justify-center">
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent" style={{ borderTopColor: color }} />
            </div>
          </button>
        );
      })}

      {/* Map label */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#0c0a09]/80 backdrop-blur-sm border border-[#292524] rounded-full">
        <Navigation className="size-3 text-[#8b5cf6]" />
        <span className="text-[10px] text-[#78716c]">Dubai Marina · Live map</span>
      </div>
    </div>
  );
}

// ─── Place Card ───────────────────────────────────────────────────────────────

function PlaceCard({ place, onClick, bookmarked, onBookmark }: {
  place: Place;
  onClick: () => void;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const typeLabel: Record<PlaceType, string> = {
    gym: "Gym", restaurant: "Restaurant", nutritionist: "Nutritionist",
    trainer: "Personal Trainer", yoga: "Yoga & Wellness",
  };
  const typeBadgeColor: Record<PlaceType, string> = {
    gym: "bg-[#1d4ed8]/20 border-[#3b82f6]/20 text-[#60a5fa]",
    restaurant: "bg-[#15803d]/20 border-[#22c55e]/20 text-[#4ade80]",
    nutritionist: "bg-[#4c1d95]/20 border-[#7c3aed]/20 text-[#c4b5fd]",
    trainer: "bg-[#92400e]/20 border-[#f59e0b]/20 text-[#fbbf24]",
    yoga: "bg-[#831843]/20 border-[#ec4899]/20 text-[#f9a8d4]",
  };

  return (
    <div
      className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden hover:border-[#3d3833] transition-all group cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img src={place.image} alt={place.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09]/60 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeBadgeColor[place.type]}`}>
            {typeLabel[place.type]}
          </span>
          {place.featured && (
            <span className="text-[10px] px-2 py-0.5 bg-[#92400e]/30 border border-[#f59e0b]/30 text-[#fbbf24] rounded-full font-medium">
              Featured
            </span>
          )}
        </div>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          className="absolute top-3 right-3 size-7 rounded-full bg-[#0c0a09]/70 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-[#0c0a09]"
        >
          {bookmarked ? (
            <BookmarkCheck className="size-3.5 text-[#8b5cf6]" />
          ) : (
            <Bookmark className="size-3.5 text-[#a8a29e]" />
          )}
        </button>

        {/* Open/closed + verified */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${place.isOpen ? "bg-[#15803d]/30 text-[#4ade80]" : "bg-[#7f1d1d]/30 text-[#f87171]"}`}>
            <div className={`size-1.5 rounded-full ${place.isOpen ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
            {place.isOpen ? "Open" : "Closed"}
          </div>
          {place.verified && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#4c1d95]/30 rounded-full">
              <Shield className="size-2.5 text-[#8b5cf6]" />
              <span className="text-[10px] text-[#c4b5fd] font-medium">Verified</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#fafaf9] leading-snug">{place.name}</h3>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Stars rating={place.rating} />
          <span className="text-xs font-semibold text-[#fafaf9]">{place.rating}</span>
          <span className="text-[10px] text-[#78716c]">({place.reviewCount})</span>
          <span className="text-[#292524]">·</span>
          <PriceLevel level={place.priceLevel} />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-[10px] text-[#78716c]">
            <MapPin className="size-3" /> {place.distance} km
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#78716c]">
            <Clock className="size-3" /> {place.hours}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {place.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-[#292524] text-[#78716c] rounded-full">
              {tag}
            </span>
          ))}
          {place.tags.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 text-[#44403c]">+{place.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Place Detail Sheet ───────────────────────────────────────────────────────

function PlaceDetailSheet({ place, onClose, bookmarked, onBookmark }: {
  place: Place; onClose: () => void; bookmarked: boolean; onBookmark: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1c1917] border border-[#292524] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Hero image */}
        <div className="relative h-48 flex-shrink-0">
          <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-8 rounded-full bg-[#0c0a09]/70 flex items-center justify-center"
          >
            <X className="size-4 text-[#a8a29e]" />
          </button>
          {place.verified && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-[#4c1d95]/80 backdrop-blur-sm rounded-full">
              <Shield className="size-3 text-[#8b5cf6]" />
              <span className="text-[10px] text-[#c4b5fd] font-medium">Verified on Hayetak</span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Name + bookmark */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#fafaf9]">{place.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={place.rating} />
                  <span className="text-sm font-semibold text-[#fafaf9]">{place.rating}</span>
                  <span className="text-xs text-[#78716c]">({place.reviewCount} reviews)</span>
                </div>
              </div>
              <button
                onClick={onBookmark}
                className={`size-9 rounded-xl flex items-center justify-center border transition-all ${
                  bookmarked
                    ? "bg-[#4c1d95]/30 border-[#7c3aed]/30 text-[#8b5cf6]"
                    : "bg-[#292524] border-[#44403c] text-[#78716c]"
                }`}
              >
                {bookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              </button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#292524] rounded-xl p-3">
                <p className="text-[10px] text-[#78716c] mb-0.5">Distance</p>
                <p className="text-sm font-semibold text-[#fafaf9]">{place.distance} km away</p>
              </div>
              <div className="bg-[#292524] rounded-xl p-3">
                <p className="text-[10px] text-[#78716c] mb-0.5">Hours</p>
                <p className="text-sm font-semibold text-[#fafaf9]">{place.hours}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-[#a8a29e] leading-relaxed">{place.description}</p>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-semibold text-[#78716c] uppercase tracking-wide mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {place.tags.map((tag) => (
                  <div key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#292524] border border-[#44403c] rounded-full">
                    <Check className="size-3 text-[#22c55e]" />
                    <span className="text-xs text-[#a8a29e]">{tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialties for professionals */}
            {place.specialties && (
              <div>
                <p className="text-xs font-semibold text-[#78716c] uppercase tracking-wide mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {place.specialties.map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 bg-[#4c1d95]/20 border border-[#7c3aed]/20 text-[#c4b5fd] rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-[#78716c] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#a8a29e]">{place.address}</p>
            </div>
          </div>
        </div>

        {/* CTA footer */}
        <div className="px-6 py-4 border-t border-[#292524] flex gap-3 flex-shrink-0">
          {(place.type === "nutritionist" || place.type === "trainer") ? (
            <>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#292524] border border-[#44403c] hover:border-[#57534e] text-[#a8a29e] rounded-xl text-sm font-medium transition-all">
                <MessageSquare className="size-4" /> Message
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all">
                <Calendar className="size-4" /> Book session
              </button>
            </>
          ) : (
            <>
              {place.phone && (
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#292524] border border-[#44403c] hover:border-[#57534e] text-[#a8a29e] rounded-xl text-sm font-medium transition-all">
                  <Phone className="size-4" />
                </button>
              )}
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all">
                <Navigation className="size-4" /> Get directions
              </button>
              {place.website && (
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#292524] border border-[#44403c] hover:border-[#57534e] text-[#a8a29e] rounded-xl text-sm font-medium transition-all">
                  <Globe className="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NearbyPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("Distance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = PLACES.filter((p) => {
    if (activeFilter !== "all" && p.type !== activeFilter) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.description.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "Distance") return a.distance - b.distance;
    if (sortBy === "Rating") return b.rating - a.rating;
    if (sortBy === "Price (Low)") return a.priceLevel - b.priceLevel;
    if (sortBy === "Price (High)") return b.priceLevel - a.priceLevel;
    return 0;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#fafaf9]">Nearby</h1>
        <p className="text-sm text-[#78716c]">Gyms, nutritionists, trainers & healthy dining near you</p>
      </div>

      {/* Search + controls */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gyms, nutritionists, restaurants..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1c1917] border border-[#292524] focus:border-[#7c3aed] rounded-xl text-sm text-[#fafaf9] placeholder-[#44403c] outline-none transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c]">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-full px-3 pr-8 bg-[#1c1917] border border-[#292524] rounded-xl text-sm text-[#a8a29e] outline-none appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#44403c] rotate-90 pointer-events-none" />
        </div>

        {/* View toggle */}
        <div className="flex bg-[#1c1917] border border-[#292524] rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-[#7c3aed] text-white" : "text-[#78716c] hover:text-[#a8a29e]"}`}
          >
            <List className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-2 rounded-lg transition-all ${viewMode === "map" ? "bg-[#7c3aed] text-white" : "text-[#78716c] hover:text-[#a8a29e]"}`}
          >
            <Map className="size-4" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0 ${
              activeFilter === f.key
                ? "bg-[#7c3aed] border-[#7c3aed] text-white"
                : "bg-[#1c1917] border-[#292524] text-[#78716c] hover:border-[#44403c]"
            }`}
          >
            <f.icon className="size-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Map view */}
      {viewMode === "map" && (
        <div className="mb-5">
          <MapView
            places={filtered}
            selectedId={mapSelectedId}
            onSelect={(id) => {
              setMapSelectedId(id);
              const place = PLACES.find((p) => p.id === id);
              if (place) setSelectedPlace(place);
            }}
          />
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#78716c]">
          {filtered.length} places near you {query ? `matching "${query}"` : ""}
        </p>
        {bookmarks.size > 0 && (
          <button
            onClick={() => setActiveFilter("all")}
            className="flex items-center gap-1.5 text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
          >
            <BookmarkCheck className="size-3.5" /> {bookmarks.size} saved
          </button>
        )}
      </div>

      {/* Places grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onClick={() => setSelectedPlace(place)}
              bookmarked={bookmarks.has(place.id)}
              onBookmark={() => toggleBookmark(place.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="size-12 text-[#292524] mb-4" />
          <p className="text-sm font-medium text-[#fafaf9] mb-1">No places found</p>
          <p className="text-xs text-[#78716c]">Try adjusting your search or filters</p>
          <button
            onClick={() => { setQuery(""); setActiveFilter("all"); }}
            className="mt-4 text-xs text-[#8b5cf6] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Hayetak verified banner */}
      <div className="mt-8 flex items-start gap-3 px-5 py-4 bg-[#1c1917] border border-[#292524] rounded-2xl">
        <Shield className="size-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#fafaf9]">Hayetak-verified professionals</p>
          <p className="text-xs text-[#78716c] leading-relaxed mt-0.5">
            Nutritionists and trainers with a Verified badge have been credential-checked by the Hayetak team. Always confirm qualifications before booking sessions.
          </p>
        </div>
      </div>

      {/* Place detail sheet */}
      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          bookmarked={bookmarks.has(selectedPlace.id)}
          onBookmark={() => toggleBookmark(selectedPlace.id)}
        />
      )}
    </div>
  );
}
