/**
 * Validation utilities for request parameters
 */

/**
 * Validates userId to prevent injection attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 * Length: minimum 1 character, maximum 128 characters
 * @param userId The userId to validate
 * @returns true if valid, false otherwise
 */
export const isValidUserId = (userId: string): boolean => {
  // Check length constraints: minimum 1, maximum 128 characters
  const MIN_LENGTH = 1;
  const MAX_LENGTH = 128;
  
  if (userId.length < MIN_LENGTH || userId.length > MAX_LENGTH) {
    return false;
  }
  
  // Only allow alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), and underscores (_)
  const userIdPattern = /^[a-zA-Z0-9_-]+$/;
  return userIdPattern.test(userId);
};

/**
 * Validates addressId (UUID format)
 * Accepts all UUID versions (v1, v3, v4, v5)
 * Format: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx where M is version (1-5) and N is variant (8-b)
 * @param addressId The addressId to validate
 * @returns true if valid UUID, false otherwise
 */
export const isValidAddressId = (addressId: string): boolean => {
  // Accepts all UUID versions: v1, v3, v4, v5
  // Format: 8-4-4-4-12 hex digits with version in 3rd group (1-5) and variant in 4th group (8-b)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

/**
 * Validates Australian postcode format
 * Valid format: 4 digits (0000-9999)
 * @param postcode The postcode to validate
 * @returns true if valid, false otherwise
 */
export const isValidPostcode = (postcode: string): boolean => {
  // Australian postcodes are exactly 4 digits
  const postcodePattern = /^\d{4}$/;
  return postcodePattern.test(postcode);
};