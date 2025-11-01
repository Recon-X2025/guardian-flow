# Guardian Flow Authentication UI Specifications
## Visual Design & Wireframes

---

## Design System

### Color Palettes by Module

**Platform (Unified)**
- Primary: Blue-Indigo gradient (#3B82F6 → #6366F1)
- Background: White/Dark mode adaptive
- Accent: Indigo (#6366F1)

**Field Service Management**
- Primary: Blue-Cyan gradient (#3B82F6 → #06B6D4)
- Icon: Factory/Wrench
- Accent: Bright Blue

**Asset Lifecycle**
- Primary: Green-Emerald gradient (#22C55E → #10B981)
- Icon: Package/Cube
- Accent: Forest Green

**AI Forecasting**
- Primary: Purple-Fuchsia gradient (#A855F7 → #D946EF)
- Icon: Brain/Sparkles
- Accent: Deep Purple

**Fraud Detection**
- Primary: Red-Orange gradient (#EF4444 → #F97316)
- Icon: Shield-Alert/FileSearch
- Accent: Crimson Red

**Marketplace**
- Primary: Pink-Purple gradient (#EC4899 → #A855F7)
- Icon: Shopping Bag
- Accent: Hot Pink

**Analytics**
- Primary: Cyan-Blue gradient (#06B6D4 → #3B82F6)
- Icon: BarChart/TrendingUp
- Accent: Sky Blue

**Customer Portal**
- Primary: Teal-Green gradient (#14B8A6 → #22C55E)
- Icon: Users/Smile
- Accent: Turquoise

**Training**
- Primary: Orange-Yellow gradient (#F97316 → #EAB308)
- Icon: Video/GraduationCap
- Accent: Amber

---

## Layout Structure

### Desktop (1024px+)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │                  │  │                                 │ │
│  │   HERO SECTION   │  │        AUTH CARD                │ │
│  │                  │  │                                 │ │
│  │  [ICON + NAME]   │  │   ┌──────────────────────────┐ │ │
│  │                  │  │   │  Sign In / Create Account│ │ │
│  │  Tagline Badge   │  │   └──────────────────────────┘ │ │
│  │                  │  │                                 │ │
│  │  Description     │  │   Email Field                   │ │
│  │  Text (2-3 lines)│  │   [icon] ___________________    │ │
│  │                  │  │                                 │ │
│  │  Feature Icons:  │  │   Password Field                │ │
│  │  ✓ SSO           │  │   [icon] _______________ [eye] │ │
│  │  ✓ MFA           │  │   ⚠ Caps Lock is on            │ │
│  │  ✓ Passwordless  │  │                                 │ │
│  │                  │  │   [Forgot password?]            │ │
│  │                  │  │                                 │ │
│  │  Support:        │  │   ┌──────────────────────────┐ │ │
│  │  📧 Email        │  │   │      Sign In Button       │ │ │
│  │  📞 Phone        │  │   └──────────────────────────┘ │ │
│  │  ❓ Help Docs    │  │                                 │ │
│  │                  │  │   ─── Or continue with ───      │ │
│  │                  │  │                                 │ │
│  └──────────────────┘  │   [  Sign in with Google   ]    │ │
│                        └─────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)

```
┌────────────────────────────────────────────────┐
│                                                │
│          ┌──────────────────────────┐          │
│          │    HERO (Compressed)     │          │
│          │  [Icon] Module Name      │          │
│          │  Tagline Badge           │          │
│          └──────────────────────────┘          │
│                                                │
│          ┌──────────────────────────┐          │
│          │      AUTH CARD           │          │
│          │                          │          │
│          │  Sign In Form            │          │
│          │  (Same as desktop)       │          │
│          │                          │          │
│          └──────────────────────────┘          │
│                                                │
└────────────────────────────────────────────────┘
```

### Mobile (< 768px)

```
┌──────────────────────┐
│                      │
│  [Icon] Module Name  │
│  Tagline             │
│                      │
│  ┌────────────────┐  │
│  │  Sign In Form  │  │
│  │                │  │
│  │  Email:        │  │
│  │  ____________  │  │
│  │                │  │
│  │  Password:     │  │
│  │  ____________  │  │
│  │                │  │
│  │  [Sign In]     │  │
│  │                │  │
│  │  ─── SSO ───   │  │
│  │  [Google]      │  │
│  │                │  │
│  └────────────────┘  │
│                      │
│  Support Links       │
│                      │
└──────────────────────┘
```

---

## Component Specifications

### Hero Section

**Container**
- Width: 50% desktop, 100% mobile
- Padding: 32px desktop, 16px mobile
- Background: Gradient (module-specific)
- Text Color: White with 90% opacity

**Module Icon**
- Size: 64x64px
- Background: White/10% with backdrop blur
- Border Radius: 16px
- Icon Size: 40x40px
- Color: White

**Module Name**
- Font: Bold, 36px desktop, 28px mobile
- Line Height: 1.2
- Margin Bottom: 8px

**Tagline Badge**
- Background: White/20%
- Border: White/30%
- Padding: 4px 12px
- Font: 14px uppercase
- Border Radius: 999px

**Description**
- Font: 20px desktop, 16px mobile
- Line Height: 1.6
- Opacity: 90%
- Max Width: 600px

**Feature Grid**
- Display: Grid 2 columns
- Gap: 16px
- Icon Size: 20px
- Font: 14px

---

### Auth Card

**Container**
- Max Width: 448px
- Background: White (light) / Dark (dark mode)
- Border Radius: 12px
- Shadow: 2xl (large elevation)
- Padding: 32px

**Header**
- Title: 24px bold
- Description: 14px muted
- Margin Bottom: 24px

**Form Fields**

**Input Container**
- Margin Bottom: 16px
- Label: 14px medium weight

**Input Field**
- Height: 44px (mobile-friendly tap target)
- Padding: 12px 16px
- Border: 1px solid border color
- Border Radius: 6px
- Font: 16px (prevents zoom on iOS)
- Icon Left: 20px size, muted color
- Icon Right: 20px size, interactive

**Password Field**
- Show/Hide toggle: Eye icon, 20px
- Caps Lock warning: Yellow text, 12px
- Icon: AlertCircle 12px

**Password Requirements (Sign Up)**
- Background: Muted background
- Padding: 12px
- Border Radius: 8px
- Font: 14px
- Check Icons: 16px green (met) / gray (unmet)

**Buttons**

**Primary Button**
- Width: 100%
- Height: 44px
- Background: Primary color
- Text: White, 16px medium
- Border Radius: 6px
- Hover: Slightly darker
- Disabled: Opacity 50%, no hover

**Link Button**
- Font: 14px
- Color: Primary
- Underline: On hover
- Padding: 0

**Social Login Button**
- Width: 100%
- Height: 44px
- Background: White
- Border: 1px solid border
- Icon: 20px left aligned
- Text: 16px centered
- Border Radius: 6px

---

## Interaction States

### Input Fields

**Default**
- Border: 1px solid border-color
- Background: White/Dark
- Text: Foreground color

**Focus**
- Border: 2px solid primary
- Outline: None (use border instead)
- Shadow: 0 0 0 3px primary/20%

**Error**
- Border: 2px solid destructive
- Text: Destructive color
- Helper Text: Destructive, 12px

**Success**
- Border: 2px solid success
- Icon: CheckCircle green

**Disabled**
- Opacity: 50%
- Cursor: not-allowed
- Background: Muted

### Buttons

**Default (Primary)**
- Background: Primary color
- Text: White
- Shadow: sm

**Hover**
- Background: Primary darker (10%)
- Shadow: md
- Transition: 150ms

**Active**
- Background: Primary darker (20%)
- Shadow: none
- Transform: scale(0.98)

**Loading**
- Opacity: 70%
- Cursor: not-allowed
- Spinner: Rotating animation

**Disabled**
- Opacity: 50%
- Cursor: not-allowed
- No hover effects

---

## Animations

### Page Load
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply to auth card */
.auth-card {
  animation: fadeInUp 0.4s ease-out;
}
```

### Tab Switch
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.tab-content {
  animation: fadeIn 0.2s ease-in;
}
```

### Button Loading
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}
```

---

## Responsive Breakpoints

```css
/* Mobile First */
.auth-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .auth-container {
    padding: 32px;
  }
  
  .hero-description {
    font-size: 18px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .auth-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    padding: 48px;
  }
  
  .hero-description {
    font-size: 20px;
  }
}

/* Large Desktop */
@media (min-width: 1440px) {
  .auth-container {
    max-width: 1400px;
    margin: 0 auto;
  }
}
```

---

## Accessibility Annotations

### ARIA Labels
```html
<input
  type="password"
  aria-label="Password"
  aria-describedby="password-requirements"
  aria-invalid={hasError}
/>

<div id="password-requirements" role="status">
  Password must be at least 8 characters
</div>

<button
  type="button"
  aria-label="Show password"
  aria-pressed={showPassword}
>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

### Keyboard Navigation
- Tab order: Email → Password → Forgot Link → Sign In Button → SSO Button
- Enter: Submit form from any input field
- Escape: Clear focused input (optional)
- Space: Toggle show/hide password when focused on icon

### Focus Indicators
```css
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

input:focus-visible {
  outline: none; /* Use border instead */
  border: 2px solid var(--primary);
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
}
```

---

## Testing Checklist

### Visual Regression
- [ ] Screenshot all 9 module auth pages
- [ ] Test light and dark modes
- [ ] Verify gradients render correctly
- [ ] Check icon alignment and sizing
- [ ] Validate responsive layouts at all breakpoints

### Functional
- [ ] Form submission works
- [ ] Password validation real-time
- [ ] Caps Lock detection accurate
- [ ] Show/hide password toggle
- [ ] Tab navigation logical
- [ ] Error states display correctly
- [ ] Loading states show spinner
- [ ] Success redirects to correct page

### Accessibility
- [ ] Screen reader announces all elements
- [ ] Keyboard navigation complete
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Text resizable to 200%
- [ ] No keyboard traps

### Performance
- [ ] Page load < 2 seconds
- [ ] Form submission < 1 second
- [ ] No layout shift (CLS < 0.1)
- [ ] Images optimized and lazy loaded
- [ ] Gradients don't cause performance issues

---

## Browser Support

### Minimum Requirements
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari iOS 14+
- Chrome Android 90+

### Graceful Degradation
- CSS Grid → Flexbox fallback
- Backdrop blur → Solid background
- Custom fonts → System font stack
- Smooth animations → Instant transitions (prefers-reduced-motion)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-01  
**Designer:** Guardian Flow UX Team
