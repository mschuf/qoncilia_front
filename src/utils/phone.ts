const INTERNATIONAL_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const INTERNATIONAL_PHONE_PLACEHOLDER = "+595981123456";

export function isValidInternationalPhoneNumber(value: string): boolean {
  return INTERNATIONAL_PHONE_REGEX.test(value.trim());
}
