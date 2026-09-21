# Ember Form Type Quality Design

## Goal

Strengthen the public TypeScript and Glint surface of `@tanstack/ember-form`
v2 while preserving its instance-returning `createForm(destroyable, options)`
runtime model.

## Public API

- Keep `createForm` aligned with peer adapters: infer form data, const form
  validators, submit return, and `ToFormErrorTypes`, while retaining `unknown`
  as the fourth `FormOptions` argument. Component registration is not wired at
  runtime in this phase.
- Export standalone `Field` and `ArrayField` values as typed construct-signature
  casts. Their public signatures infer the form data and error types from
  `@form`, then constrain `@name`, validators, block values, and array-only
  paths accordingly.
- Keep the runtime component classes private. Standalone components read their
  form from `@form`; form-bound and group-bound subclasses continue to override
  the form getter.
- Do not export standalone `FormGroup` or add a form-shaped overload to the
  generic standalone `Subscribe`.

## Type Tests

Glint tests will prove:

- incompatible field validators are rejected for the selected field value;
- `@defaultValue` is rejected because form-core v2 does not expose a per-field
  default-value option;
- form-bound and group-bound Subscribe block values match selector returns;
- standalone Subscribe infers its source and selected block value;
- a form returned by `createForm(this, options)` can be passed to a child typed
  with `EmberFormType<typeof options>`;
- standalone Field and ArrayField infer valid paths, values, validators, and
  array-only path constraints from `@form`.

Negative tests use `@glint-expect-error`; at least one directive will be removed
temporarily to prove the underlying diagnostic is real.

## Documentation

`AnyEmberFormApi` documentation will describe it as an erased form API for
shape-agnostic reusable components and direct users toward `EmberFormType` for
known forms. `EmberFormType` will receive matching derivation documentation.

The README will add a short child-component typing section using `formOptions`
and `EmberFormType`, discourage `EmberFormApi<T, any>`, and explain that bound
or standalone Subscribe establishes Ember reactivity whereas a plain
`form.state` read is imperative.

## Constraints

- No component-returning `createForm`, tracked-options overload, form-core
  change, consumer migration, or AppField/createFormHook claim.
- No attempt to remove peer-normal runtime casts.
- If Glint cannot infer standalone components without erasing form shape or
  exposing the untyped runtime class, omit those exports and retain the
  stronger tests and documentation.

## Verification

Run the Ember package type tests and ESLint. Spot-check an expected diagnostic
by removing one `@glint-expect-error`, observing failure, restoring it, and
rerunning the clean suite.
