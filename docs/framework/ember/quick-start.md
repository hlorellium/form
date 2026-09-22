---
id: quick-start
title: Quick Start
---

TanStack Form is a headless, type-safe form library. It owns form state and
validation while leaving markup, styling, and component choice to you. The Ember
adapter connects that state to Ember's reactivity and component lifetimes.

Install the Ember adapter:

```bash
npm install @tanstack/ember-form
```

## Create a form

The owner passed to `createForm` owns the form's mount, subscriptions, and
cleanup. A Glimmer component is therefore the smallest complete example:

```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { createForm } from '@tanstack/ember-form';

export default class ProfileForm extends Component {
  form = createForm(this, {
    defaultValues: {
      fullName: '',
    },
    onSubmit: async ({ value }) => {
      // Save value with your application or data-loading layer.
      console.log(value);
    },
  });

  updateText = (
    field: { handleChange(value: string): void },
    event: Event,
  ): void => {
    field.handleChange((event.target as HTMLInputElement).value);
  };

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.Field @name="fullName" as |field|>
        <label>
          Full name
          <input
            name={{field.name}}
            value={{field.value}}
            aria-invalid={{field.meta.isInvalid}}
            {{on "input" (fn this.updateText field)}}
            {{on "blur" field.handleBlur}}
          />
        </label>
        {{#each field.errors as |error|}}
          <span role="alert">{{error.message}}</span>
        {{/each}}
      </this.form.Field>
      <button type="submit">Submit</button>
    </form>
  </template>
}
```

`handleSubmit()` runs submission validation and invokes `onSubmit` only when the
form is valid. The native submit event still needs `preventDefault()` so the
browser does not navigate away. This example leaves event propagation intact;
add `stopPropagation()` only if the surrounding application's event handling
requires it. Native `<form>` elements should not be nested.

The important pieces are:

- `defaultValues` define the complete initial value and drive type inference.
- `this.form.Field` subscribes to one field and exposes its value, metadata,
  errors, and event handlers through the block parameter.
- Validators are ordered objects with a `run` function and explicit `triggers`.
- `this.form.Subscribe` exposes selected form state reactively to the template
  without making unrelated fields rerender.
- `this.form.handleSubmit()` validates the form before calling `onSubmit`.

## A reusable options function

Pass a function instead of an options object when values or callbacks depend on
tracked component arguments. The function is reconciled onto the same form
instance when its tracked dependencies change:

```gts
import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { createForm } from '@tanstack/ember-form';

interface EditorSignature {
  Args: {
    profile: { fullName: string };
    onSave: (value: { fullName: string }) => void | Promise<void>;
  };
}

export default class Editor extends Component<EditorSignature> {
  form = createForm(this, () => ({
    defaultValues: this.args.profile,
    onSubmit: ({ value }) => this.args.onSave(value),
  }));

  updateText = (field: { handleChange(value: string): void }, event: Event) =>
    field.handleChange((event.target as HTMLInputElement).value);

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.Field @name="fullName" as |field|>
        <input
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
          {{on "blur" field.handleBlur}}
        />
      </this.form.Field>
      <button type="submit">Save</button>
    </form>
  </template>
}
```

Changing tracked `profile` updates the live form configuration asynchronously
through Ember's run loop. In this example, `onSave` is read inside the submit
callback, so submission reads the current argument without requiring options
reconciliation for that argument alone. Changed defaults update untouched
fields while preserving touched values. Use `this.form.reset(nextValues)` when
switching records or deliberately discarding edits.

## Sharing a form with child components

Create the form on a component or another destroyable owner, then pass the
instance to child components as `@form`. Children can render
`<this.args.form.Field>` or standalone `<Field @form={{@form}}>` without
creating another form. A template-only child can use `<@form.Field>`.

## Ember integration notes

- Pass the owning destroyable as the first argument to `createForm`.
- Put complete `defaultValues` on the form; `Field` has no per-field
  `@defaultValue` argument.
- Read field values, metadata, and errors through `field.value`, `field.meta`,
  and `field.errors`. Errors are objects with a `message` property.
- Reading `this.form.state` is an imperative snapshot and does not itself create
  an Ember autotracking dependency.

From here, explore arrays, async defaults, validation, and composition.
