# Clean Web Architecture (CWA) Testing Strategy

**Version:** 1.0  
**Purpose:** Testing guidelines aligned with Clean Web Architecture principles  
**Applies To:** All testing activities in the luton-eng-dashboard project

---

## Table of Contents

1. [Overview](#1-overview)
2. [CWA Testing Principles](#2-cwa-testing-principles)
3. [Layer-Specific Testing Strategy](#3-layer-specific-testing-strategy)
4. [Configuration-Driven Testing](#4-configuration-driven-testing)
5. [Provider Seam Testing](#5-provider-seam-testing)
6. [Generic Component Testing](#6-generic-component-testing)
7. [Performance Testing](#7-performance-testing)
8. [Test Organization](#8-test-organization)
9. [Testing Tools & Commands](#9-testing-tools--commands)
10. [Definition of Done](#10-definition-of-done)

---

## 1. Overview

This document defines the testing strategy for the luton-eng-dashboard project, aligned with Clean Web Architecture (CWA) principles. Our testing approach ensures that each architectural layer is properly tested while maintaining the project's core principles of **generic-first design**, **performance-first architecture**, and **zero-regression**.

### Core CWA Testing Principles

- ✅ **Layer Isolation** - Test each CWA layer independently
- ✅ **Configuration-Driven** - Test generic components with various configurations
- ✅ **Provider Seam** - Test data layer abstractions and transitions
- ✅ **Generic Reusability** - Test component reusability across contexts
- ✅ **Performance-First** - Validate performance characteristics
- ✅ **Zero Regression** - Every change must prove it didn't break anything

---

## 2. CWA Testing Principles

### 2.1 Layer Isolation Testing

Each CWA layer must be tested independently with proper dependency mocking:

```typescript
// Domain Layer - Test business logic in isolation
describe('Domain Layer - Stock Adjustment Business Logic', () => {
  it('should validate stock adjustment rules', () => {
    // Test domain logic without external dependencies
  });
});

// Application Layer - Test use cases with mocked domain
describe('Application Layer - Stock Adjustment Use Cases', () => {
  it('should create stock adjustment', () => {
    // Test use case with mocked domain layer
  });
});

// Infrastructure Layer - Test external service integrations
describe('Infrastructure Layer - Supabase Integration', () => {
  it('should save stock adjustment to database', () => {
    // Test infrastructure with mocked external services
  });
});

// Presentation Layer - Test UI components
describe('Presentation Layer - Stock Adjustment Form', () => {
  it('should render form with correct fields', () => {
    // Test UI components with mocked application layer
  });
});
```

### 2.2 Configuration-Driven Testing

Test generic components with various configurations to ensure reusability:

```typescript
// Test generic form component with different configurations
describe('Generic Form Component - Configuration Testing', () => {
  const testConfigurations = [
    { type: 'stock-adjustments', fields: 4, sections: 1 },
    { type: 'tally-cards', fields: 6, sections: 2 },
    { type: 'inventory', fields: 8, sections: 3 }
  ];

  testConfigurations.forEach(config => {
    it(`should render ${config.type} form correctly`, () => {
      // Test with specific configuration
    });
  });
});
```

### 2.3 Provider Seam Testing

Test data layer abstractions and provider transitions:

```typescript
// Test provider seam transitions
describe('Provider Seam Testing', () => {
  it('should work with mock provider', () => {
    // Test with mock data provider
  });

  it('should work with Supabase provider', () => {
    // Test with real Supabase provider
  });

  it('should maintain same interface across providers', () => {
    // Test that interface contracts are maintained
  });
});
```

---

## 3. Layer-Specific Testing Strategy

### 3.1 Domain Layer Testing

**Purpose:** Test business logic and domain models in isolation

**Test Types:**
- Unit tests for domain entities
- Unit tests for business rules
- Unit tests for domain services

**Example:**
```typescript
// tests/domain/stock-adjustments/
describe('Stock Adjustment Domain', () => {
  describe('StockAdjustment Entity', () => {
    it('should validate quantity is numeric', () => {
      // Test domain validation rules
    });

    it('should calculate adjustment impact', () => {
      // Test business logic calculations
    });
  });

  describe('Stock Adjustment Rules', () => {
    it('should enforce warehouse permissions', () => {
      // Test business rules
    });
  });
});
```

### 3.2 Application Layer Testing

**Purpose:** Test use cases and application services

**Test Types:**
- Integration tests for use cases
- Unit tests for application services
- Integration tests for service orchestration

**Example:**
```typescript
// tests/application/stock-adjustments/
describe('Stock Adjustment Use Cases', () => {
  describe('Create Stock Adjustment', () => {
    it('should create adjustment with valid data', () => {
      // Test use case with mocked domain
    });

    it('should handle validation errors', () => {
      // Test error handling
    });
  });
});
```

### 3.3 Infrastructure Layer Testing

**Purpose:** Test external service integrations and data access

**Test Types:**
- Integration tests with external services
- Unit tests for data access objects
- Contract tests for external APIs

**Example:**
```typescript
// tests/infrastructure/supabase/
describe('Supabase Integration', () => {
  describe('Stock Adjustments Repository', () => {
    it('should save stock adjustment', () => {
      // Test database operations
    });

    it('should handle database errors', () => {
      // Test error handling
    });
  });
});
```

### 3.4 Presentation Layer Testing

**Purpose:** Test UI components and user interactions

**Test Types:**
- Unit tests for React components
- Integration tests for component composition
- E2E tests for user workflows

**Example:**
```typescript
// tests/presentation/forms/
describe('Stock Adjustment Form', () => {
  describe('Form Rendering', () => {
    it('should render all required fields', () => {
      // Test component rendering
    });

    it('should handle form validation', () => {
      // Test form validation
    });
  });

  describe('User Interactions', () => {
    it('should submit form successfully', () => {
      // Test user interactions
    });
  });
});
```

---

## 4. Configuration-Driven Testing

### 4.1 Generic Component Testing

Test generic components with various configurations to ensure reusability:

```typescript
// Test generic data table with different resource configurations
describe('Generic Data Table - Configuration Testing', () => {
  const resourceConfigs = [
    'stock-adjustments',
    'tally-cards', 
    'inventory',
    'warehouses'
  ];

  resourceConfigs.forEach(resource => {
    describe(`${resource} configuration`, () => {
      it('should render table with correct columns', () => {
        // Test with specific resource configuration
      });

      it('should handle pagination correctly', () => {
        // Test pagination with resource config
      });

      it('should support filtering and sorting', () => {
        // Test table features with resource config
      });
    });
  });
});
```

### 4.2 Configuration Validation Testing

Test that configurations are valid and complete:

```typescript
// Test configuration schema validation
describe('Configuration Validation', () => {
  describe('Resource Configurations', () => {
    it('should validate all resource configs', () => {
      // Test that all resource configs are valid
    });

    it('should detect missing required fields', () => {
      // Test configuration validation
    });
  });

  describe('Form Configurations', () => {
    it('should validate form field definitions', () => {
      // Test form configuration validation
    });
  });
});
```

---

## 5. Provider Seam Testing

### 5.1 Provider Contract Testing

Test that all providers implement the same interface:

```typescript
// Test provider interface contracts
describe('Provider Seam Testing', () => {
  const providers = ['mock', 'supabase', 'ims'];
  
  providers.forEach(provider => {
    describe(`${provider} provider`, () => {
      it('should implement DataProvider interface', () => {
        // Test interface compliance
      });

      it('should handle CRUD operations', () => {
        // Test CRUD operations
      });

      it('should handle error cases', () => {
        // Test error handling
      });
    });
  });
});
```

### 5.2 Provider Transition Testing

Test transitions between different providers:

```typescript
// Test provider transitions
describe('Provider Transitions', () => {
  it('should switch from mock to Supabase', () => {
    // Test provider switching
  });

  it('should maintain data consistency', () => {
    // Test data consistency across providers
  });
});
```

---

## 6. Generic Component Testing

### 6.1 Reusability Testing

Test that generic components work across different contexts:

```typescript
// Test generic form component reusability
describe('Generic Form Component Reusability', () => {
  const formTypes = [
    'stock-adjustments',
    'tally-cards',
    'inventory-items',
    'warehouse-config'
  ];

  formTypes.forEach(formType => {
    it(`should render ${formType} form correctly`, () => {
      // Test form rendering with different configurations
    });
  });
});
```

### 6.2 Composition Testing

Test component composition and assembly:

```typescript
// Test component composition
describe('Component Composition', () => {
  it('should compose form with toolbar', () => {
    // Test component composition
  });

  it('should compose table with pagination', () => {
    // Test table composition
  });
});
```

---

## 7. Performance Testing

### 7.1 Generic Component Performance

Test performance characteristics of generic components:

```typescript
// Test generic component performance
describe('Generic Component Performance', () => {
  it('should render 100 rows in <100ms', () => {
    // Test table rendering performance
  });

  it('should handle 1000+ records efficiently', () => {
    // Test large dataset performance
  });

  it('should maintain performance with complex configurations', () => {
    // Test performance with complex configs
  });
});
```

### 7.2 Configuration Impact Testing

Test how different configurations impact performance:

```typescript
// Test configuration impact on performance
describe('Configuration Performance Impact', () => {
  it('should maintain performance with many columns', () => {
    // Test performance with many columns
  });

  it('should maintain performance with complex validation', () => {
    // Test performance with complex validation
  });
});
```

---

## 8. Test Organization

### 8.1 CWA-Aligned Test Structure

```
tests/
├── domain/                    # Domain layer tests
│   ├── entities/             # Domain entity tests
│   ├── services/             # Domain service tests
│   └── rules/                # Business rule tests
├── application/              # Application layer tests
│   ├── use-cases/           # Use case tests
│   ├── services/            # Application service tests
│   └── orchestrators/       # Service orchestration tests
├── infrastructure/           # Infrastructure layer tests
│   ├── repositories/        # Data access tests
│   ├── external-services/   # External service tests
│   └── providers/           # Provider implementation tests
├── presentation/             # Presentation layer tests
│   ├── components/          # React component tests
│   ├── pages/               # Page component tests
│   └── hooks/               # Custom hook tests
├── configuration/            # Configuration-driven tests
│   ├── resource-configs/    # Resource configuration tests
│   ├── form-configs/        # Form configuration tests
│   └── validation/          # Configuration validation tests
├── providers/                # Provider seam tests
│   ├── contracts/           # Provider contract tests
│   ├── transitions/         # Provider transition tests
│   └── integration/         # Provider integration tests
└── e2e/                     # End-to-end workflow tests
    ├── user-workflows/      # User workflow tests
    ├── critical-paths/      # Critical path tests
    └── smoke/               # Smoke tests
```

### 8.2 Test Naming Conventions

```typescript
// Layer-specific naming
describe('Domain Layer - Stock Adjustment Entity', () => {});
describe('Application Layer - Create Stock Adjustment Use Case', () => {});
describe('Infrastructure Layer - Supabase Repository', () => {});
describe('Presentation Layer - Stock Adjustment Form', () => {});

// Configuration-specific naming
describe('Generic Data Table - Stock Adjustments Configuration', () => {});
describe('Provider Seam - Mock to Supabase Transition', () => {});
```

---

## 9. Testing Tools & Commands

### 9.1 Layer-Specific Test Commands

```bash
# Run tests by CWA layer
npm run test:domain          # Domain layer tests
npm run test:application     # Application layer tests
npm run test:infrastructure  # Infrastructure layer tests
npm run test:presentation    # Presentation layer tests

# Run configuration-driven tests
npm run test:configuration   # Configuration tests
npm run test:providers       # Provider seam tests

# Run all CWA-aligned tests
npm run test:cwa            # All CWA tests
```

### 9.2 Test Configuration

```typescript
// vitest.config.ts - CWA layer configuration
export default defineConfig({
  test: {
    // Layer-specific test patterns
    include: [
      'tests/domain/**/*.spec.ts',
      'tests/application/**/*.spec.ts', 
      'tests/infrastructure/**/*.spec.ts',
      'tests/presentation/**/*.spec.ts',
      'tests/configuration/**/*.spec.ts',
      'tests/providers/**/*.spec.ts'
    ],
    // CWA-specific test setup
    setupFiles: ['./tests/setup/cwa-setup.ts']
  }
});
```

---

## 10. Definition of Done

A test implementation is **not done** unless **all** are true:

### 10.1 CWA Compliance
- ✅ **Layer Isolation** - Tests are properly isolated by CWA layer
- ✅ **Configuration-Driven** - Generic components tested with multiple configurations
- ✅ **Provider Seam** - Data layer abstractions properly tested
- ✅ **Generic Reusability** - Components tested across different contexts

### 10.2 Test Quality
- ✅ **Coverage** - All CWA layers have appropriate test coverage
- ✅ **Performance** - Performance characteristics are validated
- ✅ **Documentation** - Tests serve as living documentation
- ✅ **Maintainability** - Tests are easy to understand and maintain

### 10.3 Integration
- ✅ **CI/CD** - Tests run in CI pipeline
- ✅ **Zero Regression** - All tests pass before merge
- ✅ **Documentation** - Test documentation is updated

---

## Appendix: CWA Testing Checklist

### When Creating New Tests

- [ ] Identify the CWA layer being tested
- [ ] Ensure proper dependency mocking
- [ ] Test with multiple configurations (if generic component)
- [ ] Validate performance characteristics
- [ ] Document test purpose and scope
- [ ] Ensure test follows naming conventions

### When Modifying Existing Tests

- [ ] Maintain CWA layer isolation
- [ ] Update configuration tests if component changed
- [ ] Validate performance impact
- [ ] Update documentation
- [ ] Ensure zero regression

### When Adding New Generic Components

- [ ] Create configuration-driven tests
- [ ] Test across multiple contexts
- [ ] Validate performance characteristics
- [ ] Test provider seam integration
- [ ] Document configuration options

---

**Last Updated:** 2025-01-27  
**Status:** ✅ CWA Testing Strategy v1.0
