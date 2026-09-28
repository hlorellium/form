import { trackStore } from './track-store.ts'
import ArrayField from '../components/array-field.gts'
import Field from '../components/field.gts'
import FormGroup from '../components/form-group.gts'
import Subscribe from '../components/subscribe.gts'

import type { EmberFormApi } from '../types.ts'
import type { AnyFormApi } from '@tanstack/form-core'

export type AnyEmberFormApi = EmberFormApi<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

type Constructor = new (...args: any[]) => object

/**
 * Returns `Base` with `form` set to the result of `read`.
 *
 * The `FieldComponent`, `ArrayFieldComponent`, `SubscribeComponent`,
 * and `FormGroupComponent` types give each invocation its generics.
 */
function bindForm<TBase extends Constructor>(
  Base: TBase,
  read: () => AnyFormApi,
): TBase {
  return class extends Base {
    get form() {
      return read()
    }
  }
}

/**
 * Builds what the adapter adds to a `FormApi`:
 * the components with `@form` already set, and `useSelector`.
 *
 * `read` returns the api after it applied the current options.
 * The components and `useSelector` call it when they are read,
 * so options that read tracked state stay current.
 *
 * The store subscription ends when `parent` is destroyed.
 */
export function extendForm(
  api: AnyFormApi,
  parent: object,
  read: () => AnyFormApi,
): AnyEmberFormApi {
  const state = trackStore(api.store, parent)

  return {
    Field: bindForm(Field, read) as never,
    ArrayField: bindForm(ArrayField, read) as never,
    Subscribe: bindForm(Subscribe, read) as never,
    FormGroup: bindForm(FormGroup, read) as never,

    useSelector: ((selector?: (state: typeof api.state) => unknown) => ({
      get current() {
        read()

        return selector ? selector(state) : state
      },
    })) as AnyEmberFormApi['useSelector'],
  }
}
