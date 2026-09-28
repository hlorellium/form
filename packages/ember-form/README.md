# @tanstack/ember-form

Powerful, type-safe forms for Ember, built on `@tanstack/form-core`.

## Compatibility

- ember-source 7.1 or later
- gjs and gts only

From ember-source 7.1, templates can use `on`, `fn`, and `hash` without an import.

## Installation

```sh
pnpm add @tanstack/ember-form
```

## Usage

There are two ways to create a form.

- `createForm(baseOptions)` is a module-scope factory. Each call returns a Glimmer component whose args override the defaults you passed in, and which yields the form to its block.
- `mountForm(parent, options)` returns the form itself, owned by an Ember destroyable such as a component. Use it in a class as `form = mountForm(this, { ... })`.

### The form component

```gjs
import Component from '@glimmer/component';
import { createForm } from '@tanstack/ember-form';

const handleInput = (field, event) => {
  field.handleChange(event.target.value);
};

const tooShort = ({ value }) => (value.length < 3 ? 'Too short' : undefined);

const pickSubmit = (state) => ({
  cantSubmit: !state.canSubmit,
  isSubmitting: state.isSubmitting,
});

const onSubmitFor = (form) => (event) => {
  event.preventDefault();
  form.handleSubmit();
};

const SignupForm = createForm({
  defaultValues: { firstName: '', lastName: '' },
});

export default class Signup extends Component {
  onSubmit = async ({ value }) => {
    console.log('submit', value);
  };

  <template>
    <SignupForm @onSubmit={{this.onSubmit}} as |f|>
      <form {{on "submit" (onSubmitFor f)}}>
        <f.Field
          @name="firstName"
          @validators={{hash onChange=tooShort}}
          as |field|
        >
          <label>
            First name
            <input
              value={{field.state.value}}
              {{on "input" (fn handleInput field)}}
            />
          </label>
          {{#each field.state.meta.errors as |error|}}
            <em>{{error}}</em>
          {{/each}}
        </f.Field>

        <f.Subscribe @selector={{pickSubmit}} as |slice|>
          <button type="submit" disabled={{slice.cantSubmit}}>
            {{if slice.isSubmitting "Submitting…" "Submit"}}
          </button>
        </f.Subscribe>
      </form>
    </SignupForm>
  </template>
}
```

### Owning the form in a class

`mountForm` is the second door. It returns the form itself, owned by an Ember destroyable — usually the component. Use it when the form should exist before the template renders, when its callbacks close over the class, or when a class getter needs to read it.

```gts
import Component from '@glimmer/component';
import { mountForm } from '@tanstack/ember-form';

const handleInput = (field, event) => {
  field.handleChange(event.target.value);
};

const nameAt = (index) => `people[${index}].name`;

export default class Guests extends Component {
  form = mountForm(this, {
    defaultValues: {
      people: [{ name: '' }],
      address: { street: '', city: '' },
    },
    onSubmit: ({ value }) => this.args.save(value),
  });

  submit = (event) => {
    event.preventDefault();
    this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.ArrayField @name="people" as |people|>
        {{#each people.state.value as |_ index|}}
          <this.form.Field @name={{nameAt index}} as |field|>
            <input
              value={{field.state.value}}
              {{on "input" (fn handleInput field)}}
            />
          </this.form.Field>
        {{/each}}

        <button type="button" {{on "click" (fn people.pushValue (hash name=""))}}>
          Add guest
        </button>
      </this.form.ArrayField>

      <this.form.FormGroup @name="address" as |address|>
        <this.form.Field @name="address.city" as |field|>
          <input
            value={{field.state.value}}
            {{on "input" (fn handleInput field)}}
          />
        </this.form.Field>
        {{#each address.state.meta.errors as |error|}}
          <em>{{error}}</em>
        {{/each}}
      </this.form.FormGroup>

      <button type="submit">Submit</button>
    </form>
  </template>
}
```

### API

`createForm(baseOptions)` returns a component. Call it in module scope. Each arg on the component, for example `@onSubmit`, overrides the same key in `baseOptions`. The component yields the form.

`mountForm(parent, options)` returns the form. Call it in a class, with the class instance as `parent`. The form mounts now, and it is a destroyable child of `parent`: it unmounts when `parent` is destroyed, or when you `destroy` it. `options` is an object, or a function that returns one. A function may read tracked state; the form applies changed options on the next bound component or selector read, direct state read, validation, reset, or submit call.

Pass the same instance to child components as `@form`. For a child tied to a
shared options object, `EmberFormFromOptions<typeof options>` preserves its
field paths and value types without copying the form's generic parameters.
The [composition guide](../../docs/framework/ember/guides/form-composition.md)
shows that boundary.

Both give you the `FormApi` with these additions:

- `Field` renders one field. It takes `@name` and the field options, for example `@validators` and `@defaultValue`.
- `ArrayField` renders an array field. `@name` must name an array. `field.state.value` follows the shape of the array — push, insert, remove, swap, move, clear — and not its items, so an edit to one item keeps the DOM of the others. Iterate over it with `{{#each}}`, and render each item with a `Field` of its own. `<Field @mode="array">` behaves the same.
- `FormGroup` renders a group: the fields under `@name`, with validators, listeners, and a submit lifecycle of their own. It yields form-core's `FormGroupApi`. `group.state.value` is the value under `@name`, `group.state.meta` aggregates the fields — `isValid`, `canSubmit`, `errors`, `isSubmitting` — and `group.handleSubmit()` validates and submits only that part of the form. The fields inside keep their full names: `@name="address.street"`.
- `createGroup(options)` creates a group owned by the form, so it remains available when a section's UI is hidden. Call it once per group name; use `group.update(options)` if its configuration changes. Fields still use full paths.
- `Subscribe` yields form state. It takes an optional `@selector`.
- `useSelector(selector?)` reads form state in JavaScript. It returns an object with an autotracked `current` property.

`Field`, `ArrayField`, `FormGroup`, and `Subscribe` are also exports. The exports take the form as `@form`.

> In a strict-mode template, a name in scope hides the HTML element of the same name. Do not name the component or the yielded form `form`. The examples use `tanstackForm`, or `f` when the markup contains a `<form>` element. A class property has no such limit, because the template reads it as `this.form`.

Everything else is re-exported from `@tanstack/form-core` (validators, types, helpers).

For the full guide — quick start, basic concepts, validation, dynamic validation, async initial values, arrays, linked fields, and form composition — see the [Ember docs in the TanStack/form repo](https://github.com/TanStack/form/tree/main/docs/framework/ember).

## Development

Ember projects test in a browser, because end users do not run node or a fake DOM. The tests render real components in Chrome and assert on the real DOM. This package has no jsdom tests.

Build `@tanstack/form-core` one time, then run the checks from this directory:

```sh
pnpm --filter @tanstack/form-core build

pnpm test:browser      # all tests, in headless Chrome
pnpm test:browser:dev  # a dev server, to run and debug the tests in your own browser
pnpm test:types        # source, tests, and demo app
pnpm test:eslint
```

`tests/types/templates.gts` holds the type tests. Each `@glint-expect-error` comment marks a template that must not type-check, and `pnpm test:types` fails if one of them does.

CI runs the browser tests two times: on the installed ember-source, and on 7.1, the oldest supported version.

In CI, the browser tests run in their own job on the GitHub runner, because the Nx agents that run the other targets have no browser.

## License

MIT — see the [root LICENSE](../../LICENSE).
