import { destroy } from '@ember/destroyable';
import { fillIn, render, settled } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { createForm, useSelector } from '@tanstack/ember-form';
import {
  handleInput,
  required,
  selectName,
  whenPresent,
  type Profile,
} from '../helpers.ts';

module('Integration | createForm v2', function (hooks) {
  setupRenderingTest(hooks);

  test('creates an instance before rendering and cleans selector ownership', async function (assert) {
    const formOwner = {};
    const selectorOwner = {};
    let submitted: Profile | undefined;
    const form = createForm(formOwner, {
      defaultValues: { name: '', email: '' } as Profile,
      onSubmit: ({ value }) => {
        submitted = value;
      },
    });
    const name = useSelector(selectorOwner, form.atom, selectName);

    form.setFieldValue('name', 'Grace');
    assert.strictEqual(name.current, 'Grace', 'selection reads synchronously');

    await form.handleSubmit();
    assert.deepEqual(submitted, { name: 'Grace', email: '' });

    destroy(selectorOwner);
    form.setFieldValue('name', 'Ada');
    await Promise.resolve();
    assert.strictEqual(name.current, 'Grace', 'destroyed selection does no work');

    destroy(formOwner);
  });

  test('binds v2 fields and subscriptions to one explicit form instance', async function (assert) {
    const owner = {};
    const form = createForm(owner, {
      defaultValues: { name: '', email: '' } as Profile,
    });

    this.setProperties({
      form,
      handleInput,
      required,
      selectName,
      whenPresent,
    });

    await render(<template>
      <form.Field @name="name" @validators={{this.required}} as |field|>
        <input
          id="name"
          value={{field.value}}
          {{on "input" (fn this.handleInput field)}}
        />
        <output id="field-value">{{field.value}}</output>
        {{#each field.errors as |error|}}
          <em class="error">{{error.message}}</em>
        {{/each}}
      </form.Field>

      <form.Subscribe
        @selector={{this.selectName}}
        @when={{this.whenPresent}}
        as |name|
      >
        <output id="selected">{{name}}</output>
      </form.Subscribe>
    </template>);

    assert.dom('#selected').doesNotExist();

    await fillIn('#name', 'Grace');
    assert.dom('#field-value').hasText('Grace');
    assert.dom('#selected').hasText('Grace');
    assert.dom('.error').doesNotExist();

    await fillIn('#name', '');
    assert.dom('.error').hasText('Name is required');

    form.reset({ name: 'Reset', email: 'reset@example.com' });
    await settled();
    assert.dom('#field-value').hasText('Reset', 'field rebinds after reset');
    assert.dom('#selected').hasText('Reset');

    destroy(owner);
  });
});
