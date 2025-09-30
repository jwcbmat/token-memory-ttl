# Contributing to Token Memory TTL

Thank you for your interest in contributing to Token Memory TTL! We welcome contributions from the community.

## Development Process

We use GitHub to host code, track issues and feature requests, and accept pull requests.

## Pull Request Process

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/token-memory-ttl.git
cd token-memory-ttl

npm install

npm test

npm run dev

npm run build

npm run lint
```

## Testing

We use Vitest for testing. Please ensure:

- All new features have tests
- All tests pass before submitting PR
- Coverage remains above 95%

```bash
npm test

npm run test:coverage

npm run test:ui
```

## Code Style

We use ESLint and TypeScript for code quality:

```bash
npm run lint

npm run lint:fix

npm run type-check
```

## Commit Messages

Please use clear and meaningful commit messages:

- `feat: add new token metadata API`
- `fix: resolve memory leak in timer cleanup`
- `docs: update README with new examples`
- `test: add edge case tests for long TTL`

## Bug Reports

Please use the bug report template and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Code example
- Environment details

## Feature Requests

Please use the feature request template and include:

- Problem description
- Proposed solution
- Use case
- Alternatives considered

## License

By contributing, you agree that your contributions will be licensed under the MIT License.