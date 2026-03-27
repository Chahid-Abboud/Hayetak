# Hayetak Sitemap & Architecture

## Overview

Hayetak is organized into **four primary contexts** based on user role:
1. **Public** – Marketing, authentication, onboarding
2. **Client** – Core health platform (nutrition, fitness, AI coaching)
3. **Professional** – Trainer/nutritionist tools for client management
4. **Admin** – Platform management and operations

---

## Complete Sitemap

### 🌐 **Public & Authentication**

#### Landing Page
- **Route:** `/`
- **Layout:** PublicLayout
- **Sections:**
  - Hero (value proposition, CTA)
  - Features overview (AI planning, tracking, coaching)
  - How it works
  - Testimonials
  - Pricing tiers (if applicable)
  - Footer

#### Login
- **Route:** `/login`
- **Layout:** PublicLayout (centered card)
- **Elements:**
  - Email + password inputs
  - "Remember me" checkbox
  - "Forgot password?" link
  - Login button
  - Social login options (optional)
  - "Don't have an account? Register" link

#### Register
- **Route:** `/register`
- **Layout:** PublicLayout (centered card)
- **Elements:**
  - Name, email, password, confirm password
  - Terms acceptance checkbox
  - Register button
  - "Already have an account? Login" link

#### Forgot Password
- **Route:** `/forgot-password`
- **Layout:** PublicLayout (centered card)
- **Elements:**
  - Email input
  - Submit button
  - Back to login link

#### Reset Password
- **Route:** `/reset-password/:token`
- **Layout:** PublicLayout (centered card)
- **Elements:**
  - New password input
  - Confirm password input
  - Submit button

#### Confirm Password
- **Route:** `/confirm-password`
- **Layout:** PublicLayout (centered card)
- **Elements:**
  - Current password input (for sensitive operations)
  - Confirm button

#### Verify Email
- **Route:** `/verify-email/:token`
- **Layout:** PublicLayout (centered card)
- **States:**
  - Loading (verifying token)
  - Success (redirect to dashboard)
  - Error (expired/invalid token)

#### Two-Factor Challenge
- **Route:** `/2fa-challenge`
- **Layout:** PublicLayout (centered card)
- **Elements:**
  - 6-digit code input
  - Verify button
  - "Use recovery code" option
  - Resend code link

---

### 👤 **Client / Core App**

*All routes under `/app` use ClientLayout with persistent navigation*

#### Dashboard
- **Route:** `/app` or `/app/dashboard`
- **Layout:** ClientLayout
- **Sections:**
  - Welcome header (personalized greeting, current streak)
  - Today's overview cards:
    - Calories consumed / target
    - Macros breakdown (mini chart)
    - Workouts completed today
    - Water intake
    - Steps (if tracked)
  - Quick actions (log meal, start workout, message coach)
  - Recent activity timeline (last 3 days)
  - Upcoming appointments
  - AI insights card (suggestions, achievements)
- **Responsive:**
  - Desktop: 3-column grid for stat cards
  - Mobile: Single column stack

