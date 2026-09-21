# @tanstack/ember-form

Ember bindings for TanStack Form v2 alpha.

`createForm` returns a form instance immediately. The supplied Ember destroyable
owns its mount and cleanup; rendering a component is not required to create the
form.

## Usage

Pass options directly to `createForm`. The shape of `defaultValues` determines
field names and value types; no separate options object or type declaration is
required.

```gts
import Component from '@glimmer/component';
import { array, fn, hash, not } from '@ember/helper';
import { on } from '@ember/modifier';
import { createForm } from '@tanstack/ember-form';

export default class ProfileForm extends Component {
  form = createForm(this, {
    defaultValues: {
      fullName: '',
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

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

Use `<form.Subscribe>` (or standalone `<Subscribe @source={{form.atom}}>`) when
template output must react to selected state. `form.state` is a current
imperative read; reading it alone does not establish an Ember autotracking
dependency.

Regular field blocks observe v2 `field.value`, `field.meta`, and `field.errors`.
`ArrayField` intentionally observes array structure (`length` and its structural
version), so edits to an item do not rerender the array container. Subscribe to
array-level errors or metadata through the field atom when that state belongs in
the surrounding UI:

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

The creation options are initial configuration. They are not automatically
observed or reconciled. Stable callbacks can read current application state
when called. Use core field/form operations for editable values and `reset`
only when its value, metadata, and baseline reset semantics are intended.

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
