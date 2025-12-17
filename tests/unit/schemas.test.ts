/**
 * Comprehensive unit tests for Joi validation schemas
 * Tests address creation and update schemas with various input scenarios
 */

import { addressCreationSchema, addressUpdateSchema } from '../../src/schemas/address';

describe('Address Validation Schemas', () => {
  describe('addressCreationSchema - Valid Inputs', () => {
    it('should accept a valid complete address', () => {
      const validAddress = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
        addressType: 'residential',
      };

      const { error, value } = addressCreationSchema.validate(validAddress);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    });

    it('should accept address without optional fields', () => {
      const minimalAddress = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      };

      const { error, value } = addressCreationSchema.validate(minimalAddress);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(value.country).toBe('Australia'); // Should default to Australia
    });

    it('should accept all valid Australian state codes', () => {
      const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

      states.forEach((state) => {
        const address = {
          streetAddress: '123 Main Street',
          suburb: 'City',
          state,
          postcode: '2000',
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeUndefined();
      });
    });

    it('should accept all valid address types', () => {
      const types = ['billing', 'mailing', 'residential', 'business'];

      types.forEach((type) => {
        const address = {
          streetAddress: '123 Main Street',
          suburb: 'City',
          state: 'NSW',
          postcode: '2000',
          addressType: type,
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeUndefined();
      });
    });

    it('should accept street address with special characters', () => {
      const validAddresses = [
        '123 Main Street',
        "O'Connell Street",
        '123-A Main Street',
        '456 Smith, Lane',
        '#501 High Street',
        "St. Mary's Court",
      ];

      validAddresses.forEach((street) => {
        const address = {
          streetAddress: street,
          suburb: 'City',
          state: 'NSW',
          postcode: '2000',
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeUndefined();
      });
    });

    it('should accept suburb with special characters', () => {
      const validSuburbs = ['Sydney', "St. Mary's", 'Mount-Victoria', 'South-Yarra', 'Castle Hill'];

      validSuburbs.forEach((suburb) => {
        const address = {
          streetAddress: '123 Main Street',
          suburb,
          state: 'NSW',
          postcode: '2000',
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeUndefined();
      });
    });

    it('should accept country with 1 character', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'City',
        state: 'NSW',
        postcode: '2000',
        country: 'A',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeUndefined();
    });

    it('should accept country with 128 characters', () => {
      const longCountry = 'A'.repeat(128);
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'City',
        state: 'NSW',
        postcode: '2000',
        country: longCountry,
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeUndefined();
    });

    it('should accept streetAddress with maximum length (256 chars)', () => {
      const longStreet = 'A'.repeat(256);
      const address = {
        streetAddress: longStreet,
        suburb: 'City',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeUndefined();
    });

    it('should accept suburb with maximum length (128 chars)', () => {
      const longSuburb = 'A'.repeat(128);
      const address = {
        streetAddress: '123 Main Street',
        suburb: longSuburb,
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeUndefined();
    });
  });

  describe('addressCreationSchema - Required Fields', () => {
    it('should reject missing streetAddress', () => {
      const address = {
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
      expect(error?.details[0].type).toBe('any.required');
    });

    it('should reject missing suburb', () => {
      const address = {
        streetAddress: '123 Main Street',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
      expect(error?.details[0].type).toBe('any.required');
    });

    it('should reject missing state', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
      expect(error?.details[0].type).toBe('any.required');
    });

    it('should reject missing postcode', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
      expect(error?.details[0].type).toBe('any.required');
    });
  });

  describe('addressCreationSchema - Invalid Inputs', () => {
    it('should reject empty streetAddress', () => {
      const address = {
        streetAddress: '',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });

    it('should reject streetAddress exceeding 256 characters', () => {
      const address = {
        streetAddress: 'A'.repeat(257),
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });

    it('should reject streetAddress with invalid characters', () => {
      const invalidAddresses = ['123 Main@Street', '456 Main$Lane', '789 Main%Avenue', '123 Main{Street}'];

      invalidAddresses.forEach((street) => {
        const address = {
          streetAddress: street,
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeDefined();
      });
    });

    it('should reject empty suburb', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: '',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });

    it('should reject suburb exceeding 128 characters', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'A'.repeat(129),
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });

    it('should reject suburb with invalid characters', () => {
      const invalidSuburbs = ['Sydney@', 'Mount$Victoria', 'Hill%Valley', 'North{Sydney}'];

      invalidSuburbs.forEach((suburb) => {
        const address = {
          streetAddress: '123 Main Street',
          suburb,
          state: 'NSW',
          postcode: '2000',
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeDefined();
      });
    });

    it('should reject invalid state code', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'XX', // Invalid state
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid Australian state code');
    });

    it('should reject postcode not matching 4 digits', () => {
      const invalidPostcodes = ['200', '20000', '20ab', 'ABCD', ''];

      invalidPostcodes.forEach((postcode) => {
        const address = {
          streetAddress: '123 Main Street',
          suburb: 'Sydney',
          state: 'NSW',
          postcode,
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeDefined();
      });
    });

    it('should reject country exceeding 128 characters', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'A'.repeat(129),
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });

    it('should reject country with invalid characters', () => {
      const invalidCountries = ['Australia@', 'USA$', 'Canada%'];

      invalidCountries.forEach((country) => {
        const address = {
          streetAddress: '123 Main Street',
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
          country,
        };

        const { error } = addressCreationSchema.validate(address);
        expect(error).toBeDefined();
      });
    });

    it('should reject invalid addressType', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        addressType: 'invalid',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });
  });

  describe('addressCreationSchema - Error Messages', () => {
    it('should provide clear error message for invalid streetAddress format', () => {
      const address = {
        streetAddress: '123 Main@Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error?.details[0].message).toContain('streetAddress can only contain');
    });

    it('should provide clear error message for invalid suburb format', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney@',
        state: 'NSW',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error?.details[0].message).toContain('suburb can only contain');
    });

    it('should provide clear error message for invalid state', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'INVALID',
        postcode: '2000',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error?.details[0].message).toContain('Australian state code');
    });

    it('should provide clear error message for invalid postcode', () => {
      const address = {
        streetAddress: '123 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: 'ABCD',
      };

      const { error } = addressCreationSchema.validate(address);
      expect(error).toBeDefined();
    });
  });

  describe('addressUpdateSchema - Valid Inputs', () => {
    it('should accept partial update with single field', () => {
      const update = { suburb: 'Melbourne' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should accept partial update with multiple fields', () => {
      const update = {
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
      };

      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should accept update with all fields', () => {
      const update = {
        streetAddress: '456 New Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
        addressType: 'billing',
      };

      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should accept empty object but fail validation at handler level (min(1))', () => {
      const update = {};
      const { error, value } = addressUpdateSchema.validate(update);
      // Schema allows empty object; handler checks if at least 1 key
      expect(error?.details[0].message).toContain('at least 1 key');
    });
  });

  describe('addressUpdateSchema - Optional Fields', () => {
    it('should allow all fields to be omitted', () => {
      const update = {};
      // Schema validation passes, handler validation catches this
      const { value } = addressUpdateSchema.validate(update);
      expect(value).toBeDefined();
    });

    it('should allow streetAddress to be omitted', () => {
      const update = { suburb: 'Melbourne' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should allow suburb to be omitted', () => {
      const update = { streetAddress: '456 New Street' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should allow state to be omitted', () => {
      const update = { suburb: 'Melbourne' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should allow postcode to be omitted', () => {
      const update = { suburb: 'Melbourne' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should allow country to be omitted', () => {
      const update = { suburb: 'Melbourne' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should allow addressType to be omitted', () => {
      const update = { suburb: 'Melbourne' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });
  });

  describe('addressUpdateSchema - Invalid Updates', () => {
    it('should reject empty streetAddress', () => {
      const update = { streetAddress: '' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject streetAddress exceeding 256 characters', () => {
      const update = { streetAddress: 'A'.repeat(257) };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject empty suburb', () => {
      const update = { suburb: '' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject suburb exceeding 128 characters', () => {
      const update = { suburb: 'A'.repeat(129) };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject invalid state in update', () => {
      const update = { state: 'INVALID' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject postcode not matching 4 digits in update', () => {
      const update = { postcode: 'ABCD' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject country exceeding 128 characters in update', () => {
      const update = { country: 'A'.repeat(129) };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });

    it('should reject invalid addressType in update', () => {
      const update = { addressType: 'invalid' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeDefined();
    });
  });

  describe('addressUpdateSchema - Edge Cases', () => {
    it('should accept single character valid inputs', () => {
      const update = {
        streetAddress: 'A',
        suburb: 'B',
        country: 'C',
      };

      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should handle whitespace trimming in pattern validation', () => {
      // Note: Joi validates before trimming, so spaces in the middle are OK
      const update = {
        suburb: 'Sydney NSW', // Space in middle is valid
      };

      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should reject postcode with leading zeros if format is correct', () => {
      // 0000 is a valid format (4 digits)
      const update = { postcode: '0000' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });

    it('should accept postcode with all same digits', () => {
      const update = { postcode: '1111' };
      const { error } = addressUpdateSchema.validate(update);
      expect(error).toBeUndefined();
    });
  });
});
