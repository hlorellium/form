import { registerDestructor } from '@ember/destroyable'
import { InternalFormApi } from '@tanstack/form-core/internals'
import ArrayField from '../components/array-field.gts'
import Field from '../components/field.gts'
import Subscribe from '../components/subscribe.gts'

import type { FormOptions } from '@tanstack/form-core'
import type { AnyInternalFormApi } from '@tanstack/form-core/internals'
import type { EmberTanStackFormComponents } from '../form-api-types.ts'

export interface InternalEmberFormApi
  extends AnyInternalFormApi, EmberTanStackFormComponents<any, any, any> {}

export function attachEmberFormComponents(
  form: AnyInternalFormApi,
): InternalEmberFormApi {
  const emberForm = form as InternalEmberFormApi

  emberForm.Field = class BoundField extends Field {
    override get form(): AnyInternalFormApi {
      return form
    }
  } as never

  emberForm.ArrayField = class BoundArrayField extends ArrayField {
    override get form(): AnyInternalFormApi {
      return form
    }
  } as never

  emberForm.Subscribe = class BoundSubscribe extends Subscribe {
    override get source() {
      return form.atom
    }
  } as never

  return emberForm
}

export function initializeForm(
  options: FormOptions<any, any, any, unknown>,
): InternalEmberFormApi {
  return attachEmberFormComponents(new InternalFormApi(options))
}

export function createInternalForm(
  parent: object,
  options: FormOptions<any, any, any, unknown>,
  initialize: (
    options: FormOptions<any, any, any, unknown>,
  ) => InternalEmberFormApi,
): InternalEmberFormApi {
  const form = initialize(options)
  const unmount = form.mount()
  registerDestructor(parent, unmount)
  return form
}
