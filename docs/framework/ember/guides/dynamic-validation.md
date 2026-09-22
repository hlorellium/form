---
id: dynamic-validation
title: Dynamic Validation
---

Validation rules often depend on form state. A common example is showing
errors only after the first submission, then validating on every change. Use
validator trigger objects with a `when` condition to control when changes or
blur events should trigger validation.

## Validate changes after the first submission

Submission runs validators by default. The conditional `change` trigger below
is disabled until a submission attempt has occurred:

```ts
import type { FormValidator } from '@tanstack/ember-form';

type NameValues = { firstName: string; lastName: string };

const requiredAfterSubmit: FormValidator<NameValues> = {
  triggers: [
    {
      trigger: 'change',
      when: ({ formApi }) => formApi.state.submissionAttempts > 0,
    },
  ],
  run: ({ value, createErrorMap }) => {
    const errors = createErrorMap();
    if (!value.firstName) errors.fields.firstName = 'A first name is required';
    if (!value.lastName) errors.fields.lastName = 'A last name is required';
    return errors;
  },
};
```

Use the validator in a form owned by a component:

```gts
import Component from '@glimmer/component';
import { createForm } from '@tanstack/ember-form';

export default class NameForm extends Component {
  form = createForm(this, {
    defaultValues: { firstName: '', lastName: '' },
    validators: [requiredAfterSubmit],
  });
}
```

The first submit runs the validator and records errors. Subsequent changes run
it because `submissionAttempts` is now greater than zero. You can use a
conditional `blur` trigger instead, or include both trigger objects when the
post-submit mode needs both events.

> Keep validator arrays in a stable, understandable order. When an options
> function selects a different validator array, the form reconciles the changed
> definitions onto the same form and releases dependencies from the old
> definitions.

## Reading errors

Form-level validators can return a string or an error map. Use a field's
`errors` for issues routed to that field, or select form-level errors from the
form atom:

```gts
const selectFormErrors = (state: { errors: readonly { message: string }[] }) =>
  state.errors;

// Inside the owning component's template:
<this.form.Subscribe @selector={{selectFormErrors}} as |errors|>
  {{#each errors as |error|}}
    <p role="alert">{{error.message}}</p>
  {{/each}}
</this.form.Subscribe>
```

Inside a class template the bound form is normally `this.form`, so the final
block is usually `<this.form.Subscribe ...>`. The selector must be a named
function or class field; do not create a new inline closure in the template.

## Per-instance dynamic options

When the rule depends on tracked component arguments, return it from an options
function. This is a live reconciliation path, not an initial-options-only
shortcut:

```gts
import Component from '@glimmer/component';
import { createForm } from '@tanstack/ember-form';

interface Signature {
  Args: { requireNames: boolean };
}

export default class ConditionalForm extends Component<Signature> {
  form = createForm(this, () => ({
    defaultValues: { firstName: '', lastName: '' },
    validators: this.args.requireNames ? [requiredAfterSubmit] : [],
  }));
}
```

Tracked changes to `requireNames` update the validator pipeline on the existing
form. Plain untracked mutations do not cause the options function to run.

## Usage with fields

A field can use the same conditional trigger. This example validates age on
submit and on changes after a submission attempt:

```gts
import { array, fn } from '@ember/helper';
import { on } from '@ember/modifier';
import type { FieldValidator } from '@tanstack/ember-form';

const validateAge: FieldValidator<{ age: number }, 'age', number> = {
  triggers: [
    {
      trigger: 'change' as const,
      when: ({ formApi }) => formApi.state.submissionAttempts > 0,
    },
  ],
  run: ({ value }: { value: number }) =>
    value > 18 ? undefined : 'Age must be greater than 18',
};

<this.form.Field
  @name="age"
  @validators={{array validateAge}}
  as |field|
>
  <input
    type="number"
    value={{field.value}}
    {{on "change" (fn this.updateNumber field)}}
    {{on "blur" field.handleBlur}}
  />
  {{#each field.errors as |error|}}
    <p role="alert">{{error.message}}</p>
  {{/each}}
</this.form.Field>
```

Each array item describes one validator. The `fn` helper in this excerpt assumes the
component has a named `updateNumber` callback that calls
`field.handleChange(event.target.valueAsNumber)`.

## Async validation

Any validator `run` may return a promise. Use `triggerDebounceMs` to debounce
change or blur execution and `bailIfInvalid` to avoid an expensive check after a
cheap validator fails:

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
      const available = await validateUsername(value);
      return available ? undefined : 'Username is already taken';
    },
  },
];
```

`triggerDebounceMs` affects change and blur triggers; submit validation always
runs immediately. Pending work is visible through `field.meta.isValidating` and
`form.state.isValidating`. Use a field binding or form subscription to display
pending state reactively.

## Standard Schema validation

A Standard Schema can participate in the same conditional trigger:

```ts
import { z } from 'zod';

const namesSchema = z.object({
  firstName: z.string().min(1, 'A first name is required'),
  lastName: z.string().min(1, 'A last name is required'),
});

const validators = [
  {
    triggers: [
      {
        trigger: 'change' as const,
        when: ({ formApi }: { formApi: { state: { submissionAttempts: number } } }) =>
          formApi.state.submissionAttempts > 0,
      },
    ],
    run: namesSchema,
  },
];
```

Schema issues are routed to matching fields. Parsed schema outputs are
available by validator index in the submit context; editable `value` remains
the form's raw value.

## Choosing where a condition belongs

Use a trigger's `when` condition when the validator should stay registered but
only run for qualifying events. Use an options function when tracked
application state changes which validators are registered on the form.
Submission runs validators by default independently of their change and blur
trigger conditions; configure `runOnSubmit` when that behavior needs to differ.
