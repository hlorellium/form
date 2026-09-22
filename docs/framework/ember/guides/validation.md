---
id: form-validation
title: Form and Field Validation
---

TanStack Form supports synchronous, asynchronous, field-level, form-level, and
Standard Schema validation. Every validator is an ordered object with a `run`
implementation and explicit `triggers`.

## Choose when validation runs

A validator is an object with a `run` function (or Standard Schema) and a
`triggers` array. Submission runs validators by default, even when their
configured non-submit triggers are `change` or `blur`:

```gts
import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import {
  createForm,
  type FieldValidators,
} from '@tanstack/ember-form';

interface AgeValues {
  age: number;
}

const ageValidators: FieldValidators<AgeValues, 'age', number> = [
  {
    triggers: ['change'],
    run: ({ value }) =>
      value < 13 ? 'You must be 13 to make an account' : undefined,
  },
];

export default class AgeForm extends Component {
  form = createForm(this, {
    defaultValues: { age: 0 } satisfies AgeValues,
  });

  updateNumber = (
    field: { handleChange(value: number): void },
    event: Event,
  ): void => {
    field.handleChange((event.target as HTMLInputElement).valueAsNumber);
  };

  <template>
    <this.form.Field
      @name="age"
      @validators={{ageValidators}}
      as |field|
    >
      <label for={{field.name}}>Age:</label>
      <input
        id={{field.name}}
        name={{field.name}}
        value={{field.value}}
        type="number"
        aria-invalid={{field.meta.isInvalid}}
        {{on "change" (fn this.updateNumber field)}}
        {{on "blur" field.handleBlur}}
      />
      {{#each field.errors as |error|}}
        <em role="alert">{{error.message}}</em>
      {{/each}}
    </this.form.Field>
  </template>
}
```

For feedback on blur, change the validator to `triggers: ['blur']` and keep
`field.handleBlur` wired to the input. Different checks can run at different
times by putting multiple objects in the array:

```ts
const ageValidators = [
  {
    triggers: ['change'] as const,
    run: ({ value }: { value: number }) =>
      value < 13 ? 'You must be 13 to make an account' : undefined,
  },
  {
    triggers: ['blur'] as const,
    run: ({ value }: { value: number }) =>
      value < 0 ? 'Invalid value' : undefined,
  },
];
```

`field.errors` is an array of normalized issues, usually `{ message: string }`,
so iterate it when rendering. `field.meta.original.errors` exposes errors before
an `errorVisibility` policy filters them.

Additional controls include:

- `runOnMount`: run once when the form, field, or group first mounts.
- `runOnSubmit`: disable or conditionally enable submit-time execution.
- `triggerDebounceMs`: debounce change and blur execution.
- `bailIfInvalid`: skip this and subsequent validators after an earlier failure.
- Trigger objects with `when`: enable a trigger conditionally.
- `watchFields`: rerun a field validator when related fields trigger it.

## Control when errors are visible

Use `field.errors` for the public field errors and `field.meta.isInvalid` for
state used by accessibility attributes:

```gts
<this.form.Field @name="age" @validators={{ageValidators}} as |field|>
  <input
    value={{field.value}}
    aria-invalid={{field.meta.isInvalid}}
  />
  {{#each field.errors as |error|}}
    <em role="alert">{{error.message}}</em>
  {{/each}}
</this.form.Field>
```

Errors returned as structured values retain their message and type through the
API's inferred error types. For a visibility policy, configure
`errorVisibility` on the form or field. Validation still determines
`form.state.isValid`; visibility only controls what a field exposes publicly.

```ts
import { formOptions } from '@tanstack/ember-form';

const options = formOptions({
  defaultValues: { email: '' },
  errorVisibility: ({ fieldState, state }) =>
    fieldState.meta.isBlurred || state.submissionAttempts > 0,
});
```

## Form-level validation

A form validator uses the same ordered array shape. It can return a form issue
or route issues to typed field paths with `createErrorMap`:

```ts
import type { FormValidators } from '@tanstack/ember-form';

type Contact = { email: string; phone: string };

const contactValidators: FormValidators<Contact> = [
  {
    triggers: ['change'],
    run: ({ value, createErrorMap }) => {
      const errors = createErrorMap();
      if (!value.email && !value.phone) {
        errors.form = 'Provide an email address or phone number';
        errors.fields.email = 'Email is required when phone is empty';
        errors.fields.phone = 'Phone is required when email is empty';
      }
      return errors;
    },
  },
];
```

Put `contactValidators` in `createForm(this, { validators: ... })`. Form-level
errors are available in `form.state.errors`; issues routed to fields appear in
those field APIs. Subscribe to a selected slice in a template:

