---
id: basic-concepts
title: Basic Concepts and Terminology
---

This page introduces the concepts used by `@tanstack/ember-form`. The examples
store the form instance in a class property named `form` and render fields
through its bound components.

## Form options

`defaultValues` defines the complete form value shape and is the source of
field-path inference. Use `formOptions` when a definition is shared by more
than one owner or child component:

```ts
import { formOptions } from '@tanstack/ember-form';

interface Person {
  firstName: string;
  lastName: string;
  hobbies: Array<string>;
}

const defaultPerson: Person = {
  firstName: '',
  lastName: '',
  hobbies: [],
};

export const personOptions = formOptions({
  defaultValues: defaultPerson,
});
```

`formOptions` is framework-agnostic core configuration re-exported by the Ember
package. It is optional; a one-off form can keep its options inline.

## Form API and ownership

`createForm(owner, options)` returns a form instance immediately. The `owner`
must be an Ember destroyable, such as a Glimmer component. The instance mounts
and cleans up with that owner, and its bound `Field`, `ArrayField`, `Subscribe`,
and `FormGroup` components all point at the same form.

```gts
import Component from '@glimmer/component';
import { createForm, formOptions } from '@tanstack/ember-form';
import { on } from '@ember/modifier';

const options = formOptions({
  defaultValues: { firstName: '', lastName: '', hobbies: [] as string[] },
});

export default class PersonForm extends Component {
  form = createForm(this, () => options);

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.Field @name="firstName" as |field|>
        {{field.value}}
      </this.form.Field>
    </form>
  </template>
}
```

An options function is the reactive form of configuration:

```ts
form = createForm(this, () => ({
  defaultValues: this.args.person,
  validators: this.args.validators,
  onSubmit: ({ value }) => this.args.onSave(value),
}))
```

Tracked dependencies are observed and changes are reconciled asynchronously onto
the same form, without remounting fields. Changed defaults update untouched
fields and preserve touched fields. Use `form.reset(values)` to intentionally
replace edits and the reset baseline. A fixed object configures the form once;
plain untracked mutations do not cause updates.

### Sharing a form instance

Create the instance once for its intended editing lifetime. Class templates
use `<this.form.Field>`; reusable components can receive the same instance as
`@form` and use `<this.args.form.Field>` or standalone `<Field @form={{@form}}>`.
Template-only components can render `<@form.Field>`.

The native `<form>` element remains ordinary HTML and does not create or own
the form instance.

## Field

A `Field` represents one value at a deep field path. Use the bound component
from a form or import the standalone component and supply `@form`:

```gts
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { Field } from '@tanstack/ember-form';

<Field @form={{this.form}} @name="firstName" as |field|>
  <input
    name={{field.name}}
    value={{field.value}}
    {{on "blur" field.handleBlur}}
    {{on "input" (fn this.updateText field)}}
  />
</Field>
```

The field API exposes:

- `name`, the inferred field path;
- `value`, the current value;
- `meta`, including touched, dirty, pristine, default-value, blurred, and
  validating flags;
- `errors`, an array of validation issues;
- `handleChange(value)`, `handleBlur()`, `reset()`, and array mutation methods;
- `atom`, for lower-level subscriptions.

`Field` has no `@defaultValue`. Put defaults on the form's `defaultValues` and
use `form.reset` for an intentional per-record reset.

## Field state and dirty semantics

A field's `meta.isTouched` indicates interaction, while `meta.isDirty` records
whether a dirty-marking update occurred. Dirty state is persistent until reset;
returning to the original value does not make `isDirty` false. `meta.isPristine`
is its inverse. `meta.isDefaultValue` compares the current value with the
current default, so it can become true after a user reverts an edit.

The same distinction exists on `form.state` (`isDirty`, `isPristine`, and
`isDefaultValue`).

## Validation

Validators are ordered objects in an array. Each has a `run` function (or a
Standard Schema) and explicit `triggers`:

