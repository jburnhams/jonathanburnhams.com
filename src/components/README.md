# Components

This directory contains all React components for the personal homepage.

## Component Structure

Each component should have its own directory with:
- `ComponentName.tsx` - The component code
- `ComponentName.css` - Component-specific styles
- `ComponentName.test.tsx` - Component tests

## Current Components

### Hero

**Location**: `src/components/Hero/`

The Hero component displays the main introduction section with an animated name display.

**Features**:
- Animated gradient text effect
- Responsive typography
- Animated underline decoration
- Respects `prefers-reduced-motion`
- Semantic HTML with proper ARIA attributes

**Props**: None (currently stateless)

**Usage**:
```tsx
import Hero from './components/Hero/Hero'

function App() {
  return <Hero />
}
```

**Accessibility**:
- Uses `<section role="banner">` for semantic structure
- Decorative elements marked with `aria-hidden="true"`
- Animations disabled for users who prefer reduced motion

**Testing**:
- Renders without errors
- Displays correct name
- Proper HTML structure
- Accessibility attributes present

## Adding New Components

When adding a new component:

1. Create a new directory under `src/components/`
2. Create the three required files (tsx, css, test.tsx)
3. Add JSDoc comments to the component
4. Write comprehensive tests
5. Ensure accessibility
6. Update this README

## Best Practices

- Use TypeScript for all components
- Add proper type annotations
- Include JSDoc comments
- Write tests for all components
- Ensure accessibility
- Use semantic HTML
- Keep components focused and single-purpose
- Use CSS modules or component-scoped CSS
