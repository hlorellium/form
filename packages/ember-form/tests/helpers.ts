import type { FieldValidators } from '@tanstack/form-core'

export interface Profile {
  name: string
  email: string
}

export function handleInput(
  field: { handleChange: (value: string) => void },
  event: Event,
): void {
  field.handleChange((event.target as HTMLInputElement).value)
}

export const selectName = (state: { values: Profile }): string =>
  state.values.name

export const whenPresent = (value: string): boolean => value.length > 0

export const required: FieldValidators<Profile, 'name', string> = [
  {
    triggers: ['change'],
    run: ({ value }: { value: string }) =>
      value.length === 0 ? 'Name is required' : undefined,
  },
]
