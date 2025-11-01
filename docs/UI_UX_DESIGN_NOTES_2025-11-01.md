# Guardian Flow - UI/UX Design Notes

**Version:** 6.1.0  
**Date:** November 1, 2025  
**Document Type:** UI/UX Design Specifications  
**Status:** Production Ready

---

## Design Philosophy

### Core Principles

**1. Clarity Over Cleverness**
- Information hierarchy guides user attention
- Clear CTAs (Call-to-Actions) with descriptive labels
- Consistent terminology across the platform
- Progressive disclosure: show what's needed, hide complexity

**2. Efficiency for Power Users**
- Keyboard shortcuts for frequent actions
- Bulk operations support
- Quick filters and saved views
- Command palette (Ctrl+K)

**3. Mobile-First for Field Workers**
- Touch-optimized controls (48px minimum tap target)
- Offline-first architecture
- Photo capture optimized for one-handed use
- Location-aware features

**4. Accessibility (WCAG 2.1 AA)**
- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- Color contrast ratio ≥ 4.5:1
- Focus indicators visible at all times

---

## Design System

### Color Palette

**Brand Colors:**
```css
--primary: 217 91% 60% (hsl) /* Guardian Blue */
--primary-foreground: 0 0% 100%

--secondary: 214 32% 91%
--secondary-foreground: 222 47% 11%

--accent: 43 96% 56% /* Attention Yellow */
--accent-foreground: 0 0% 0%
```

**Semantic Colors:**
```css
--success: 142 76% 36% /* Green */
--warning: 38 92% 50% /* Orange */
--destructive: 0 84% 60% /* Red */
--info: 199 89% 48% /* Blue */
```

**Neutral Scale:**
```css
--background: 0 0% 100%
--foreground: 222 47% 11%
--muted: 210 40% 96%
--muted-foreground: 215 16% 47%
--border: 214 32% 91%
```

### Typography

**Font Stack:**
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

**Type Scale:**
- **Heading 1:** 2.25rem (36px), font-weight: 700
- **Heading 2:** 1.875rem (30px), font-weight: 600
- **Heading 3:** 1.5rem (24px), font-weight: 600
- **Heading 4:** 1.25rem (20px), font-weight: 600
- **Body Large:** 1.125rem (18px), font-weight: 400
- **Body:** 1rem (16px), font-weight: 400
- **Body Small:** 0.875rem (14px), font-weight: 400
- **Caption:** 0.75rem (12px), font-weight: 400

### Spacing System

**8-point grid system:**
- 0.5rem (8px)
- 1rem (16px)
- 1.5rem (24px)
- 2rem (32px)
- 3rem (48px)
- 4rem (64px)

### Components

**Buttons:**
- Primary: Filled with primary color
- Secondary: Outlined with border
- Ghost: Transparent with hover state
- Link: Text-only with underline on hover

**States:**
- Default
- Hover (brightness +10%)
- Active (brightness -10%)
- Disabled (opacity 50%, cursor not-allowed)
- Loading (spinner icon, disabled)

**Cards:**
- White background with subtle shadow
- 8px border radius
- 1px border (muted)
- 16px padding
- Hover: elevation increase (shadow intensifies)

**Form Inputs:**
- 40px height (desktop), 48px (mobile)
- 8px border radius
- Clear label above input
- Placeholder text (muted color)
- Error state: red border + error message below
- Success state: green border + checkmark icon

**Tables:**
- Zebra striping for readability
- Sticky header on scroll
- Sortable columns (click header)
- Row hover state
- Responsive: collapse to cards on mobile

---

## Key User Flows

### 1. Work Order Creation Flow

**User:** Operations Manager

**Steps:**
1. **Entry Point:** Dashboard → "+ New Work Order" button (top-right, primary CTA)
2. **Dialog Opens:** Modal overlay with form (600px width)
3. **Form Sections:**
   - Customer Selection (searchable dropdown)
   - Equipment Selection (filtered by customer)
   - Service Type (radio buttons with icons)
   - Priority (color-coded badges)
   - Scheduled Date/Time (date picker)
   - Description (textarea, 500 char max)
4. **Validation:** Real-time validation with inline error messages
5. **Assignment Preview:** Shows suggested technician with avatar
6. **Submit:** "Create Work Order" button (bottom-right)
7. **Confirmation:** Toast notification "Work order WO-2025-1234 created successfully"
8. **Navigation:** Auto-redirect to work order detail page

