---
id: form-composition
title: Form Composition
---

As a form grows, extract repeated input wiring and related sections into
Glimmer components. Pass a field to a reusable input or a form to a section,
and share configuration with `formOptions`. The patterns below use explicit
arguments, `Field`, `Subscribe`, and `FormGroup`.

## Share options with `formOptions`

Keep a reusable value shape and defaults in a framework-agnostic options object:

```ts
// shared-form.ts
import { formOptions } from '@tanstack/ember-form';

export const peopleOptions = formOptions({
  defaultValues: {
    firstName: 'John',
    lastName: 'Doe',
  },
});
```

Create an instance with an owner wherever the form belongs:

```gts
import Component from '@glimmer/component';
import { createForm } from '@tanstack/ember-form';
import { peopleOptions } from './shared-form';

export default class PeoplePage extends Component {
  form = createForm(this, () => peopleOptions);

  <template>
    <this.form.Field @name="firstName" as |field|>
      {{field.value}}
    </this.form.Field>
  </template>
}
```

For a child that belongs to this known shape, derive its argument type instead
of using an erased form type:

```ts
import type { EmberFormType } from '@tanstack/ember-form';
import { peopleOptions } from './shared-form';

type PeopleForm = EmberFormType<typeof peopleOptions>;
```

`AnyEmberFormApi` is appropriate only for a genuinely form-agnostic component.
It intentionally does not check field paths and values.

## Pre-bound field components

A small Glimmer component can own the markup around a field while receiving the
already-bound field API:

```gts
// text-field.gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';

interface TextFieldSignature {
  Args: {
    field: {
      name: string;
      value: string;
      handleBlur: () => void;
      handleChange: (value: string) => void;
    };
    label: string;
  };
}

export default class TextField extends Component<TextFieldSignature> {
  updateText = (event: Event): void => {
    this.args.field.handleChange((event.target as HTMLInputElement).value);
  };

  <template>
    <label>
      <span>{{@label}}</span>
      <input
        name={{@field.name}}
        value={{@field.value}}
        {{on "input" this.updateText}}
        {{on "blur" @field.handleBlur}}
      />
    </label>
  </template>
}
```

Use it anywhere the form has a field of the required value type:

```gts
<this.form.Field @name="firstName" as |field|>
  <TextField @field={{field}} @label="First name" />
</this.form.Field>
```

The wrapper reads `value` and forwards input and blur events through
`handleChange` and `handleBlur`.

## A reusable submit button

A reusable component can subscribe to a form atom without a generated form
registry:

```gts
// subscribe-button.gts
import Component from '@glimmer/component';
import { Subscribe, type AnyEmberFormApi } from '@tanstack/ember-form';

interface SubscribeButtonSignature {
  Args: { form: AnyEmberFormApi; label: string };
}

const selectSubmitting = (state: { isSubmitting: boolean }) =>
  state.isSubmitting;

export default class SubscribeButton extends Component<SubscribeButtonSignature> {
  <template>
    <Subscribe
      @source={{@form.atom}}
      @selector={{selectSubmitting}}
      as |isSubmitting|
    >
      <button type="submit" disabled={{isSubmitting}}>
        {{@label}}
      </button>
    </Subscribe>
  </template>
}
```

The call site passes the instance explicitly:

```gts
<SubscribeButton @form={{this.form}} @label="Submit" />
```

Bound `<this.form.Subscribe>` is an equivalent choice when the component is
rendered inside the owning class. A named selector keeps the subscription
stable and makes the selected type visible.

## Split a large form into child components

Pass the typed form instance to child components. The child does not create a
second form or look up a global registration:

```gts
// child-fields.gts
import Component from '@glimmer/component';
import type { EmberFormType } from '@tanstack/ember-form';
import { peopleOptions } from './shared-form';
import TextField from './text-field.gts';
import SubscribeButton from './subscribe-button.gts';

type PeopleForm = EmberFormType<typeof peopleOptions>;

interface ChildFieldsSignature {
  Args: { form: PeopleForm; title?: string };
}

export default class ChildFields extends Component<ChildFieldsSignature> {
  get title(): string {
    return this.args.title ?? 'People';
  }

  <template>
    <section>
      <h2>{{this.title}}</h2>
      <this.args.form.Field @name="firstName" as |field|>
        <TextField @field={{field}} @label="First name" />
      </this.args.form.Field>
      <SubscribeButton @form={{this.args.form}} @label="Submit" />
    </section>
  </template>
}
```

The page owns the form and passes it down:

```gts
<ChildFields @form={{this.form}} @title="Profile" />
```

