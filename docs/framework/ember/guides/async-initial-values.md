---
id: async-initial-values
title: Async Initial Values
---

Forms often edit data loaded from an API. A data-loading layer should own
fetching, caching, loading, and retries; TanStack Form should own the editable
copy.

There are two supported ways to provide async initial values: wait to create the
form until the data is ready, or create it immediately with complete fallback
values. Choose the approach that best matches the loading experience your UI
needs.

## Wait for data before creating the editor

A parent can show loading and error states, then render an editor once its
model is complete. The editor creates its form with the loaded record:

```gts
// person-editor.gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { createForm } from '@tanstack/ember-form';

type Person = { firstName: string; lastName: string };

interface EditorSignature {
  Args: { person: Person };
}

export default class PersonEditor extends Component<EditorSignature> {
  form = createForm(this, {
    defaultValues: this.args.person,
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

  updateText = (field: { handleChange(value: string): void }, event: Event) =>
    field.handleChange((event.target as HTMLInputElement).value);

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.Field @name="firstName" as |field|>
        <input
          name={{field.name}}
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
        />
      </this.form.Field>
      <this.form.Field @name="lastName" as |field|>
        <input
          name={{field.name}}
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
        />
      </this.form.Field>
      <button type="submit">Save</button>
    </form>
  </template>
}
```

The parent owns the request and decides when to render
`<PersonEditor @person={{this.person}} />`. This pattern avoids form state
while loading and is useful when changing records should create a fresh editor.
A keyed or otherwise record-aware rendering strategy is the parent's
responsibility.

## Create the form before data arrives

When the form should exist during loading, use an options function that returns
complete fallback values until the data arrives:

```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { createForm } from '@tanstack/ember-form';

type Person = { firstName: string; lastName: string };

const emptyPerson: Person = { firstName: '', lastName: '' };

interface PageSignature {
  Args: { person: Person | undefined };
}

export default class PersonPage extends Component<PageSignature> {
  form = createForm(this, () => ({
    defaultValues: this.args.person ?? emptyPerson,
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  }));

  updateText = (field: { handleChange(value: string): void }, event: Event) =>
    field.handleChange((event.target as HTMLInputElement).value);

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    {{#if @person}}
      <p>Loaded.</p>
    {{else}}
      <p>Loading...</p>
    {{/if}}
    <form {{on "submit" this.submit}}>
      <this.form.Field @name="firstName" as |field|>
        <input
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
        />
      </this.form.Field>
      <this.form.Field @name="lastName" as |field|>
        <input
          value={{field.value}}
          {{on "input" (fn this.updateText field)}}
        />
      </this.form.Field>
      <button type="submit">Save</button>
    </form>
  </template>
}
```

`defaultValues` must always contain the complete shape. When the tracked
`@person` value changes, the options function is evaluated and the same form
instance receives the new defaults asynchronously through Ember's run loop.
Untouched top-level fields adopt the new defaults; touched fields retain the
user's values. This behavior does not require a remount.

A plain options object is still correct for fixed configuration. An options
function is required when changing tracked values, validators, or callbacks
should reconcile onto the existing form. Plain, untracked mutations do not
trigger reconciliation.

## Background refetches and record changes

Defaults are not a fully controlled `values` prop. If background data arrives
while a user is editing, choose whether to keep local edits, ask for
confirmation, or reset deliberately:

```ts
// Apply a record and make it the new reset baseline.
this.form.reset(nextPerson);

// Apply a snapshot but retain the previous default baseline.
this.form.reset(nextPerson, { updateDefaultValues: false });
```

When switching to a different record, recreate the editor or call `reset`.
Otherwise touched values from the previous record may be preserved by the
normal changed-defaults behavior.

