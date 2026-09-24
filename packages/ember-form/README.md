# @tanstack/ember-form

Ember bindings for TanStack Form v2 alpha.

`createForm` returns a form instance immediately. The supplied Ember destroyable
owns its mount and cleanup; rendering a component is not required to create the
form.

## Usage

Pass an options factory to `createForm`. The shape of `defaultValues` determines
field names and value types; no separate options object or type declaration is
required.

```gts
import Component from '@glimmer/component';
import { array, fn, hash, not } from '@ember/helper';
import { on } from '@ember/modifier';
import { createForm } from '@tanstack/ember-form';

export default class ProfileForm extends Component {
  form = createForm(this, () => ({
    defaultValues: {
      fullName: '',
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  }));

  updateText = (
    field: { handleChange(value: string): void },
    event: Event,
  ) => field.handleChange((event.target as HTMLInputElement).value);

  validateName = ({ value }: { value: string }) =>
    value.trim() ? undefined : 'Enter your full name';

  selectSubmitState = (state: typeof this.form.state) => ({
    canSubmit: state.canSubmit && !state.isSubmitting,
    isSubmitting: state.isSubmitting,
  });

  submit = (event: SubmitEvent) => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.Field
        @name="fullName"
        @validators={{array
          (hash triggers=(array "change" "blur") run=this.validateName)
        }}
        as |field|
      >
        <label>
          Full name
          <input
            name={{field.name}}
            value={{field.value}}
            {{on "input" (fn this.updateText field)}}
            {{on "blur" field.handleBlur}}
            aria-invalid={{field.meta.isInvalid}}
          />
        </label>
        {{#each field.errors as |error|}}
          <span role="alert">{{error.message}}</span>
        {{/each}}
      </this.form.Field>

      <this.form.Subscribe @selector={{this.selectSubmitState}} as |state|>
        <button type="submit" disabled={{not state.canSubmit}}>
          {{if state.isSubmitting "Saving…" "Save"}}
        </button>
      </this.form.Subscribe>
    </form>
  </template>
}
```

Ember templates reference named callbacks rather than inline arrow functions.
`updateText` passes the input's value to the field, `validateName` validates it,
and `submit` prevents native navigation before submitting the form.
`selectSubmitState` selects the state observed by the submit button.

## Typing child components

When you extract fields into a child component, `formOptions` lets you share
the form definition and derive a type for the child's `@form` argument. This is
optional; keep options inline for a form used in one component:

```ts
import { formOptions, type EmberFormType } from '@tanstack/ember-form'

const profileOptions = formOptions({
  defaultValues: { profile: { name: '' } },
})

type ProfileForm = EmberFormType<typeof profileOptions>
```

`EmberFormType` preserves the options' inferred field paths and values. It also
derives error types when the options supply a known submit return type; otherwise
its error type falls back to `any`, allowing `onSubmit` to be supplied when the
form is created. Use `AnyEmberFormApi` only when a child intentionally works with
every form shape.

## Reactive state

Core reads remain synchronous snapshots, and their existing object identity is
preserved. Form-owned Ember handles observe direct reads from a form's `state`,
a field's `value`, `meta`, or `errors`, and a group's `state`:

```gts
get submitDisabled(): boolean {
  return this.form.state.isSubmitting;
}
```

Each property read establishes a dependency on its own core projection. Notification
is scheduled safely after the current render; the getter still reads the latest
core snapshot synchronously. Application values remain ordinary data, not deep
reactive proxies. An array binding observes structure, so item edits do not
rerender its container; a separate ordinary field binding cannot broaden that
observation.

For fine-grained projections in a class getter, use `useSelector`; it accepts a
raw atom or a form, field, or group directly:

```gts
import { createForm, useSelector } from '@tanstack/ember-form';

export default class ProfileForm extends Component {
  form = createForm(this, () => ({ defaultValues: { name: '' } }));
  submitState = useSelector(this, () => this.form, (state) => ({
    canSubmit: state.canSubmit,
    isSubmitting: state.isSubmitting,
  }));

  get canSubmit(): boolean {
    return this.submitState.current.canSubmit;
  }
}
```

The getter form source follows a tracked `this.form` replacement without
rebuilding the selection. A raw atom remains supported, for example
`useSelector(this, this.form.atom, (state) => state.values.name)`. The selected
`current` value is reactive wherever Ember consumes it, while imperative atom
and snapshot reads remain synchronous.

Use `<form.Subscribe>` (or standalone `<Subscribe @source={{form.atom}}>`)
when template output needs an explicit selector or projection. Subscribe also
accepts a form, field, or group source directly when that is more convenient.
Field and group configuration belongs to the form rather than the rendering
component. Selectors remain optional for projections; direct reads do not require
`.current` or `<Subscribe>`.

Regular field bindings observe their value and the metadata/error properties
consumed by the UI. `ArrayField.value` observes array structure (`length` and its
structural version), so item-value edits alone do not invalidate that read.
An ordinary `Field` over the same array does not broaden the array binding's
observation. Read array-level errors and metadata directly, or use an optional
selector when an explicit projection is useful:

```gts
import { Subscribe } from '@tanstack/ember-form';

const selectArrayErrors = (state: { meta: { errors: readonly unknown[] } }) =>
  state.meta.errors;

<form.ArrayField @name="items" as |field|>
  {{! render the array structure here }}
  <Subscribe
    @source={{field.atom}}
    @selector={{selectArrayErrors}}
    as |errors|
  >
    {{#each errors as |error|}}
      <p>{{error}}</p>
    {{/each}}
  </Subscribe>
</form.ArrayField>
```

## Configuration and defaults

Pass an options factory when configuration depends on tracked properties or
component arguments. JavaScript field and group factories use the same shape:

```ts
form = createForm(this, () => ({
  defaultValues: this.args.profile,
  validators: this.args.validators,
  onSubmit: this.args.onSave,
}))

email = this.form.field(() => ({
  name: 'email',
  validators: this.args.emailValidators,
}))

people = this.form.arrayField(() => ({ name: 'people' }))
profile = this.form.formGroup(() => ({ name: 'profile' }))
```

The function runs again when its tracked dependencies change. Updates are
applied asynchronously through Ember's run loop to the same form instance,
without remounting its fields. Observation stops when the supplied parent is
destroyed. Plain, untracked property mutations do not trigger updates.

Changed `defaultValues` update untouched fields while preserving touched field
values, following form-core's update semantics. Use `reset` when you intend to
discard edits and reset metadata, such as when switching to a different record.

Supply an explicit `formId` when server and browser output must share an
identifier. Otherwise form-core generates the identifier.

Set field defaults through the form's `defaultValues`. `Field` does not accept
an `@defaultValue` argument.

## Development

Run these commands from the repository root after installing dependencies:

```sh
pnpm --filter @tanstack/form-core build
pnpm --filter @tanstack/ember-form test:types
pnpm --filter @tanstack/ember-form test:eslint
pnpm --filter @tanstack/ember-form test:browser
pnpm --filter @tanstack/ember-form build
pnpm --filter @tanstack/ember-form test:build
```

`test:types` uses `ember-tsc` to check both TypeScript and Glint templates,
including the contracts in `tests/types/templates.gts`. The package-local ESLint
configuration handles `.gts` and `.gjs` as well as ordinary TypeScript and
JavaScript. Browser tests use QUnit, Vite, and Testem and require Chrome locally;
`test:browser:dev` starts the interactive Vite runner.

CI checks browser behavior and template types against both the locked Ember
version and Ember 7.1, the oldest supported minor.
