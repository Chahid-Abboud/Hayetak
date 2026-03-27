# Hayetak Component Architecture

## Component Hierarchy & Organization

This document defines the complete component library structure for Hayetak, organized by category and complexity.

---

## Directory Structure

```
/src/app/components/
├── ui/                          # Base UI components (atoms)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   ├── checkbox.tsx
│   ├── radio.tsx
│   ├── switch.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── card.tsx
│   ├── skeleton.tsx
│   ├── progress.tsx
│   ├── separator.tsx
│   └── tooltip.tsx
├── layout/                      # Layout components
│   ├── PublicLayout.tsx
│   ├── ClientLayout.tsx
│   ├── ProfessionalLayout.tsx
│   ├── AdminLayout.tsx
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   ├── BottomNav.tsx
│   └── Container.tsx
├── navigation/                  # Navigation components
│   ├── NavLink.tsx
│   ├── NavMenu.tsx
│   ├── Breadcrumbs.tsx
│   └── Tabs.tsx
├── overlays/                    # Modals, drawers, tooltips
│   ├── Modal.tsx
│   ├── Drawer.tsx
│   ├── Sheet.tsx
│   ├── Dropdown.tsx
│   ├── Popover.tsx
│   └── Toast.tsx
├── forms/                       # Form components
│   ├── Form.tsx
│   ├── FormField.tsx
│   ├── FormLabel.tsx
│   ├── FormError.tsx
│   ├── FormSection.tsx
│   └── SearchInput.tsx
├── data-display/               # Tables, lists, charts
│   ├── Table.tsx
│   ├── DataList.tsx
│   ├── StatCard.tsx
│   ├── MetricCard.tsx
│   ├── ChartContainer.tsx
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   ├── DonutChart.tsx
│   └── ProgressRing.tsx
├── feedback/                   # Loading, empty, error states
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   ├── LoadingSpinner.tsx
│   ├── SkeletonCard.tsx
│   └── Alert.tsx
├── domain/                     # Domain-specific components
│   ├── meal/
│   │   ├── MealCard.tsx
│   │   ├── MealTimeline.tsx
│   │   ├── MealLogModal.tsx
│   │   ├── MacroBar.tsx
│   │   └── FoodSearchInput.tsx
│   ├── workout/
│   │   ├── WorkoutCard.tsx
│   │   ├── ExerciseItem.tsx
│   │   ├── SetInput.tsx
│   │   ├── RestTimer.tsx
│   │   └── WorkoutCalendar.tsx
│   ├── coach/
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ConversationList.tsx
│   │   └── SuggestedPrompts.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── HealthMetrics.tsx
│   │   ├── GoalCard.tsx
│   │   └── AllergyBadge.tsx
│   └── professional/
│       ├── ClientCard.tsx
│       ├── ClientDetailPanel.tsx
│       └── AppointmentCard.tsx
└── figma/                      # Figma system components
    └── ImageWithFallback.tsx   # Protected
```

---

## Base UI Components (`/ui`)

### **Button**

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'base' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Variants:**
- `primary`: Filled with primary color, white text
- `secondary`: Filled with secondary color
- `outline`: Border with transparent background
- `ghost`: No border, hover background only
- `danger`: Red destructive action

**States:** default, hover, active, disabled, loading (spinner replaces icon)

---

