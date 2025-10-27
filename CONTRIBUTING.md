# Contributing Guide

Thank you for your interest in contributing to this project!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `npm test`
6. Run linting: `npm run lint`
7. Build the project: `npm run build`
8. Commit your changes with a descriptive message
9. Push to your fork and submit a pull request

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Ensure proper type annotations
- Run `npm run type-check` before committing

### Testing

- Write tests for all new components and features
- Maintain or improve test coverage
- Tests should be descriptive and test one thing at a time
- Use React Testing Library best practices

### Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for components and functions
- Keep functions small and focused

### Components

- Create a folder for each component with:
  - `ComponentName.tsx` - Component code
  - `ComponentName.css` - Component styles
  - `ComponentName.test.tsx` - Component tests
- Use semantic HTML
- Ensure accessibility (ARIA attributes, keyboard navigation)

### CSS

- Use CSS custom properties for theming
- Mobile-first responsive design
- Consider `prefers-reduced-motion` for animations
- Use modern CSS features (Grid, Flexbox, etc.)

## Commit Messages

Follow the conventional commits format:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example: `feat: add contact section to homepage`

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Ensure all tests pass
3. Ensure the build succeeds
4. Request review from maintainers
5. Address any feedback
6. Once approved, your PR will be merged

## Questions?

Feel free to open an issue for any questions or concerns.
