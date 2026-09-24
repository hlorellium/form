import { registerDestructor } from '@ember/destroyable'
import { InternalFormApi } from '@tanstack/form-core/internals'
import ArrayField from '../components/array-field.gts'
import Field, { type EmberFormWithFieldLenses } from '../components/field.gts'
import FormGroup from '../components/form-group.gts'
import Subscribe from '../components/subscribe.gts'
import {
  adaptFormOptions,
  CallbackViewRegistry,
  EmberFormHandle,
} from './ember-bindings.ts'
import { ReactiveOptions } from './reactive-options.ts'

import type { FormOptions } from '@tanstack/form-core'
import type { AnyInternalFormApi } from '@tanstack/form-core/internals'
import type { EmberTanStackFormComponents } from '../form-api-types.ts'

export interface InternalEmberFormApi
  extends AnyInternalFormApi, EmberTanStackFormComponents<any, any, any> {}

export function attachEmberFormComponents(
  form: AnyInternalFormApi,
  publicForm: AnyInternalFormApi = form,
): InternalEmberFormApi {
  const emberForm = form as InternalEmberFormApi

  emberForm.Field = class BoundField extends Field {
    override get form(): EmberFormWithFieldLenses {
      return publicForm as EmberFormWithFieldLenses
    }
  } as never

  emberForm.ArrayField = class BoundArrayField extends ArrayField {
    override get form(): EmberFormWithFieldLenses {
      return publicForm as EmberFormWithFieldLenses
    }
  } as never

  emberForm.Subscribe = class BoundSubscribe extends Subscribe {
    override get source() {
      return form.atom
    }
  } as never

  emberForm.FormGroup = class BoundFormGroup extends FormGroup {
    override get form(): AnyInternalFormApi {
      return publicForm
    }
  } as never

  return emberForm
}

export function initializeForm(
  options: FormOptions<any, any, any, unknown>,
): InternalEmberFormApi {
  return new InternalFormApi(options) as InternalEmberFormApi
}

export function createInternalForm(
  parent: object,
  options:
    | FormOptions<any, any, any, unknown>
    | (() => FormOptions<any, any, any, unknown>),
  initialize: (
    options: FormOptions<any, any, any, unknown>,
  ) => InternalEmberFormApi,
): InternalEmberFormApi {
  const reactive =
    typeof options === 'function' ? new ReactiveOptions(options) : undefined
  const initialOptions = typeof options === 'function' ? reactive!.value : options
  let handle: EmberFormHandle | undefined
  const callbackViews = new CallbackViewRegistry()
  const resolveHandle = (() => handle) as (() => EmberFormHandle | undefined) & {
    callbackViews?: CallbackViewRegistry
  }
  resolveHandle.callbackViews = callbackViews
  const core = initialize(
    adaptFormOptions(initialOptions as never, resolveHandle) as never,
  )
  handle = new EmberFormHandle(parent, core, callbackViews)
  callbackViews.setHandle(handle)
  attachEmberFormComponents(
    core,
    handle.public as unknown as AnyInternalFormApi,
  )
  const stop = reactive?.subscribe(parent, (next) =>
    core._update(adaptFormOptions(next as never, resolveHandle) as never),
  )
  let unmount: () => void
  try {
    unmount = core.mount()
  } catch (error) {
    stop?.()
    handle.destroy()
    throw error
  }
  registerDestructor(parent, () => {
    stop?.()
    unmount()
  })
  return handle.public as unknown as InternalEmberFormApi
}