### **Input**

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  label?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  maxLength?: number;
  showCount?: boolean;
  onChange?: (value: string) => void;
}
```

**Features:**
- Optional floating label
- Error state with message below
- Character counter when maxLength set
- Prefix/suffix icons (e.g., search icon, clear button)

---

### **Select**

```tsx
interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: { label: string; value: string; disabled?: boolean }[];
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  onChange?: (value: string | string[]) => void;
}
```

---

### **Textarea**

```tsx
interface TextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  autoResize?: boolean;
  onChange?: (value: string) => void;
}
```

---

### **Card**

```tsx
interface CardProps {
  variant?: 'flat' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'base' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Variants:**
- `flat`: No shadow, background only
- `elevated`: Subtle shadow (default)
- `outlined`: Border instead of shadow
- `interactive`: Hover state with scale/shadow

---

### **Badge**

```tsx
interface BadgeProps {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'base';
  dot?: boolean;
  children: React.ReactNode;
}
```

---

### **Avatar**

```tsx
interface AvatarProps {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  src?: string;
  alt?: string;
  initials?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  fallbackIcon?: React.ReactNode;
}
```

---

## Layout Components (`/layout`)

### **ClientLayout**

```tsx
interface ClientLayoutProps {
  children: React.ReactNode;
}
```

**Structure:**
- Desktop: Sidebar (240px) + TopBar (64px) + Content
- Mobile: BottomNav (64px) + TopBar (56px) + Content
- Persistent user profile dropdown
- Theme toggle
- Notifications icon
- Search (global)

---

### **ProfessionalLayout**

Similar to ClientLayout with additions:
- "Professional Mode" indicator
- Role badge in profile menu
- Access to professional nav items

---

### **AdminLayout**

```tsx
interface AdminLayoutProps {
  children: React.ReactNode;
}
```

**Structure:**
- Compact sidebar (200px)
- Admin badge/indicator
- System health status
- Quick action toolbar

---

### **PublicLayout**

```tsx
interface PublicLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}
```

**Structure:**
- Minimal header (logo + auth buttons)
- Centered content
- Footer (links, legal)

---

## Navigation Components (`/navigation`)

### **Tabs**

```tsx
interface TabsProps {
  variant?: 'line' | 'pills' | 'segmented';
  items: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}
```

---

### **Breadcrumbs**

```tsx
interface BreadcrumbsProps {
  items: { label: string; href?: string }[];
}
```

---

## Overlays (`/overlays`)

### **Modal**

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}
```

**Features:**
- Backdrop overlay
- Focus trap
- Escape key to close
- Scroll lock on body

---

### **Drawer**

```tsx
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'base' | 'lg';
  children: React.ReactNode;
}
```

---

### **Toast**

```tsx
interface ToastProps {
  variant?: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description?: string;
  duration?: number; // Auto-dismiss in ms
  action?: { label: string; onClick: () => void };
}
```

**Features:**
- Auto-dismiss with progress bar
- Stacked toasts (max 3 visible)
- Swipe to dismiss on mobile

---

## Form Components (`/forms`)

### **Form**

```tsx
interface FormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
  loading?: boolean;
}
```

**Features:**
- Handles form state
- Validation
- Error display
- Loading state

---

### **FormField**

```tsx
interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}
```

---

### **SearchInput**

```tsx
interface SearchInputProps {
  value: string;
  placeholder?: string;
  loading?: boolean;
  onSearch: (value: string) => void;
  debounceMs?: number;
}
```

---

## Data Display (`/data-display`)

### **Table**

```tsx
interface TableProps {
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => React.ReactNode;
  }[];
  data: any[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  selectable?: boolean;
  onRowClick?: (row: any) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}
```

---

### **StatCard**

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    period: string; // e.g., "vs last week"
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}
```

**Visual:**
- Large value display
- Small label above
- Icon in top-right
- Trend indicator (↑ green, ↓ red, → neutral)
- Optional change percentage

---

### **ChartContainer**

```tsx
interface ChartContainerProps {
  title: string;
  timeframe?: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
  };
  children: React.ReactNode; // Recharts chart
  loading?: boolean;
  emptyState?: React.ReactNode;
}
```

---

## Feedback (`/feedback`)

### **EmptyState**

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

### **ErrorState**

```tsx
interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}
```

---