When the child is intentionally generic, replace `PeopleForm` with
`AnyEmberFormApi`; the cost is that field-path and field-value checks are then
lost inside that child.

## Reuse linked groups of fields

A section can express cross-field validation with `watchFields`. In this
example, changing the password reruns the confirmation field's change validator:

```gts
// password-fields.gts
import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { formOptions } from '@tanstack/ember-form';
import type { EmberFormType, FieldValidators } from '@tanstack/ember-form';
const accountOptions = formOptions({
  defaultValues: { password: '', confirmPassword: '' },
});

type AccountValues = {
  password: string;
  confirmPassword: string;
};
type AccountForm = EmberFormType<typeof accountOptions>;

const watchedPassword: Array<'password'> = ['password'];
const confirmValidators: FieldValidators<
  AccountValues,
  'confirmPassword',
  string
> = [
  {
    triggers: ['change'],
    watchFields: watchedPassword,
    run: ({ value, formApi }) =>
      value === formApi.getFieldValue('password')
        ? undefined
        : 'Passwords do not match',
  },
];

interface PasswordFieldsSignature {
  Args: { form: AccountForm };
}

export default class PasswordFields extends Component<PasswordFieldsSignature> {
  updateText = (field: { handleChange(value: string): void }, event: Event) =>
    field.handleChange((event.target as HTMLInputElement).value);

  <template>
    <this.args.form.Field @name="password" as |field|>
      <input
        type="password"
        value={{field.value}}
        {{on "input" (fn this.updateText field)}}
      />
    </this.args.form.Field>
    <this.args.form.Field
      @name="confirmPassword"
      @validators={{confirmValidators}}
      as |field|
    >
      <input
        type="password"
        value={{field.value}}
        {{on "input" (fn this.updateText field)}}
      />
      {{#each field.errors as |error|}}
        <p role="alert">{{error.message}}</p>
      {{/each}}
    </this.args.form.Field>
  </template>
}
```

The `accountOptions` object used above must contain both fields. Keep the
watched path array stable at module scope or on the component; a fresh array on
every render adds avoidable reconciliation work.

## Scoped form groups

For a true scoped value with group-level submission and validation, use the
implemented `FormGroup` component. Group field names are relative to the group:

This separate example defines the nested `account` value before scoping fields
to it:

```gts
import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { createForm } from '@tanstack/ember-form';

export default class AccountSection extends Component {
  form = createForm(this, () => ({
    defaultValues: {
      account: { password: '', roles: [] as string[] },
    },
  }));

  updateText = (field: { handleChange(value: string): void }, event: Event) =>
    field.handleChange((event.target as HTMLInputElement).value);

  <template>
    <this.form.FormGroup @name="account" as |group|>
      <group.Field @name="password" as |field|>
        <input
          type="password"
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
          {{on "blur" field.handleBlur}}
        />
      </group.Field>
      <group.ArrayField @name="roles" as |field|>
        {{field.value.length}} roles
      </group.ArrayField>
    </this.form.FormGroup>
  </template>
}
```

`FormGroup` scopes field paths, validation, and submission within the same
form. Pass the group or its bound fields explicitly to child components that
need them.

## Tree-shaking and lazy loading

One wrapper component per file, imported where used, naturally includes only the
wrappers referenced by a consuming module. There is no central Ember component
registry to inflate every bundle. Ember/Embroider dynamic imports can lazy-load
`.gjs` or `.gts` components, subject to the application's bundler setup.

## Putting it together

A typical feature has one owner and explicit boundaries:

```gts
// people-page.gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { createForm } from '@tanstack/ember-form';
import ChildFields from './child-fields.gts';
import { peopleOptions } from './shared-form';

export default class PeoplePage extends Component {
  form = createForm(this, () => ({
    ...peopleOptions,
    onSubmit: ({ value }) => console.log(value),
  }));

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <ChildFields @form={{this.form}} @title="People" />
    </form>
  </template>
}
```

The native `<form>` remains in the owner or a dedicated wrapper; submit wiring
still calls `preventDefault()` and `this.form.handleSubmit()` as shown in the
quick start. Child components receive exactly the API they need.

## Choosing a composition pattern

- Pass a field to an input wrapper when it only needs that field's value,
  handlers, and errors.
- Use `EmberFormType<typeof options>` for sections that belong to a known form
  shape. `AnyEmberFormApi` is more permissive but loses field-path and value
  checks inside the child.
- Use `FormGroup` when a nested section needs scoped validation or submission.
- Pass instances explicitly; the package does not provide a component registry
  or ambient form/field context lookup.
