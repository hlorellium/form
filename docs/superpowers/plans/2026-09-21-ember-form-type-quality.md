# Ember Form Type Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten and document `@tanstack/ember-form` v2 types, including Glint-safe standalone Field and ArrayField components.

**Architecture:** Preserve the bound component signatures already attached to each form and add separate standalone construct signatures that infer all form-dependent types through a required `form` argument. Runtime classes remain internal; only typed cast constants are exported. Glint compile tests define the accepted and rejected public behavior.

**Tech Stack:** TypeScript, Glint `.gts` templates, Ember/Glimmer components, TanStack Form v2, ESLint.

## Global Constraints

- Keep `createForm(destroyable, options)` instance-returning and retain `unknown` as the fourth `FormOptions` argument.
- Do not add standalone FormGroup, a form-shaped standalone Subscribe, tracked options, form-core changes, component registration, or consumer migrations.
- Reject `@defaultValue`; form-core v2 has no per-field default-value option.
- Keep runtime component classes private and export standalone values only through typed construct-signature casts.

---

### Task 1: Expand Glint Contracts

**Files:**
- Modify: `packages/ember-form/tests/types/templates.gts`

**Interfaces:**
- Consumes: existing `createForm`, `formOptions`, `EmberFormType`, bound `Field`, `FormGroup`, and `Subscribe`.
- Produces: compile-time contracts for validators, selectors, child forms, default-value rejection, and the planned standalone components.

- [ ] **Step 1: Add positive and negative type cases**

Add helpers that require exact primitive types, field validators whose `value`
parameter is either compatible or incompatible, selectors returning distinct
types, and imports of `Field`, `ArrayField`, and `Subscribe`. Exercise:

```gts
<this.args.form.Field
  @name="profile.age"
  @validators={{array this.validateAge}}
/>

{{! @glint-expect-error validator value must match profile.age }}
<this.args.form.Field
  @name="profile.age"
  @validators={{array this.validateName}}
/>

{{! @glint-expect-error v2 Field has no per-field defaultValue }}
<this.args.form.Field @name="profile.age" @defaultValue={{18}} />

<this.args.form.Subscribe @selector={{this.selectAge}} as |age|>
  {{this.expectNumber age}}
  {{! @glint-expect-error selector returns number }}
  {{this.expectString age}}
</this.args.form.Subscribe>
```

Add equivalent group Subscribe checks, generic standalone Subscribe with
`@source={{this.form.atom}}`, and standalone Field/ArrayField calls using
`@form={{this.form}}`.

- [ ] **Step 2: Run the type test and observe RED**

Run:

```bash
pnpm --filter @tanstack/ember-form run test:types
```

Expected: failure because `Field` and `ArrayField` are not exported and/or
their standalone Glint contracts are missing. Existing bound contracts must
still correctly satisfy their new positive and negative cases.

- [ ] **Step 3: Commit the failing public contract**

```bash
git add packages/ember-form/tests/types/templates.gts
git commit -m "test(ember-form): expand Glint type contracts"
```

### Task 2: Add Typed Standalone Field Components

**Files:**
- Modify: `packages/ember-form/src/form-api-types.ts`
- Modify: `packages/ember-form/src/components/field.gts`
- Modify: `packages/ember-form/src/components/array-field.gts`
- Modify: `packages/ember-form/src/index.ts`

**Interfaces:**
- Consumes: `EmberFormApi`, `FieldApiOptions`, `DeepKeys`,
  `DeepKeysWhereValueIncludes`, `DeepValue`, and `FieldValidators`.
- Produces: `EmberFieldComponent`, `EmberArrayFieldComponent`, and public
  `Field`/`ArrayField` component values requiring `@form`.

- [ ] **Step 1: Define standalone construct signatures**

Add construct signatures parallel to `EmberFormFieldComponent` and
`EmberFormArrayFieldComponent`. Each signature infers:

```ts
TFormData
TFormErrorTypes extends FormErrorTypes
TFieldComponents extends EmberFieldComponents
TFieldName extends DeepKeys<TFormData>
const TFieldValidators extends FieldValidators<
  TFormData,
  TFieldName,
  DeepValue<TFormData, TFieldName>
>
```

