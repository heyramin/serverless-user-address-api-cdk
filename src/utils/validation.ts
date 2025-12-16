/**
 * Validation utilities for request parameters
 */

/**
 * Validates userId to prevent injection attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 * @param userId The userId to validate
 * @returns true if valid, false otherwise
 */
export const isValidUserId = (userId: string): boolean => {
  // Only allow alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), and underscores (_)
  const userIdPattern = /^[a-zA-Z0-9_-]+$/;
  return userIdPattern.test(userId);
};

/**
 * Validates addressId (UUID format)
 * @param addressId The addressId to validate
 * @returns true if valid UUID, false otherwise
 */
export const isValidAddressId = (addressId: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(addressId);
};

/**
 * Validates street address format
 * Allows alphanumeric, spaces, hyphens, apostrophes, periods, commas, and # (for unit numbers)
 * @param streetAddress The street address to validate
 * @returns true if valid, false otherwise
 */
export const isValidStreetAddress = (streetAddress: string): boolean => {
  // Allow: alphanumeric, spaces, hyphens, apostrophes, periods, commas, # for unit/apartment numbers
  const streetPattern = /^[a-zA-Z0-9\s\-'.,#]+$/;
  return streetPattern.test(streetAddress) && streetAddress.trim().length > 0;
};

/**
 * Validates suburb/city name format
 * Allows alphanumeric, spaces, hyphens, apostrophes, and periods
 * @param suburb The suburb name to validate
 * @returns true if valid, false otherwise
 */
export const isValidSuburb = (suburb: string): boolean => {
  // Allow: alphanumeric, spaces, hyphens, apostrophes, periods
  const suburbPattern = /^[a-zA-Z0-9\s\-'.]+$/;
  return suburbPattern.test(suburb) && suburb.trim().length > 0;
};

/**
 * Validates Australian state/territory codes
 * Valid codes: NSW, VIC, QLD, WA, SA, TAS, ACT, NT
 * @param state The state code to validate
 * @returns true if valid, false otherwise
 */
export const isValidState = (state: string): boolean => {
  const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
  return validStates.includes(state.toUpperCase());
};

/**
 * Validates country name format
 * Allows alphanumeric, spaces, hyphens, and apostrophes
 * @param country The country name to validate
 * @returns true if valid, false otherwise
 */
export const isValidCountry = (country: string): boolean => {
  // Allow: alphanumeric, spaces, hyphens, apostrophes
  const countryPattern = /^[a-zA-Z0-9\s\-']+$/;
  return countryPattern.test(country) && country.trim().length > 0;
};
