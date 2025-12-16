/**
 * Joi Validation Schemas
 * Central location for all request/response validation schemas
 */

import * as Joi from 'joi';
import {
  isValidStreetAddress,
  isValidSuburb,
  isValidState,
  isValidCountry,
} from '../utils/validation';

/**
 * Schema for creating/storing a new address
 * Used for POST /v1/users/{userId}/addresses
 */
export const addressCreationSchema = Joi.object({
  streetAddress: Joi.string()
    .required()
    .min(1)
    .max(256)
    .custom((value, helpers) => {
      if (!isValidStreetAddress(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid':
        'streetAddress can only contain letters, numbers, spaces, hyphens, apostrophes, periods, commas, and # symbols',
    }),
  suburb: Joi.string()
    .required()
    .min(1)
    .max(128)
    .custom((value, helpers) => {
      if (!isValidSuburb(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'suburb can only contain letters, numbers, spaces, hyphens, apostrophes, and periods',
    }),
  state: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!isValidState(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'state must be a valid Australian state code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)',
    }),
  postcode: Joi.string()
    .required()
    .pattern(/^\d{4}$/),
  country: Joi.string()
    .default('Australia')
    .custom((value, helpers) => {
      if (!isValidCountry(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'country can only contain letters, numbers, spaces, hyphens, and apostrophes',
    }),
  addressType: Joi.string().valid('billing', 'mailing', 'residential', 'business').optional(),
});

/**
 * Schema for updating an existing address
 * Used for PATCH /v1/users/{userId}/addresses/{addressId}
 * All fields are optional
 */
export const addressUpdateSchema = Joi.object({
  streetAddress: Joi.string()
    .min(1)
    .max(256)
    .custom((value, helpers) => {
      if (!isValidStreetAddress(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid':
        'streetAddress can only contain letters, numbers, spaces, hyphens, apostrophes, periods, commas, and # symbols',
    })
    .optional(),
  suburb: Joi.string()
    .min(1)
    .max(128)
    .custom((value, helpers) => {
      if (!isValidSuburb(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'suburb can only contain letters, numbers, spaces, hyphens, apostrophes, and periods',
    })
    .optional(),
  state: Joi.string()
    .custom((value, helpers) => {
      if (!isValidState(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'state must be a valid Australian state code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)',
    })
    .optional(),
  postcode: Joi.string()
    .pattern(/^\d{4}$/)
    .optional(),
  country: Joi.string()
    .custom((value, helpers) => {
      if (!isValidCountry(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'country can only contain letters, numbers, spaces, hyphens, and apostrophes',
    })
    .optional(),
  addressType: Joi.string()
    .valid('billing', 'mailing', 'residential', 'business')
    .optional(),
}).min(1); // At least one field must be provided for update
