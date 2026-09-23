---
id: arrays
title: Arrays
---

TanStack Form supports arrays as values in a form, including fields for objects
inside an array. Use a regular `Field` when one control replaces the
whole array and `ArrayField` when rendering and mutating items.

## An array as the field value

A regular field is enough for a multi-select, tag picker, or checkbox group
that replaces the complete array:

```gts
<this.form.Field @name="selectedRoleIds" as |field|>
  <RolePicker
    @value={{field.value}}
    @onValueChange={{field.handleChange}}
  />
</this.form.Field>
```

`RolePicker` here is an application component whose `@onValueChange` supplies
the next array. The form API does not prescribe the picker UI.

## Rendering fields in an array

Use `ArrayField` when each array item has its own fields or when items can be
added, removed, or reordered. An array-only `ArrayField` binding observes array
structure (length and structural version), while each nested `Field` observes its
own value and metadata. Editing an item therefore does not invalidate the array
container. Ordinary and array bindings are independent, so a whole-array `Field`
cannot broaden the `ArrayField` observation.

```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { createForm } from '@tanstack/ember-form';

interface Person {
  name: string;
  age: number;
}

const personName = (index: number): string => `people[${index}].name`;

export default class PeopleForm extends Component {
  form = createForm(this, () => ({
    defaultValues: {
      people: [] as Array<Person>,
    },
    onSubmit: ({ value }) => console.log(value),
  }));

  addPerson = (field: { pushValue(value: Person): void }): void => {
    field.pushValue({ name: '', age: 0 });
  };

  updateText = (field: { handleChange(value: string): void }, event: Event) =>
    field.handleChange((event.target as HTMLInputElement).value);

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <this.form.ArrayField @name="people" as |peopleField|>
        {{#each peopleField.value as |_person index|}}
          <this.form.Field @name={{personName index}} as |field|>
            <label>
              Name for person {{index}}
              <input
                name={{field.name}}
                value={{field.value}}
                {{on "input" (fn this.updateText field)}}
                {{on "blur" field.handleBlur}}
              />
            </label>
          </this.form.Field>
        {{else}}
          <p>No people yet.</p>
        {{/each}}
        <button
          type="button"
          {{on "click" (fn this.addPerson peopleField)}}
        >
          Add person
        </button>
      </this.form.ArrayField>
      <button type="submit">Submit</button>
    </form>
  </template>
}
```

The array field also exposes `pushValue`, `insertValue`, `removeValue`,
`swapValues`, `moveValue`, `filterValues`, and `clearValues`. The corresponding
form methods (`pushFieldValue`, `insertFieldValue`, and so on) take the array
field name first. These helpers update registered item fields as items move or
are removed; constructing a new array with `handleChange` does not provide that
specialized field bookkeeping.

## Keeping item identity

Nested names use an index because the index is part of a field path. For a UI
that preserves DOM or component identity while items move, use the identity
mechanism supplied by the list/component layer around this form. TanStack Form
moves the registered field state with its array item; Ember's ordinary
`{{#each}}` rendering still needs an application-level identity choice when
that distinction matters.

> In a strict-mode template, build a path such as `people[${index}].name` in a
> named JavaScript function (`personName` above), rather than placing a
> JavaScript template expression directly in an argument.

## Observing array state

An array-only `ArrayField` binding does not rerender its block for an edit to a
nested item. Ordinary and array bindings remain independent. Keep item controls
in nested `Field` blocks, and subscribe separately to array-level errors or
metadata when the surrounding UI needs them:

```gts
import { Subscribe } from '@tanstack/ember-form';

const selectArrayErrors = (state: {
  meta: { errors: readonly { message: string }[] };
}) => state.meta.errors;

<this.form.ArrayField @name="people" as |peopleField|>
  <Subscribe
    @source={{peopleField.atom}}
    @selector={{selectArrayErrors}}
    as |errors|
  >
    {{#each errors as |error|}}
      <p>{{error.message}}</p>
    {{/each}}
  </Subscribe>
</this.form.ArrayField>
```

For an array-only binding, the separate subscription avoids an array-container
rerender on every item edit.