### **LoadingSpinner**

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'base' | 'lg';
  label?: string;
}
```

---

## Domain Components (`/domain`)

### **MealCard** (`/domain/meal`)

```tsx
interface MealCardProps {
  meal: {
    id: string;
    name: string;
    time: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    foods: Array<{ name: string; portion: string }>;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}
```

**Visual:**
- Card with meal name + time
- Foods list (collapsible if >3 items)
- Macro summary (horizontal bar or badges)
- Edit/delete actions (hover/menu)

---

### **MacroBar** (`/domain/meal`)

```tsx
interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  total: number;
  showLabels?: boolean;
  showValues?: boolean;
}
```

**Visual:**
- Stacked horizontal bar (protein green, carbs blue, fat amber)
- Optional labels above bar
- Optional values (g) inside segments

---

### **WorkoutCard** (`/domain/workout`)

```tsx
interface WorkoutCardProps {
  workout: {
    id: string;
    name: string;
    duration?: number;
    exercises: number;
    completed?: boolean;
    date?: string;
  };
  variant?: 'planned' | 'history';
  onClick?: () => void;
}
```

---

### **ExerciseItem** (`/domain/workout`)

```tsx
interface ExerciseItemProps {
  exercise: {
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    instructions?: string;
  };
  mode?: 'view' | 'edit' | 'active';
  onComplete?: () => void;
}
```

**Modes:**
- `view`: Read-only display
- `edit`: Inputs for sets/reps/weight
- `active`: During workout (rest timer, complete button)

---

### **RestTimer** (`/domain/workout`)

```tsx
interface RestTimerProps {
  duration: number; // seconds
  onComplete: () => void;
  onSkip: () => void;
}
```

**Visual:**
- Circular progress indicator
- Countdown in center
- Skip button

---

### **ChatMessage** (`/domain/coach`)

```tsx
interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    context?: {
      meals?: string[];
      restrictions?: string[];
    };
  };
}
```

**Visual:**
- User messages: Right-aligned, primary color
- AI messages: Left-aligned, card background
- Optional context indicators (badges for referenced meals, etc.)

---

### **ChatInput** (`/domain/coach`)

```tsx
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
}
```

---

### **ClientCard** (`/domain/professional`)

```tsx
interface ClientCardProps {
  client: {
    id: string;
    name: string;
    avatar?: string;
    status: 'active' | 'inactive';
    lastActivity: string;
    goals?: string[];
  };
  selected?: boolean;
  onClick?: () => void;
}
```

---

### **AllergyBadge** (`/domain/profile`)

```tsx
interface AllergyBadgeProps {
  allergy: string;
  removable?: boolean;
  onRemove?: () => void;
}
```

**Visual:**
- Danger variant badge
- Warning icon
- Optional close button

---

## Component Composition Patterns

### **Master-Detail Layout**

```tsx
<div className="flex gap-4 h-screen">
  <aside className="w-80 overflow-y-auto border-r">
    {/* List of items */}
  </aside>
  <main className="flex-1 overflow-y-auto">
    {/* Detail view */}
  </main>
</div>
```

---

### **Dashboard Grid**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <StatCard />
  <StatCard />
  <StatCard />
</div>
```

---

### **Timeline Layout**

```tsx
<div className="space-y-4">
  {items.map(item => (
    <div key={item.id} className="flex gap-4">
      <div className="text-sm text-muted-foreground w-24">
        {item.time}
      </div>
      <div className="flex-1">
        <Card>{item.content}</Card>
      </div>
    </div>
  ))}
</div>
```

---

### **Sticky Action Bar**

```tsx
<div className="sticky bottom-0 bg-background border-t p-4 shadow-lg">
  <div className="flex gap-2 justify-end max-w-screen-xl mx-auto">
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Save Changes</Button>
  </div>
</div>
```

---

## Accessibility Checklist

All components must include:
- [ ] Semantic HTML elements
- [ ] ARIA labels and roles
- [ ] Keyboard navigation support
- [ ] Focus indicators (2px primary outline)
- [ ] Screen reader announcements for state changes
- [ ] Color contrast (WCAG AA minimum)
- [ ] Error messages associated with inputs (aria-describedby)

---

## Responsive Component Guidelines

### **Mobile Adaptations**
- Tables → Card lists
- Side-by-side → Stacked
- Hover states → Press/tap states
- Tooltips → Bottom sheets or inline
- Multi-column grids → Single column

### **Breakpoint Strategy**
- `sm` (640px): Mobile landscape, minor adjustments
- `md` (768px): Tablet, 2-column grids
- `lg` (1024px): Desktop, full layout with sidebar
- `xl` (1280px): Large desktop, max content width

---

## Performance Patterns

### **Code Splitting**
- Lazy load modals: `const Modal = lazy(() => import('./Modal'))`
- Lazy load routes: Use React Router lazy loading
- Lazy load charts: Load Recharts only when needed

### **Memoization**
- Use `React.memo()` for expensive list items
- Use `useMemo()` for computed values in charts
- Use `useCallback()` for event handlers passed to children

### **Image Optimization**
- Use ImageWithFallback for all user-uploaded images
- Lazy load images below fold
- Use appropriate sizes (avatar: 40x40, card: 300x200, etc.)

---

**Last Updated:** March 2026  
**Component Architecture Version:** 1.0.0
