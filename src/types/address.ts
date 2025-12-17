/**
 * Address Domain Model
 * Central location for all address-related type definitions
 */

/**
 * Address domain model representing a user's address record
 */
export interface Address {
  userId: string;
  addressId: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  addressType?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input data for creating/updating addresses
 * (subset of Address that can be provided by users)
 */
export interface AddressInput {
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  country?: string;
  addressType?: string;
}

/**
 * Address creation request
 */
export interface CreateAddressRequest extends AddressInput {
  userId: string;
}

/**
 * Address update request
 * All fields are optional for PATCH operations
 */
export interface UpdateAddressRequest {
  streetAddress?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  addressType?: string;
}

/**
 * API response for single address
 */
export interface AddressResponse {
  message: string;
  addressId: string;
  address: Address;
}

/**
 * API response for address list
 */
export interface AddressListResponse {
  message: string;
  addresses: Address[];
}

/**
 * Error response
 */
export interface ErrorResponse {
  message: string;
  error?: string;
  details?: string[];
}