The argument type is the corresponding `FieldApiOptions` intersected with:

```ts
{ form: EmberFormApi<TFormData, TFormErrorTypes, TFieldComponents> }
```

The block yields the same `EmberFieldApi` type as the bound signature.
ArrayField replaces `DeepKeys` with
`DeepKeysWhereValueIncludes<TFormData, ReadonlyArray<any>>`.

- [ ] **Step 2: Let private runtime fields consume an unbound form**

Extend the private Field argument signature with an optional internal
`form?: AnyInternalFormApi`. Change its base getter to return `this.args.form`
when present and throw the existing binding error otherwise. Bound and grouped
subclasses continue overriding this getter.

ArrayField inherits this behavior without exposing its runtime class publicly.

- [ ] **Step 3: Export typed cast constants**

In `index.ts`, import the private runtime components and export:

```ts
export const Field =
  FieldComponent as unknown as EmberFieldComponent
export const ArrayField =
  ArrayFieldComponent as unknown as EmberArrayFieldComponent
```

Export the two construct-signature types as types as well.

- [ ] **Step 4: Run type tests and observe GREEN**

Run:

```bash
pnpm --filter @tanstack/ember-form run test:types
```

Expected: pass with standalone field paths, values, validators, and array path
constraints inferred from `@form`.

- [ ] **Step 5: Commit and push the implementation before broader testing**

```bash
git add packages/ember-form/src packages/ember-form/tests/types/templates.gts
git commit -m "feat(ember-form): type standalone field components"
git push -u origin cursor/ember-form-v2-phases-1-2-b79a
```

Update the existing pull request with the pre-verification revision.

### Task 3: Document Form API Type Choices

**Files:**
- Modify: `packages/ember-form/src/form-api-types.ts`
- Modify: `packages/ember-form/src/form-type.ts`
- Modify: `packages/ember-form/README.md`

**Interfaces:**
- Consumes: `AnyEmberFormApi` and `EmberFormType`.
- Produces: public guidance for shape-erased and shape-specific child component APIs.

- [ ] **Step 1: Add API JSDoc**

Document `AnyEmberFormApi` as shape-erased and suitable only for operations
common to every form. Document `EmberFormType<TOptions>` as preserving known
form paths, values, error types, and future registered component metadata from
a reusable options object.

- [ ] **Step 2: Add README child-component guidance**

Add a “Typing child components” section showing:

```ts
const profileOptions = formOptions({
  defaultValues: { profile: { name: '' } },
})

type ProfileForm = EmberFormType<typeof profileOptions>
```

Use `ProfileForm` in a child component argument, advise against
`EmberFormApi<T, any>`, and state that Subscribe establishes reactive template
consumption while `form.state` alone is an imperative snapshot read.

- [ ] **Step 3: Commit and push documentation**

```bash
git add packages/ember-form/README.md packages/ember-form/src/form-api-types.ts packages/ember-form/src/form-type.ts
git commit -m "docs(ember-form): clarify reusable form typing"
git push -u origin cursor/ember-form-v2-phases-1-2-b79a
```

### Task 4: Verify Diagnostics and Package Quality

**Files:**
- Temporarily modify and restore: `packages/ember-form/tests/types/templates.gts`

**Interfaces:**
- Consumes: all preceding public contracts.
- Produces: verification evidence only.

- [ ] **Step 1: Prove an expect-error is active**

Temporarily remove the directive before the incompatible validator and run:

```bash
pnpm --filter @tanstack/ember-form run test:types
```

Expected: nonzero exit with a diagnostic that the string validator is not
assignable to the numeric field validator.

- [ ] **Step 2: Restore the directive and run clean checks**

Run:

```bash
pnpm --filter @tanstack/ember-form run test:types
pnpm --filter @tanstack/ember-form run test:eslint
```

Expected: both commands pass.

- [ ] **Step 3: Commit any verification-driven corrections**

If verification required source changes:

```bash
git add packages/ember-form
git commit -m "fix(ember-form): correct standalone field type contracts"
git push -u origin cursor/ember-form-v2-phases-1-2-b79a
```

- [ ] **Step 4: Update the existing pull request**

Update its body with the stronger type surface, tests, documentation, and
focused verification results. Do not change its base branch or status.
