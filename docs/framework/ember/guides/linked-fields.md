---
id: linked-fields
title: Link Two Form Fields Together
---

A field can depend on another field. For example, `confirmPassword` should be
invalid when it does not match `password`, regardless of which input changed.
Declare the dependency in a field validator's `watchFields` array.

Imagine this user flow:

- The user updates the confirm-password field.
- The user updates the password field.

The second update must rerun `confirmPassword`; otherwise an old mismatch could
remain visible after the values match.

## Validate related fields

```gts
import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import {
  createForm,
  type FieldValidators,
} from '@tanstack/ember-form';

interface PasswordValues {
  password: string;
  confirmPassword: string;
}

const passwordDependencies: Array<'password'> = ['password'];

const confirmPasswordValidators: FieldValidators<
  PasswordValues,
  'confirmPassword',
  string
> = [
  {
    triggers: ['change'],
    watchFields: passwordDependencies,
    run: ({ value, formApi }) =>
      value === formApi.getFieldValue('password')
        ? undefined
        : 'Passwords do not match',
  },
];

export default class PasswordForm extends Component {
  form = createForm(this, () => ({
    defaultValues: {
      password: '',
      confirmPassword: '',
    } satisfies PasswordValues,
  }));

  updateText = (
    field: { handleChange(value: string): void },
    event: Event,
  ): void => {
    field.handleChange((event.target as HTMLInputElement).value);
  };

  <template>
    <this.form.Field @name="password" as |field|>
      <label>
        Password
        <input
          type="password"
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
        />
      </label>
    </this.form.Field>

    <this.form.Field
      @name="confirmPassword"
      @validators={{confirmPasswordValidators}}
      as |field|
    >
      <label>
        Confirm password
        <input
          type="password"
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
        />
      </label>
      {{#each field.errors as |error|}}
        <div role="alert">{{error.message}}</div>
      {{/each}}
    </this.form.Field>
  </template>
}
```

`watchFields` is a core field-validator option. The validator still runs for
its own configured `triggers`; when a watched field emits that trigger, the
validator is run again with the current values. The stable module-level array
avoids allocating a new dependency list on every render.

## Blur validation

To rerun the same rule when the password field is blurred, use a `blur` trigger
(or include both triggers):

```ts
const confirmPasswordValidators: FieldValidators<
  PasswordValues,
  'confirmPassword',
  string
> = [
  {
    triggers: ['change', 'blur'],
    watchFields: passwordDependencies,
    run: ({ value, formApi }) =>
      value === formApi.getFieldValue('password')
        ? undefined
        : 'Passwords do not match',
  },
];
```

A watched field path is relative to the
form's value shape. For a field inside a `FormGroup`, use the group-relative
field options and paths supported by that group.

## Reactive validator changes

If the dependency or rule is driven by tracked arguments, use an options
function or a tracked component property and pass the current validator array:

```gts
form = createForm(this, () => ({
  defaultValues: { password: '', confirmPassword: '' },
  validators: this.args.requireStrongPasswords ? formValidators : [],
}));
```

Changed options are reconciled onto the same form instance. They are not frozen
at initial creation, although plain untracked mutations do not rerun the
options function. Keep validator slots and dependency arrays stable where
possible; this makes reconciliation and error association easier to follow.

## Tradeoff

`watchFields` makes cross-field validation explicit and typed, but it does not
create a cross-field component or shared registry. The Ember adapter still
requires a real owner for `createForm`, and a reusable component must receive
`@form` explicitly. That is the adapter cost in exchange for predictable
ownership and no hidden field lookup.