#### AI Coach Chat
- **Route:** `/app/coach`
- **Layout:** ClientLayout
- **Pattern:** Master-detail (chat list + active conversation)
- **Elements:**
  - Conversation list (sidebar/drawer)
    - "New conversation" button
    - Past conversations (grouped by date)
  - Active chat area:
    - Message thread (user + AI responses)
    - Context indicators (today's meals, restrictions visible)
    - Input field with send button
    - Suggested questions/prompts
    - Safety notice (disclaimers for medical advice)
- **Responsive:**
  - Desktop: Side-by-side
  - Mobile: Full screen chat, hamburger to access conversation list

#### Meal Tracking
- **Route:** `/app/meals`
- **Layout:** ClientLayout
- **Sections:**
  - Header:
    - Date selector (today + navigation)
    - Daily calorie/macro summary
    - "Log meal" button
  - Timeline layout:
    - Breakfast section (logged meals + add button)
    - Lunch section
    - Dinner section
    - Snacks section
  - Each meal card:
    - Food name + portion
    - Calories + macros
    - Edit/delete actions
  - Weekly summary view toggle
  - Filter by date range
- **Modals:**
  - Log meal: Search food OR manual entry OR photo scan (future)
  - Edit meal
- **Responsive:**
  - Desktop: Wide timeline with side stats
  - Mobile: Stack timeline, floating add button

#### Nutrition Plan (Sub-route)
- **Route:** `/app/meals/plan`
- **Layout:** ClientLayout
- **Sections:**
  - Current plan overview (goals, restrictions, preferences)
  - Weekly meal suggestions (AI-generated)
  - Macro targets visualization
  - "Regenerate plan" button
  - Edit preferences link

#### Workout Planner
- **Route:** `/app/workouts`
- **Layout:** ClientLayout
- **Sections:**
  - Header:
    - Current program name
    - Progress indicator (week X of Y)
    - "Start workout" CTA
  - Weekly schedule (calendar view):
    - Each day shows planned workout
    - Rest days indicated
    - Completed workouts (checkmark)
  - Workout library (browse exercises)
  - Filter by muscle group, equipment, difficulty
- **Responsive:**
  - Desktop: Calendar + detail panel
  - Mobile: List view with expand

#### Workout Log / Active Workout
- **Route:** `/app/workouts/log/:id` (active session)
- **Layout:** ClientLayout (minimal chrome, focus mode)
- **Sections:**
  - Workout title + duration timer
  - Exercise list (sequence):
    - Exercise name + instructions (collapsible)
    - Sets/reps/weight input fields
    - Rest timer between sets
    - Complete set button
    - Notes field (optional)
  - Progress indicator (X of Y exercises)
  - Finish workout button
  - Cancel/pause options
- **Responsive:**
  - Desktop: Centered focus area
  - Mobile: Full screen, bottom action bar

#### Workout History (Sub-route)
- **Route:** `/app/workouts/history`
- **Layout:** ClientLayout
- **Sections:**
  - Date range filter
  - Timeline of past workouts:
    - Date + workout name
    - Duration
    - Exercises completed
    - Volume stats (total weight, reps)
  - Progress charts (strength over time)

#### Nearby / Places
- **Route:** `/app/nearby`
- **Layout:** ClientLayout
- **Sections:**
  - Search bar (location + filters)
  - Map view (if enabled)
  - List view:
    - Gyms
    - Healthy restaurants
    - Nutritionists/trainers
    - Yoga studios
  - Each place card:
    - Name, rating, distance
    - Photo
    - Quick info (hours, price)
    - Bookmark button
  - Filter by type, distance, rating
- **Responsive:**
  - Desktop: Map + list side-by-side
  - Mobile: Toggle between map and list

#### Messages
- **Route:** `/app/messages`
- **Layout:** ClientLayout
- **Pattern:** Master-detail
- **Elements:**
  - Conversation list (sidebar):
    - Filter: All, Trainers, Nutritionists, Support
    - Search conversations
    - Each conversation preview (avatar, name, last message, timestamp)
  - Active conversation:
    - Header (recipient name, role badge, online status)
    - Message thread
    - Input field + send button
    - Attachment options (images, files)
- **Responsive:**
  - Desktop: Side-by-side
  - Mobile: Full screen conversation, back to list

#### Appointments
- **Route:** `/app/appointments`
- **Layout:** ClientLayout
- **Sections:**
  - Header:
    - "Book appointment" button
    - View toggle (calendar / list)
  - Calendar view:
    - Month/week view
    - Upcoming appointments highlighted
  - List view:
    - Upcoming appointments (sorted by date)
    - Past appointments (collapsed by default)
  - Each appointment card:
    - Date + time
    - Professional name + role
    - Type (consultation, follow-up, etc.)
    - Location (in-person / video)
    - Cancel/reschedule buttons
- **Modals:**
  - Book appointment: Select professional → date/time → confirm
  - Reschedule
  - Cancel confirmation
- **Responsive:**
  - Desktop: Calendar with side panel for details
  - Mobile: List view primary, calendar in modal

#### Profile Settings
- **Route:** `/app/settings/profile`
- **Layout:** ClientLayout
- **Sections:**
  - Personal info:
    - Name, email (read-only), phone
    - Profile photo upload
    - Date of birth, sex
  - Health profile:
    - Height, weight
    - Goals (lose weight, gain muscle, maintain, etc.)
    - Activity level
  - Preferences:
    - Diet type (vegan, keto, etc.)
    - Allergies (multi-select with warning badge)
    - Dislikes
  - Medical info (progressive disclosure):
    - Conditions
    - Medications
  - Injury history:
    - Past/current injuries
    - Limitations
  - Save changes button
- **Responsive:**
  - Desktop: Two-column form
  - Mobile: Single column

#### Password Settings
- **Route:** `/app/settings/password`
- **Layout:** ClientLayout
- **Elements:**
  - Current password input
  - New password input
  - Confirm new password input
  - Password strength indicator
  - Update password button

#### Appearance Settings
- **Route:** `/app/settings/appearance`
- **Layout:** ClientLayout
- **Elements:**
  - Theme selector (Light / Dark / System)
  - Color scheme preview
  - Font size adjuster (accessibility)
  - Reduced motion toggle

#### Two-Factor Settings
- **Route:** `/app/settings/2fa`
- **Layout:** ClientLayout
- **Sections:**
  - Status indicator (enabled/disabled)
  - Enable 2FA flow:
    - QR code display
    - Backup codes generation
    - Verification step
  - Disable 2FA button (requires password confirmation)
  - Regenerate backup codes

---

### 💼 **Professional (Trainer / Nutritionist)**

*All routes under `/professional` use ProfessionalLayout*

#### Professional Dashboard
- **Route:** `/professional` or `/professional/dashboard`
- **Layout:** ProfessionalLayout
- **Sections:**
  - Overview stats:
    - Total active clients
    - Appointments today
    - Pending messages
    - This week's sessions completed
  - Today's schedule (appointment list)
  - Recent client activity (meals logged, workouts completed)
  - Quick actions (message client, create plan, book appointment)

#### Trainer Clients
- **Route:** `/professional/clients`
- **Layout:** ProfessionalLayout
- **Pattern:** Master-detail
- **Elements:**
  - Client list (sidebar):
    - Search + filter (active, inactive, tags)
    - Sort (name, last activity, join date)
    - Each client card (avatar, name, status indicator)
  - Client detail panel:
    - Header (name, contact, assigned date)
    - Tabs:
      - **Overview:** Stats, goals, recent activity
      - **Workout Plans:** Current program, history
      - **Nutrition:** Meal tracking summary, restrictions
      - **Progress:** Charts (weight, strength, measurements)
      - **Notes:** Private professional notes
    - Actions: Message, book appointment, edit plan
- **Responsive:**
  - Desktop: Side-by-side
  - Mobile: Full screen detail, back to list

#### Nutritionist Clients
- **Route:** `/professional/nutrition-clients`
- **Layout:** ProfessionalLayout
- **Pattern:** Similar to Trainer Clients
- **Differences:**
  - Emphasis on meal tracking, macro adherence
  - Tabs: Overview, Meal Logs, Plans, Progress, Notes
  - Charts focus on nutrition metrics

#### Professional Messages
- **Route:** `/professional/messages`
- **Layout:** ProfessionalLayout
- **Pattern:** Same as client messages, but context is professional
- **Elements:**
  - Filter by client
  - Unread badge indicator
  - Quick reply templates
  - Professional signature

#### Professional Appointments
- **Route:** `/professional/appointments`
- **Layout:** ProfessionalLayout
- **Sections:**
  - Calendar view (week/month)
  - Availability management (set working hours, block time)
  - Appointment requests (pending approval)
  - Completed appointments log

---

### ⚙️ **Admin**

*All routes under `/admin` use AdminLayout*

#### Admin Dashboard
- **Route:** `/admin`
- **Layout:** AdminLayout
- **Sections:**
  - System health metrics:
    - Total users (growth chart)
    - Active sessions
    - API health status
  - Recent activity log (last 20 events)
  - Moderation queue summary
  - Quick actions (view logs, manage users)

#### Admin Users List
- **Route:** `/admin/users`
- **Layout:** AdminLayout
- **Sections:**
  - Search + filters:
    - Role (client, trainer, nutritionist, admin)
    - Status (active, suspended, pending)
    - Registration date range
  - Users table:
    - Columns: Name, email, role, status, joined date, last active
    - Sort by any column
    - Actions: View detail, suspend, delete
  - Pagination
- **Responsive:**
  - Desktop: Full table
  - Mobile: Card list

#### Admin User Detail
- **Route:** `/admin/users/:id`
- **Layout:** AdminLayout
- **Sections:**
  - User info (read-only):
    - Profile data
    - Account status
    - Subscription tier (if applicable)
  - Activity log (user-specific)
  - Sessions history
  - Actions:
    - Suspend/unsuspend
    - Reset password (send email)
    - Delete account (with confirmation)
    - Impersonate (caution warning)

#### Admin Logs
- **Route:** `/admin/logs`
- **Layout:** AdminLayout
- **Sections:**
  - Filter by:
    - Log type (error, warning, info, auth)
    - Date range
    - User ID
    - Action type
  - Logs table:
    - Timestamp, type, user, action, details
    - Expandable rows for full log data
  - Export logs button (CSV)

#### Admin Notifications
- **Route:** `/admin/notifications`
- **Layout:** AdminLayout
- **Sections:**
  - Create notification:
    - Target (all users, specific role, specific user)
    - Type (info, warning, maintenance)
    - Title + message
    - Schedule (now or future date)
  - Sent notifications history:
    - Notification details
    - Recipients count
    - Delivery status
    - Delete/edit draft

#### Admin Professional Verifications
- **Route:** `/admin/verifications`
- **Layout:** AdminLayout
- **Sections:**
  - Pending verification requests:
    - Professional name
    - Role (trainer / nutritionist)
    - Submitted documents (credentials, certifications)
    - Application date
  - Actions: Approve, reject (with reason), request more info
  - Verified professionals list

#### Admin Professionals
- **Route:** `/admin/professionals`
- **Layout:** AdminLayout
- **Sections:**
  - Professionals table:
    - Name, role, verification status, clients count
    - Filter by role, status
    - Actions: View detail, suspend, revoke verification

#### Admin Meals
- **Route:** `/admin/meals`
- **Layout:** AdminLayout
- **Sections:**
  - Food database management:
    - Search foods
    - Add new food item
    - Edit food (name, macros, allergens)
    - Delete food
  - User-submitted foods (pending review)
  - Nutrition API sync status

#### Admin Places
- **Route:** `/admin/places`
- **Layout:** AdminLayout
- **Sections:**
  - Places database:
    - Gyms, restaurants, studios
    - Search + filter by type, location
  - Add new place
  - Edit place details
  - Approve user-submitted places
  - Sync with external APIs (Google Places, etc.)

#### Admin Progress
- **Route:** `/admin/progress`
- **Layout:** AdminLayout
- **Sections:**
  - Platform analytics:
    - User growth chart (monthly, quarterly)
    - Engagement metrics (DAU, MAU, retention)
    - Feature usage (most logged meals, workouts, messages)
    - Revenue metrics (if applicable)
  - Export reports

---

## Route Structure Summary

```
/ (Public)
├── /login
├── /register
├── /forgot-password
├── /reset-password/:token
├── /confirm-password
├── /verify-email/:token
└── /2fa-challenge

/app (Client)
├── /dashboard
├── /coach
├── /meals
│   ├── /plan
│   └── /history
├── /workouts
│   ├── /plan
│   ├── /log/:id
│   └── /history
├── /nearby
├── /messages
├── /appointments
└── /settings
    ├── /profile
    ├── /password
    ├── /appearance
    └── /2fa

/professional (Professional)
├── /dashboard
├── /clients (trainers)
├── /nutrition-clients (nutritionists)
├── /messages
└── /appointments

/admin (Admin)
├── /dashboard
├── /users
│   └── /:id
├── /logs
├── /notifications
├── /verifications
├── /professionals
├── /meals
├── /places
└── /progress
```

---

## Page Architecture Patterns

### **Dashboard Pattern**
- Grid layout (stat cards)
- Chart widgets
- Quick action buttons
- Recent activity feed
- Used in: Client Dashboard, Professional Dashboard, Admin Dashboard

### **Master-Detail Pattern**
- Sidebar list (30-40% width)
- Detail panel (60-70% width)
- Used in: Messages, Professional Clients, Appointments (desktop)

### **Timeline Pattern**
- Vertical chronological layout
- Date markers
- Event cards with actions
- Used in: Meal Tracking, Workout History, Activity Log

### **Form Pattern**
- Multi-section forms with progressive disclosure
- Inline validation
- Sticky footer with actions
- Used in: Profile Settings, Meal Logging, Workout Creation

### **Table/List Pattern**
- Filterable, sortable tables
- Pagination
- Bulk actions
- Used in: Admin Users, Admin Logs, Admin Professionals

### **Focus Mode Pattern**
- Minimal UI chrome
- Timer + progress indicator
- Sticky action bar
- Used in: Active Workout Log, AI Coach Chat

---

## Navigation Architecture

### **Client Navigation Hierarchy**
1. **Primary (Sidebar/Bottom Nav):** Dashboard, Coach, Meals, Workouts, Nearby, Messages, Appointments
2. **Secondary (Profile Menu):** Profile Settings, Password, Appearance, 2FA, Logout
3. **Contextual (In-page):** Sub-routes and tabs within features

### **Professional Navigation Hierarchy**
1. **Primary:** Dashboard, Clients, Messages, Appointments
2. **Secondary:** Switch to Client View, Profile, Logout
3. **Contextual:** Client detail tabs

### **Admin Navigation Hierarchy**
1. **Primary:** Dashboard, Users, Professionals, Content (Meals, Places), Logs
2. **Secondary:** System Settings, Logout
3. **Contextual:** Filters, search, detail views

---

## Mobile-Specific Patterns

### **Bottom Navigation (Client App)**
- 5 primary tabs: Dashboard, Coach, Meals, Workouts, More
- "More" opens drawer with: Nearby, Messages, Appointments, Settings

### **Hamburger Menu (Admin/Professional)**
- Icon in top-left
- Drawer slides from left
- Full navigation tree

### **Bottom Sheets**
- Used for: Filters, quick actions, modals on mobile
- Swipe to dismiss

### **Floating Action Button (FAB)**
- Used in: Meal Tracking ("Log Meal"), Workout History ("Start Workout")
- Bottom-right corner, elevated

### **Pull to Refresh**
- Applied to: Feeds, timelines, lists

---

## State Management Architecture

### **Global State**
- User auth (token, role, profile)
- Theme preference
- Current route

### **Feature State**
- Meal tracking: Today's meals, weekly summary
- Workouts: Active session, current program
- Messages: Unread count, active conversation

### **Server State (React Query recommended)**
- API data caching
- Optimistic updates for tracking actions
- Background refetch

---

## Data Fetching Patterns

### **Initial Load**
- Skeleton screens during fetch
- Parallel requests where possible

### **Infinite Scroll**
- Used in: Message history, activity feeds, workout history

### **Real-time Updates (WebSocket/SSE)**
- Messages (new message notification)
- Appointments (booking confirmations)
- AI coach responses (streaming)

---

## Security & Permission Patterns

### **Route Guards**
- Public routes: No auth required
- Client routes: Require auth + client role
- Professional routes: Require auth + professional role (trainer OR nutritionist)
- Admin routes: Require auth + admin role

### **Feature Flags**
- Professional features (only visible to verified professionals)
- Beta features (AI suggestions, photo scanning)

### **Data Privacy**
- Mask sensitive info (email, phone) in admin views
- Professional notes are private (not visible to clients)
- Medical info requires password confirmation to edit

---

## Error Handling Architecture

### **HTTP Error Codes**
- 401: Redirect to login, clear session
- 403: Show "Access Denied" page
- 404: Show "Page Not Found" with back home button
- 500: Show "Something Went Wrong" error page with retry

### **Form Errors**
- Inline field errors (below input)
- Summary error banner (top of form)

### **Network Errors**
- Toast notification: "Connection lost. Check your internet."
- Retry button

---

## Performance Patterns

### **Code Splitting**
- Route-based splitting (lazy load each page)
- Component-based splitting (modals, drawers loaded on demand)

### **Image Optimization**
- Lazy loading (images below fold)
- Responsive images (srcset for avatars, cards)
- Placeholder blur effect during load

### **API Optimization**
- Debounced search inputs (300ms)
- Pagination for large lists
- Cached responses (React Query)

---

## Onboarding Flow (Not in initial sitemap, future consideration)

1. **Welcome Screen** (role selection: client, trainer, nutritionist)
2. **Profile Setup** (basic info)
3. **Health Profile** (goals, restrictions, allergies) – Client only
4. **AI Plan Generation** (show loading, then results) – Client only
5. **Dashboard Tour** (highlight key features)

---

**Last Updated:** March 2026  
**Sitemap Version:** 1.0.0