**UX Enhancements:**
- Autosave to drafts every 30 seconds
- Recently used customers appear first in dropdown
- Equipment list shows last service date
- Priority defaults to "medium" but highlights if customer has active high-priority orders

---

### 2. Technician Mobile Work Order Completion

**User:** Technician

**Steps:**
1. **Entry Point:** Mobile app home → Work order card (tap to open)
2. **Work Order Detail:**
   - Customer info (name, phone with tap-to-call)
   - Address with "Navigate" button (launches Google Maps)
   - Service instructions (expandable section)
   - Equipment details with photos
3. **Start Work:** Swipe "Start Work" button (geolocation captured)
4. **Photo Capture:**
   - Camera icon button (bottom nav)
   - Native camera opens
   - Auto-geotag and timestamp
   - Preview before upload
   - Can add caption
5. **Parts Used:** (optional)
   - Scan barcode or manual entry
   - Quantity selector
   - Inventory updated in real-time
6. **Complete Work:**
   - Swipe "Complete" button
   - Completion notes (optional, textarea)
   - Customer signature (optional, canvas)
   - Submit triggers forgery detection
7. **Confirmation:** Full-screen checkmark animation + "Work order completed"

**UX Enhancements:**
- Offline mode: all actions queued and synced when online
- Large touch targets (minimum 48px)
- Haptic feedback on swipe actions
- Voice-to-text for completion notes
- Photo count indicator (e.g., "3 photos attached")

---

### 3. Compliance Evidence Collection

**User:** Compliance Officer

**Steps:**
1. **Entry Point:** Compliance Dashboard → "Collect Evidence" button
2. **Framework Selection:** Radio buttons (SOC 2 Type II / ISO 27001:2022)
3. **Control Selection:** (optional) Multi-select checkboxes for specific controls
4. **Initiate Collection:** "Collect Evidence" button
5. **Progress Indicator:** Modal with animated progress bar
   - "Collecting access control evidence..."
   - "Collecting MFA evidence..."
   - etc.
6. **Results Summary:**
   - Card layout with evidence count per control
   - Compliance score (circular progress indicator)
   - Status badges (valid, pending review, expired)
7. **Export Options:**
   - Download as JSON
   - Download as PDF (encrypted)
   - Email to auditor
8. **Confirmation:** "Evidence package generated successfully"

**UX Enhancements:**
- Estimated time to complete (based on data volume)
- Can cancel collection mid-process
- Evidence preview before export
- Recent collections accessible via history tab

---

### 4. Fraud Investigation Workflow

**User:** Fraud Investigator

**Steps:**
1. **Entry Point:** Fraud Dashboard → "Flagged Documents" tab (red badge count)
2. **Document List:** Table with columns:
   - Thumbnail preview
   - Work order number (clickable)
   - Forgery score (color-coded)
   - Upload date
   - Technician name
3. **Detail View:** Click row → Side panel opens (400px width)
   - Full-size image viewer with zoom
   - Forgery analysis breakdown:
     - Metadata tampering: 85%
     - ELA inconsistencies: 72%
     - EXIF data: Present/Modified
   - Technician history (recent uploads, past flags)
   - Work order context
4. **Action Buttons:**
   - "Mark as Fraudulent" (red, destructive)
   - "False Positive" (gray, secondary)
   - "Request Review" (yellow, warning)
5. **Fraudulent Action:**
   - Confirmation modal
   - Justification textarea (required)
   - "Suspend Technician" checkbox
   - "Revoke Payment" checkbox
6. **Case Creation:** Auto-generates fraud case with evidence
7. **Confirmation:** Toast + email sent to operations manager

**UX Enhancements:**
- Side-by-side comparison with previous uploads
- Forgery heatmap overlay on image
- Keyboard shortcuts (F for fraudulent, V for valid)
- Batch actions for multiple documents

---

## Dashboard Layouts

### Operations Dashboard

**Layout:** Grid-based (3 columns on desktop, 1 column on mobile)

**Components:**
1. **KPI Cards (Row 1):**
   - Active Work Orders (large number + trend arrow)
   - SLA Compliance Rate (circular progress)
   - Technician Utilization (percentage + bar chart)
   - Avg Response Time (time + sparkline)

2. **Work Orders at Risk (Row 2):**
   - Table with 10 most urgent work orders
   - Columns: WO#, Customer, Technician, Time Remaining, Priority
   - Color-coded rows (red < 1hr, yellow < 2hr)

