# Jonathan Burnhams - Personal Homepage

A modern, stylish personal homepage built with React, TypeScript, and Vite, deployed on Cloudflare Pages.

## Features

- Modern, animated hero section with gradient effects
- Fully responsive design
- Accessibility-focused (respects `prefers-reduced-motion`)
- TypeScript for type safety
- Comprehensive test coverage with Vitest
- ESLint for code quality
- Optimized build with Vite

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript
- **Testing**: Vitest + React Testing Library
- **Styling**: CSS3 with modern features
- **Deployment**: Cloudflare Pages
- **Linting**: ESLint with TypeScript support

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/jonathanburnhams.com.git
cd jonathanburnhams.com
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Building

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Linting

Run ESLint:
```bash
npm run lint
```

Type checking:
```bash
npm run type-check
```

## Project Structure

```
jonathanburnhams.com/
├── public/              # Static assets
│   └── vite.svg        # Favicon
├── src/
│   ├── components/     # React components
│   │   └── Hero/       # Hero section component
│   │       ├── Hero.tsx
│   │       ├── Hero.css
│   │       └── Hero.test.tsx
│   ├── test/           # Test utilities
│   │   └── setup.ts    # Test setup file
│   ├── App.tsx         # Main App component
│   ├── App.css         # App styles
│   ├── App.test.tsx    # App tests
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles
├── index.html          # HTML entry point
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
├── wrangler.toml       # Cloudflare Pages configuration
└── README.md           # This file
```

## Deployment

### Cloudflare Pages

This project is configured for deployment on Cloudflare Pages.

1. Connect your GitHub repository to Cloudflare Pages
2. Configure the build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 18

The `wrangler.toml` file contains the configuration for Cloudflare Pages.

### Manual Deployment

You can also deploy manually using Wrangler:

```bash
npx wrangler pages deploy dist
```

## Testing Strategy

The project follows testing best practices:

- **Unit Tests**: All components have corresponding test files
- **Integration Tests**: App-level tests ensure components work together
- **Accessibility Tests**: Tests verify proper semantic HTML and ARIA attributes
- **Coverage**: Aim for >80% code coverage

## Accessibility

This site is built with accessibility in mind:

- Semantic HTML5 elements
- Proper ARIA attributes
- Respects `prefers-reduced-motion` for users who prefer reduced animations
- Proper color contrast ratios
- Keyboard navigation support

## Performance

- Optimized bundle size with Vite
- CSS animations using GPU-accelerated properties
- Responsive images and assets
- Modern ESNext syntax with automatic polyfills

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is personal and not open for commercial use.

## Contact

Jonathan Burnhams - [Your Email/Social Links]

---

Built with React + Vite + TypeScript
