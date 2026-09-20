import Component from '@glimmer/component';
import { destroy } from '@ember/destroyable';
import { tracked } from '@glimmer/tracking';
import { click, fillIn, render, settled } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
  createForm,
  useSelector,
  type EmberFormType,
} from '@tanstack/ember-form';
import { formOptions } from '@tanstack/form-core';
import {
  handleInput,
  required,
  selectName,
  whenPresent,
  type Profile,
} from '../helpers.ts';

const reactiveOptions = formOptions({
  defaultValues: { name: 'Grace', email: 'ada@example.com' } as Profile,
});

type ReactiveForm = EmberFormType<typeof reactiveOptions>;

const selectEmail = (state: { values: Profile }) => state.values.email;

interface ReactiveBindingsSignature {
  Args: { form: ReactiveForm };
}

class ReactiveBindings extends Component<ReactiveBindingsSignature> {
  @tracked fieldName: 'name' | 'email' = 'name';
  @tracked selector = selectName;

  switchBindings = () => {
    this.fieldName = 'email';
    this.selector = selectEmail;
  };

  <template>
    <this.args.form.Field @name={{this.fieldName}} as |field|>
      <output id="dynamic-field">{{field.name}}:{{field.value}}</output>
    </this.args.form.Field>
    <this.args.form.Subscribe @selector={{this.selector}} as |selected|>
      <output id="dynamic-selection">{{selected}}</output>
    </this.args.form.Subscribe>
    <button id="switch" type="button" {{on "click" this.switchBindings}}>
      Switch
    </button>
  </template>
}

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

    await render(<template>
      <form.Field @name="name" @validators={{required}} as |field|>
        <input
          id="name"
          value={{field.value}}
          {{on "input" (fn handleInput field)}}
        />
        <output id="field-value">{{field.value}}</output>
        {{#each field.errors as |error|}}
          <em class="error">{{error.message}}</em>
        {{/each}}
      </form.Field>

      <form.Subscribe
        @selector={{selectName}}
        @when={{whenPresent}}
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

  test('rebinds fields and selectors when component arguments change', async function (assert) {
    const owner = {};
    const form = createForm(owner, reactiveOptions);

    await render(<template><ReactiveBindings @form={{form}} /></template>);
    assert.dom('#dynamic-field').hasText('name:Grace');
    assert.dom('#dynamic-selection').hasText('Grace');

    await click('#switch');
    assert.dom('#dynamic-field').hasText('email:ada@example.com');
    assert.dom('#dynamic-selection').hasText('ada@example.com');

    destroy(owner);
  });
});
