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

interface ArrayItem {
  label: string;
}

interface ArrayFormValues {
  items: Array<ArrayItem>;
}

const arrayOptions = formOptions({
  defaultValues: {
    items: [{ label: 'first' }, { label: 'second' }],
  } as ArrayFormValues,
});

type ArrayForm = EmberFormType<typeof arrayOptions>;

let arrayRenderCount = 0;

interface ArrayRenderProbeSignature {
  Args: { value: Array<ArrayItem> };
}

class ArrayRenderProbe extends Component<ArrayRenderProbeSignature> {
  get length(): number {
    arrayRenderCount++;
    return this.args.value.length;
  }

  <template><output id="array-length">{{this.length}}</output></template>
}

interface ArrayItemBindingSignature {
  Args: { form: ArrayForm; index: number };
}

class ArrayItemBinding extends Component<ArrayItemBindingSignature> {
  get name(): `items[${number}].label` {
    return `items[${this.args.index}].label`;
  }

  get outputId(): string {
    return `item-${this.args.index}`;
  }

  get blurId(): string {
    return `blur-${this.args.index}`;
  }

  <template>
    <this.args.form.Field @name={{this.name}} as |itemField|>
      <output id={{this.outputId}}>
        {{itemField.value}}|{{if itemField.meta.isTouched "touched" "untouched"}}
      </output>
      <button
        id={{this.blurId}}
        type="button"
        {{on "click" itemField.handleBlur}}
      >
        Blur
      </button>
    </this.args.form.Field>
  </template>
}

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

  test('binds array structure while nested fields retain core value and metadata association', async function (assert) {
    const owner = {};
    const defaults: ArrayFormValues = {
      items: [{ label: 'first' }, { label: 'second' }],
    };
    const form = createForm(owner, arrayOptions);
    arrayRenderCount = 0;

    await render(<template>
      <form.ArrayField @name="items" as |arrayField|>
        <ArrayRenderProbe @value={{arrayField.value}} />
        {{#each arrayField.value as |_item index|}}
          <ArrayItemBinding @form={{form}} @index={{index}} />
        {{/each}}
      </form.ArrayField>
    </template>);

    const initialArrayRenderCount = arrayRenderCount;
    form.setFieldValue('items[0].label', 'edited', {
      markAsDirty: false,
      markAsTouched: false,
    });
    await settled();
    assert.dom('#item-0').hasText('edited|untouched');
    assert.strictEqual(
      arrayRenderCount,
      initialArrayRenderCount,
      'an item edit does not invalidate array structure',
    );

    await click('#blur-0');
    const beforeMoveRenderCount = arrayRenderCount;
    form.moveFieldValue('items', 0, 1);
    await settled();
    assert.true(
      arrayRenderCount > beforeMoveRenderCount,
      'same-length movement invalidates array structure by version',
    );
    assert.dom('#item-0').hasText('second|untouched');
    assert.dom('#item-1').hasText('edited|touched');

    const beforeInsertRenderCount = arrayRenderCount;
    form.insertFieldValue('items', 0, { label: 'inserted' });
    await settled();
    assert.true(
      arrayRenderCount > beforeInsertRenderCount,
      'length changes invalidate array structure',
    );
    assert.dom('#item-0').hasText('inserted|untouched');
    assert.dom('#item-2').hasText('edited|touched');

    form.removeFieldValue('items', 1);
    await settled();
    assert.dom('#item-1').hasText('edited|touched');

    const beforeReplacementRenderCount = arrayRenderCount;
    form.setFieldValue('items', [
      { label: 'replacement-a' },
      { label: 'replacement-b' },
    ]);
    await settled();
    assert.true(
      arrayRenderCount > beforeReplacementRenderCount,
      'same-length replacement invalidates array structure by version',
    );
    assert.dom('#array-length').hasText('2');
    assert.dom('#item-0').hasText('replacement-a|untouched');
    assert.dom('#item-1').hasText('replacement-b|touched');

    form.reset(defaults);
    await settled();
    assert.dom('#item-0').hasText('first|untouched');
    assert.dom('#item-1').hasText('second|untouched');

    destroy(owner);
  });
});