```gts
import { array } from '@ember/helper';

const validateFirstName = {
  triggers: ['change'],
  run: ({ value }: { value: string }) =>
    value.trim() ? undefined : 'A first name is required',
};

<this.form.Field
  @name="firstName"
  @validators={{array validateFirstName}}
  as |field|
>
  <input value={{field.value}} />
  {{#each field.errors as |error|}}
    <p role="alert">{{error.message}}</p>
  {{/each}}
</this.form.Field>
```

`change` and `blur` control non-submit validation. Validators run on submit by
default; `runOnSubmit`, `runOnMount`, `triggerDebounceMs`, `bailIfInvalid`, and
conditional trigger objects provide further control. This replaces the old
`@validators={{hash onChange=... onBlur=...}}` shape.

Field errors are normalized issue objects (`{ message: string }`) for ordinary
string validators. `form.state.errors` contains form-level errors; errors
routed to a field appear in that field's `errors`.

## Validation with Standard Schema

A Standard Schema can be supplied as `run` in the same validator object:

```gts
import { array, hash } from '@ember/helper';
import { z } from 'zod';

const firstNameSchema = z.string().min(3, 'Use at least 3 characters');

<this.form.Field
  @name="firstName"
  @validators={{array
    (hash triggers=(array "change") run=firstNameSchema)
  }}
  as |field|
>
  <input value={{field.value}} />
</this.form.Field>
```

A form-level schema belongs in the form's `validators` array. Its issues can be
routed to matching fields according to the schema's paths.

## Reactive state

Bound `<this.form.Subscribe>` selects a slice of `FormState` and yields it to
the block. Standalone `<Subscribe>` takes both `@source` and `@selector`:

```gts
import { not } from '@ember/helper';
import { Subscribe } from '@tanstack/ember-form';

const selectFirstName = (state: { values: { firstName: string } }) =>
  state.values.firstName;
const selectSubmit = (state: {
  canSubmit: boolean;
  isSubmitting: boolean;
}) => ({
  canSubmit: state.canSubmit,
  isSubmitting: state.isSubmitting,
});

<this.form.Subscribe @selector={{selectFirstName}} as |firstName|>
  <p>First name: {{firstName}}</p>
</this.form.Subscribe>

<Subscribe
  @source={{this.form.atom}}
  @selector={{selectSubmit}}
  as |submit|
>
  <button type="submit" disabled={{not submit.canSubmit}}>
    {{if submit.isSubmitting "Saving..." "Submit"}}
  </button>
</Subscribe>
```

Core snapshots remain synchronous and preserve their object identity. Direct
reads from `form.state`, yielded `field.value`/`field.meta`/`field.errors`, and a
group's `state` establish property-scoped Ember dependencies; notification is
deferred safely until after the current render. `ArrayField` remains
structure-only, so nested item edits do not rerender its container. Independent
ordinary and array bindings do not alter one another's observation. For
fine-grained projections, keep selectors stable and use `Subscribe` or
`useSelector` rather than relying on arbitrary deep tracking.

## Array fields

Use `ArrayField` for a list whose items have independently registered fields.
It observes array structure and supplies `pushValue`, `removeValue`,
`swapValues`, `moveValue`, `insertValue`, `filterValues`, and `clearValues`.
Nested fields use paths such as `hobbies[0]`. See the [arrays guide](./arrays.md)
for the complete Ember rendering pattern and its subscription tradeoff.

## Form groups

The current adapter also exposes `FormGroup` for a scoped value, validators,
submission, and nested `Field`/`ArrayField` components:

```gts
<this.form.FormGroup @name="profile" as |group|>
  <group.Field @name="firstName" as |field|>
    {{field.value}}
  </group.Field>
  <group.ArrayField @name="hobbies" as |field|>
    {{field.value.length}}
  </group.ArrayField>
</this.form.FormGroup>
```

Group field names are relative to the group's name. `FormGroup` is an explicit
scoped API, not an application registry or an AppForm abstraction.
