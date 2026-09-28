---
id: quick-start
title: Quick Start
---

The bare minimum to get started with TanStack Form is to create a form and add a field. Keep in mind that this example does not include any validation or error handling... yet.

## In a template-only component

```gjs
import { createForm } from '@tanstack/ember-form';

const handleInput = (field, event) => field.handleChange(event.target.value);

const onSubmitFor = (form) => (event) => {
  event.preventDefault();
  event.stopPropagation();
  form.handleSubmit();
};

const handleSubmit = async ({ value }) => {
  // Do something with form data
  console.log(value);
};

const SimpleFormExample = createForm({
  defaultValues: {
    fullName: '',
  },
});

<template>
  <div>
    <h1>Simple Form Example</h1>
    <SimpleFormExample @onSubmit={{handleSubmit}} as |f|>
      <form {{on "submit" (onSubmitFor f)}}>
        <div>
          <f.Field @name="fullName" as |field|>
            <input
              name={{field.name}}
              value={{field.state.value}}
              {{on "blur" field.handleBlur}}
              {{on "input" (fn handleInput field)}}
            />
          </f.Field>
        </div>
        <button type="submit">Submit</button>
      </form>
    </SimpleFormExample>
  </div>
</template>
```

## In a class-based component

`createForm` stays in module scope. The class passes its own state to the form as args, for example `@onSubmit`.

```gjs
import Component from '@glimmer/component';
import { createForm } from '@tanstack/ember-form';

const handleInput = (field, event) => field.handleChange(event.target.value);

const onSubmitFor = (form) => (event) => {
  event.preventDefault();
  event.stopPropagation();
  form.handleSubmit();
};

const ProfileForm = createForm({
  defaultValues: {
    fullName: '',
  },
});

export default class EditProfile extends Component {
  save = async ({ value }) => {
    await this.args.onSave(value);
  };

  <template>
    <ProfileForm @onSubmit={{this.save}} as |f|>
      <form {{on "submit" (onSubmitFor f)}}>
        <f.Field @name="fullName" as |field|>
          <input
            name={{field.name}}
            value={{field.state.value}}
            {{on "blur" field.handleBlur}}
            {{on "input" (fn handleInput field)}}
          />
        </f.Field>
        <button type="submit">Submit</button>
      </form>
    </ProfileForm>
  </template>
}
```

## Owning the form in a class

`mountForm` is the other way in. It returns the form itself, owned by a destroyable — here, the component. The form exists as soon as the class is constructed, so its callbacks can close over the class, and a getter can read it. Render its fields as `<this.form.Field>`.

```gjs
import Component from '@glimmer/component';
import { mountForm } from '@tanstack/ember-form';

const handleInput = (field, event) => field.handleChange(event.target.value);

export default class EditProfile extends Component {
  form = mountForm(this, {
    defaultValues: {
      fullName: '',
    },
    onSubmit: async ({ value }) => {
      await this.args.onSave(value);
    },
  });

  submit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.Field @name="fullName" as |field|>
        <input
          name={{field.name}}
          value={{field.state.value}}
          {{on "blur" field.handleBlur}}
          {{on "input" (fn handleInput field)}}
        />
      </this.form.Field>
      <button type="submit">Submit</button>
    </form>
  </template>
}
```

## Notes

- `createForm({ ... })` is called at module scope. It returns a Glimmer component that you invoke in your template; the form's lifecycle (mount/unmount and store subscriptions) is tied to that invocation. The same `createForm` result can be invoked multiple times — each invocation is its own form instance.
- `mountForm(this, { ... })` is called in a class. It returns the form, mounted, as a destroyable child of `this`: the form unmounts when the class instance is destroyed. `options` may also be a function, `() => ({ ... })`, when it reads tracked state such as `this.args`. Changed options are applied on the next bound component or selector read, direct state read, validation, reset, or submit call. Because the form is a class property, `this.form` is a fine name — the template reads it as `this.form`, which does not hide the `<form>` element.
- Anything shared across every instance (such as `defaultValues` or validators that don't depend on per-instance state) goes into the `createForm` call. Anything per-instance — most notably `onSubmit`, which usually closes over component state — is passed as an arg on the invocation: `<SimpleFormExample @onSubmit={{handleSubmit}}>`.
- The component yields the form, named `f` in the examples above. Use it to render fields (`<f.Field>`) and to read form state (`<f.Subscribe>`). [Why not `form`?](./guides/basic-concepts.md#why-not-form) explains the names.
- `onSubmitFor` is a small module-level helper that produces a `submit` handler for a given form. It's a convenient way to keep `event.preventDefault()` plumbing out of every template without re-introducing class methods.
- Common template built-ins like `on`, `fn`, `hash`, and `if` are compiled into scope by ember-source's template build transforms (ember-source 7+), so you don't need to import them.
- `handleInput` is defined at module scope rather than as a method, so we can use the standard `(fn handleInput field)` pattern without binding `this` for every render.

From here, you'll be ready to explore all of the other features of TanStack Form!
