---
id: arrays
title: Arrays
---

TanStack Form supports arrays as values in a form, including sub-object values inside of an array.

## Basic Usage

> The examples name the form component `PeopleForm` and the yielded form `tanstackForm`. [Why not `form`?](./basic-concepts.md#why-not-form) explains the names.

To use an array, render an `ArrayField` and iterate over `field.state.value` with [`{{#each}}`](https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/each):

```gjs
import { createForm } from '@tanstack/ember-form';

const PeopleForm = createForm({
  defaultValues: {
    people: [],
  },
});

<template>
  <PeopleForm as |tanstackForm|>
    <tanstackForm.ArrayField @name="people" as |field|>
      {{#each field.state.value as |person|}}
        {{!-- ... --}}
      {{/each}}
    </tanstackForm.ArrayField>
  </PeopleForm>
</template>
```

`ArrayField` is a `Field` that tracks the _shape_ of the array rather than its items: the block re-renders when you push, insert, remove, swap, or move items, but not when a sub-field edits one of them. That keeps the DOM (and focus) of the list stable while typing. `<tanstackForm.Field @name="people" @mode="array">` behaves the same way; `ArrayField` also narrows `@name` to array paths.

This will regenerate the list every time you run `pushValue` on `field`:

```gjs
const addPerson = (field) => field.pushValue({ name: '', age: 0 });

{{!-- inside a template --}}
<button {{on "click" (fn addPerson field)}} type="button">
  Add person
</button>
```

Finally, you can use a subfield like so:

```gjs
const handleInput = (field, event) => field.handleChange(event.target.value);
const nameAt = (i) => `people[${i}].name`;

{{!-- inside a template --}}
<tanstackForm.Field @name={{nameAt i}} as |subField|>
  <input
    value={{subField.state.value}}
    {{on "input" (fn handleInput subField)}}
  />
</tanstackForm.Field>
```

Read the item's value from the sub-field (`subField.state.value`) rather than from the `{{#each}}` item. The `{{#each}}` item comes from the `ArrayField`, which only refreshes on shape changes.

## Full Example

```gjs
import { createForm } from '@tanstack/ember-form';

const handleInput = (field, event) => field.handleChange(event.target.value);
const nameAt = (i) => `people[${i}].name`;
const addPerson = (field) => field.pushValue({ name: '', age: 0 });

const onSubmitFor = (form) => (event) => {
  event.preventDefault();
  event.stopPropagation();
  form.handleSubmit();
};

const handleSubmit = ({ value }) => alert(JSON.stringify(value));

const PeopleForm = createForm({
  defaultValues: {
    people: [] as Array<{ age: number; name: string }>,
  },
});

<template>
  <PeopleForm @onSubmit={{handleSubmit}} as |f|>
    <form id="form" {{on "submit" (onSubmitFor f)}}>
      <f.ArrayField @name="people" as |field|>
        <div>
          {{#each field.state.value as |person i|}}
            <f.Field @name={{nameAt i}} as |subField|>
              <div>
                <label>
                  <div>Name for person {{i}}</div>
                  <input
                    value={{subField.state.value}}
                    {{on "input" (fn handleInput subField)}}
                  />
                </label>
              </div>
            </f.Field>
          {{/each}}

          <button {{on "click" (fn addPerson field)}} type="button">
            Add person
          </button>
        </div>
      </f.ArrayField>

      <button type="submit">Submit</button>
    </form>
  </PeopleForm>
</template>
```

> Note: in strict-mode templates you can't put complex expressions like `` `people[${i}].name` `` directly into an attribute or argument value. The `nameAt` helper above is a small module-level function that does the templating in JavaScript and is then invoked as `{{nameAt i}}`.
