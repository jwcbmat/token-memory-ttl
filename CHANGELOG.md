# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Token Memory TTL
- High-performance in-memory token store with TTL support
- Zero dependencies implementation
- Full TypeScript support with type definitions
- Automatic cleanup of expired tokens
- Safe handling of long TTL values (>24 days)
- Comprehensive API with metadata operations
- Memory usage statistics and monitoring
- Global singleton for convenience
- Extensive test coverage (95%+)
- Support for both ESM and CommonJS
- Debug logging capability
- Configurable store options (maxSize, defaultTtl, debug)

### Features
- `set(key, token, ttl)` - Store tokens with TTL
- `get(key)` - Retrieve tokens
- `delete(key)` - Remove tokens
- `has(key)` - Check token existence
- `getMetadata(key)` - Get token metadata
- `getTtl(key)` - Get remaining TTL
- `updateTtl(key, ttl)` - Update token TTL
- `keys()` - List all valid keys
- `clear()` - Remove all tokens
- `getStats()` - Get store statistics

## [1.0.0] - 2024-09-29

### Added
- Initial release