```gts
const selectFormErrors = (state: { errors: readonly { message: string }[] }) =>
  state.errors;

<this.form.Subscribe @selector={{selectFormErrors}} as |errors|>
  {{#each errors as |error|}}
    <p role="alert">{{error.message}}</p>
  {{/each}}
</this.form.Subscribe>
```

## Asynchronous validation and debouncing

A validator `run` can return a promise. Put inexpensive checks first and use
`bailIfInvalid` to avoid a network call after an earlier validator fails:

```ts
const usernameValidators = [
  {
    triggers: ['change'] as const,
    run: ({ value }: { value: string }) =>
      value.length >= 3 ? undefined : 'Use at least 3 characters',
  },
  {
    triggers: ['change'] as const,
    triggerDebounceMs: 500,
    bailIfInvalid: true,
    run: async ({ value }: { value: string }) => {
      const available = await checkUsername(value);
      return available ? undefined : 'That username is already taken';
    },
  },
];
```

`triggerDebounceMs` debounces change and blur triggers; submit validation
executes immediately. `field.meta.isValidating` and
`form.state.isValidating` expose pending work. Use field bindings or a form
subscription to display this state reactively. Asynchronous validators use the
same options as synchronous validators; their `run` function returns a promise.

## Standard Schema validation

Any Standard Schema implementation can be supplied as `run`:

```ts
import { z } from 'zod';
import type { FormValidators } from '@tanstack/ember-form';

type AgeValues = { age: number };
const ageSchema = z.object({
  age: z.number().gte(13, 'You must be 13 to make an account'),
});

const ageValidators: FormValidators<AgeValues> = [
  {
    triggers: ['change'],
    run: ageSchema,
  },
];
```

Zod, Valibot, ArkType, and other libraries that implement the Standard Schema
specification can be used this way. A schema validator can be asynchronous as
well; add `triggerDebounceMs` to the validator object when change or blur work
needs debouncing. Schema issues are routed to matching field paths. Parsed
schema outputs are available by validator index in submit context, for example
`schemaOutputs[0]`; `value` remains the form's raw editable state rather than
the parsed output.

For custom schema routing, call a schema's safe-parse API inside `run` and pass
its issues to the provided `parseIssues` helper.

## Validate related fields

Use `watchFields` when one field depends on another. For example, a
`confirmPassword` validator can watch `password` and rerun when the password's
configured trigger fires. See the [linked fields guide](./linked-fields.md) for
the complete example.

## Return errors from submission

Endpoint validation belongs in `onSubmit`. Return `createValidationError` to
feed server issues back into ordinary form and field state:

Here the application supplies `saveProfile` as an argument. The component owns
the form, and native submission is wired explicitly:

```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { createForm } from '@tanstack/ember-form';

interface ProfileSignature {
  Args: {
    saveProfile: (value: { email: string }) => Promise<{ ok: boolean }>;
  };
}

export default class ProfileForm extends Component<ProfileSignature> {
  form = createForm(this, {
    defaultValues: { email: '' },
    onSubmit: async ({ value, createValidationError }) => {
      const result = await this.args.saveProfile(value);
      if (!result.ok) {
        return createValidationError({
          form: 'Could not save the profile',
          fields: { email: 'This email is already registered' },
        });
      }
      return null;
    },
  });

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      {{! Place the bound email field here. }}
      <button type="submit">Save</button>
    </form>
  </template>
}
```

The form's inferred submit return type contributes to field and form error
types. `handleSubmit()` waits for `onSubmit` and stores a returned validation
error in the same state consumed by `field.errors` and `form.state.errors`.

## Prevent invalid submission

`form.handleSubmit()` runs submission validation and does not call `onSubmit`
when validation fails. Subscribe to `canSubmit` and `isSubmitting` for a submit
control:

```gts
import { not } from '@ember/helper';

const selectSubmitState = (state: {
  canSubmit: boolean;
  isSubmitting: boolean;
  isPristine: boolean;
}) => ({
  canSubmit: state.canSubmit && !state.isPristine,
  isSubmitting: state.isSubmitting,
});

<this.form.Subscribe @selector={{selectSubmitState}} as |state|>
  <button type="submit" disabled={{not state.canSubmit}}>
    {{if state.isSubmitting "Submitting..." "Submit"}}
  </button>
</this.form.Subscribe>
```

`canSubmit` is optimistic until validation has run, so combining it with
`isPristine` is useful when the product should require an interaction before a
submit. A disabled button can hide useful validation feedback; consider
`aria-disabled` and still let `handleSubmit()` report the errors.

## Organizing validators

Keep validator arrays in named definitions so templates can pass them through
`@validators`. Each rule declares its own trigger, debounce, and submission
policy. Keep error presentation in the template or a reusable field component
and render each issue's `message`.