3. **Technician Map (Row 3, Left):**
   - Full-width map with technician locations
   - Clustered markers with count
   - Click marker → technician info popup

4. **Recent Activity (Row 3, Right):**
   - Timeline of recent actions
   - Icons for action type (created, completed, cancelled)
   - Real-time updates (WebSocket)

**Interactions:**
- Filters: Date range, priority, status (top bar)
- Refresh button (manual) + auto-refresh every 60s
- Export to Excel (top-right)

---

### Compliance Dashboard

**Layout:** Tab-based navigation

**Tabs:**
1. **Overview:**
   - Compliance score gauge (center, large)
   - Evidence count by framework (bar chart)
   - Recent audits timeline
   - Upcoming deadlines (list)

2. **Access Reviews:**
   - Active campaigns (card grid)
   - Pending reviews count
   - Auto-revoke countdown
   - Campaign history

3. **Vulnerabilities:**
   - Severity breakdown (donut chart)
   - SLA compliance rate (percentage)
   - Open vs. resolved (line chart)
   - Critical vulnerabilities table

4. **Audit Logs:**
   - Search bar with filters
   - Table with infinite scroll
   - Export options
   - Archive access

**Interactions:**
- Global search across all tabs
- Quick actions: "Collect Evidence", "Create Campaign", "Export Report"
- Notification bell (top-right) for compliance alerts

---

## Responsive Breakpoints

**Desktop:** ≥ 1024px
- 3-column layouts
- Sidebar visible
- Full-width tables
- Hover states active

**Tablet:** 768px - 1023px
- 2-column layouts
- Collapsible sidebar
- Horizontal scroll for tables
- Touch and hover states

**Mobile:** < 768px
- Single-column layouts
- Bottom navigation
- Cards replace tables
- Touch-optimized controls

---

## Animation & Motion

**Principles:**
- Purposeful: animations guide attention
- Subtle: 200-300ms duration
- Consistent: same easing function (ease-in-out)

**Use Cases:**
- Page transitions: Fade + slide (300ms)
- Modal entry: Scale from 0.95 to 1 (200ms)
- Dropdown: Slide down + fade (150ms)
- Loading states: Skeleton screens (pulse animation)
- Success actions: Checkmark animation (500ms)
- Error shake: Horizontal wiggle (300ms)

**Reduced Motion:**
- Respect `prefers-reduced-motion` media query
- Disable non-essential animations
- Replace with instant transitions

---

## Accessibility Checklist

✅ **Keyboard Navigation:**
- All interactive elements focusable
- Logical tab order
- Focus trap in modals
- Escape key closes dialogs

✅ **Screen Reader Support:**
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- ARIA labels for icons
- Live regions for dynamic content
- Alt text for images

✅ **Color Contrast:**
- Text on background: ≥ 4.5:1
- Large text (18px+): ≥ 3:1
- UI components: ≥ 3:1

✅ **Form Accessibility:**
- Labels associated with inputs
- Error messages announced
- Required fields marked
- Help text linked with `aria-describedby`

---

## Dark Mode Support 🔄 PLANNED

**Implementation Approach:**
- CSS custom properties for all colors
- Toggle in user settings (persisted to localStorage)
- System preference detection (`prefers-color-scheme`)
- Smooth transition between modes (200ms)

**Dark Mode Palette:**
```css
--background: 222 47% 11%
--foreground: 210 40% 98%
--muted: 217 33% 17%
--border: 217 33% 20%
```

**Status:** Planned for Q1 2026

---

## Performance Optimizations

**Image Optimization:**
- Lazy loading for off-screen images
- WebP format with JPEG fallback
- Responsive images (`srcset`)
- Progressive JPEG for photos

**Code Splitting:**
- Route-based splitting
- Dynamic imports for heavy components
- Vendor bundle optimization

**Caching Strategy:**
- Service worker for offline support
- Cache-first for static assets
- Network-first for API calls
- Background sync for failed requests

---

## Design Deliverables

**Figma Files:** (Internal link)
- Component library
- Page mockups (desktop + mobile)
- User flow diagrams
- Prototype (interactive)

**Design Tokens:** `/src/index.css`  
**Component Library:** Shadcn UI (customized)  
**Icon Library:** Lucide React

---

**Next Review:** Q4 2025 (Post-Marketplace Launch)
