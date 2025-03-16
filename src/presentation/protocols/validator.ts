export interface Validator<T> {
  // When the input is valid (of type T), returns null
  validate<S extends T>(input: S): null;

  // When the input is invalid or undefined, returns an Error
  validate(input?: any): Error;
}
