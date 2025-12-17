/**
 * Comprehensive unit tests for validation utility functions
 * Tests security-critical validation functions that prevent injection attacks
 */

import {
  isValidUserId,
  isValidAddressId,
  isValidStreetAddress,
  isValidSuburb,
  isValidState,
  isValidCountry,
} from '../../src/utils/validation';

describe('Validation Utilities', () => {
  describe('isValidUserId', () => {
    describe('Valid userIds', () => {
      it('should accept simple alphanumeric userId', () => {
        expect(isValidUserId('user123')).toBe(true);
      });

      it('should accept userId with hyphens', () => {
        expect(isValidUserId('user-123-abc')).toBe(true);
      });

      it('should accept userId with underscores', () => {
        expect(isValidUserId('user_123_abc')).toBe(true);
      });

      it('should accept userId with mixed hyphens and underscores', () => {
        expect(isValidUserId('user_123-abc_def')).toBe(true);
      });

      it('should accept single character userId', () => {
        expect(isValidUserId('a')).toBe(true);
      });

      it('should accept numeric userId', () => {
        expect(isValidUserId('123456')).toBe(true);
      });

      it('should accept maximum length userId (128 characters)', () => {
        expect(isValidUserId('a'.repeat(128))).toBe(true);
      });

      it('should accept userId with uppercase letters', () => {
        expect(isValidUserId('USER123')).toBe(true);
      });

      it('should accept userId with lowercase letters', () => {
        expect(isValidUserId('user123')).toBe(true);
      });

      it('should accept userId with mixed case', () => {
        expect(isValidUserId('User_123-Abc')).toBe(true);
      });
    });

    describe('Invalid userIds', () => {
      it('should reject empty userId', () => {
        expect(isValidUserId('')).toBe(false);
      });

      it('should reject userId exceeding 128 characters', () => {
        expect(isValidUserId('a'.repeat(129))).toBe(false);
      });

      it('should reject userId with space', () => {
        expect(isValidUserId('user 123')).toBe(false);
      });

      it('should reject userId with period', () => {
        expect(isValidUserId('user.123')).toBe(false);
      });

      it('should reject userId with @', () => {
        expect(isValidUserId('user@123')).toBe(false);
      });

      it('should reject userId with #', () => {
        expect(isValidUserId('user#123')).toBe(false);
      });

      it('should reject userId with $', () => {
        expect(isValidUserId('user$123')).toBe(false);
      });

      it('should reject userId with %', () => {
        expect(isValidUserId('user%123')).toBe(false);
      });

      it('should reject userId with &', () => {
        expect(isValidUserId('user&123')).toBe(false);
      });

      it('should reject userId with special characters', () => {
        expect(isValidUserId('user!@#$%')).toBe(false);
      });

      it('should reject userId with SQL injection attempt', () => {
        expect(isValidUserId("user'; DROP TABLE--")).toBe(false);
      });

      it('should reject userId with command injection attempt', () => {
        expect(isValidUserId('user; rm -rf /')).toBe(false);
      });

      it('should reject userId with path traversal attempt', () => {
        expect(isValidUserId('../../../etc/passwd')).toBe(false);
      });

      it('should reject userId with XML tags', () => {
        expect(isValidUserId('<script>alert("xss")</script>')).toBe(false);
      });

      it('should reject userId with Unicode characters', () => {
        expect(isValidUserId('user€123')).toBe(false);
      });

      it('should reject userId with emoji', () => {
        expect(isValidUserId('user😀123')).toBe(false);
      });

      it('should reject userId with tab character', () => {
        expect(isValidUserId('user\t123')).toBe(false);
      });

      it('should reject userId with newline', () => {
        expect(isValidUserId('user\n123')).toBe(false);
      });

      it('should reject userId with null byte', () => {
        expect(isValidUserId('user\x00123')).toBe(false);
      });
    });

    describe('Case sensitivity', () => {
      it('should accept uppercase userId', () => {
        expect(isValidUserId('USER123')).toBe(true);
      });

      it('should accept lowercase userId', () => {
        expect(isValidUserId('user123')).toBe(true);
      });

      it('should accept mixed case userId', () => {
        expect(isValidUserId('UsEr123')).toBe(true);
      });
    });
  });

  describe('isValidAddressId', () => {
    describe('Valid UUIDs', () => {
      it('should accept UUID v4', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should accept UUID v1', () => {
        expect(isValidAddressId('12345678-1234-1123-a100-000000000000')).toBe(true);
      });

      it('should accept UUID v3', () => {
        expect(isValidAddressId('a3bb6be7-52a2-30a0-a8b9-4b36edc72c0c')).toBe(true);
      });

      it('should accept UUID v5', () => {
        expect(isValidAddressId('886313e1-3b8a-5372-9b90-0c9aee199e5d')).toBe(true);
      });

      it('should accept UUID with uppercase letters', () => {
        expect(isValidAddressId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      });

      it('should accept UUID with mixed case', () => {
        expect(isValidAddressId('550e8400-E29b-41d4-A716-446655440000')).toBe(true);
      });

      it('should accept all variant bits (8, 9, a, b)', () => {
        const variants = ['550e8400-e29b-41d8-9100-000000000000', '550e8400-e29b-41d9-a100-000000000000', '550e8400-e29b-41da-b100-000000000000'];
        variants.forEach((uuid) => {
          expect(isValidAddressId(uuid)).toBe(true);
        });
      });
    });

    describe('Invalid UUIDs', () => {
      it('should reject empty string', () => {
        expect(isValidAddressId('')).toBe(false);
      });

      it('should reject UUID without hyphens', () => {
        expect(isValidAddressId('550e8400e29b41d4a716446655440000')).toBe(false);
      });

      it('should reject UUID with extra hyphens', () => {
        expect(isValidAddressId('550e8400--e29b-41d4-a716-446655440000')).toBe(false);
      });

      it('should reject UUID with wrong segment lengths', () => {
        expect(isValidAddressId('550e84-e29b-41d4-a716-446655440000')).toBe(false);
      });

      it('should reject UUID with non-hex characters', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
      });

      it('should reject UUID v6 (not supported)', () => {
        expect(isValidAddressId('12345678-1234-6123-a100-000000000000')).toBe(false);
      });

      it('should reject UUID v7 (not supported)', () => {
        expect(isValidAddressId('12345678-1234-7123-a100-000000000000')).toBe(false);
      });

      it('should reject UUID with invalid variant (c)', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-c100-000000000000')).toBe(false);
      });

      it('should reject UUID with invalid variant (d)', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-d100-000000000000')).toBe(false);
      });

      it('should reject UUID with invalid variant (e)', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-e100-000000000000')).toBe(false);
      });

      it('should reject UUID with invalid variant (f)', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-f100-000000000000')).toBe(false);
      });

      it('should reject partial UUID', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-a716')).toBe(false);
      });

      it('should reject UUID with spaces', () => {
        expect(isValidAddressId('550e8400-e29b-41d4-a716-446655440000 ')).toBe(false);
      });

      it('should reject SQL injection attempt', () => {
        expect(isValidAddressId("'; DROP TABLE--")).toBe(false);
      });

      it('should reject command injection attempt', () => {
        expect(isValidAddressId('$(whoami)')).toBe(false);
      });

      it('should reject XSS attempt', () => {
        expect(isValidAddressId('<script>alert("xss")</script>')).toBe(false);
      });
    });
  });

  describe('isValidStreetAddress', () => {
    describe('Valid street addresses', () => {
      it('should accept simple street address', () => {
        expect(isValidStreetAddress('123 Main Street')).toBe(true);
      });

      it('should accept street address with apostrophe', () => {
        expect(isValidStreetAddress("O'Connell Street")).toBe(true);
      });

      it('should accept street address with hyphen', () => {
        expect(isValidStreetAddress('123-A Main Street')).toBe(true);
      });

      it('should accept street address with comma', () => {
        expect(isValidStreetAddress('456 Smith, Lane')).toBe(true);
      });

      it('should accept street address with # for unit', () => {
        expect(isValidStreetAddress('#501 High Street')).toBe(true);
      });

      it('should accept street address with period', () => {
        expect(isValidStreetAddress("St. Mary's Court")).toBe(true);
      });

      it('should accept single character street address', () => {
        expect(isValidStreetAddress('A')).toBe(true);
      });

      it('should accept numeric street address', () => {
        expect(isValidStreetAddress('123')).toBe(true);
      });

      it('should accept street address with multiple spaces', () => {
        expect(isValidStreetAddress('123  Main  Street')).toBe(true);
      });

      it('should accept street address with all allowed special chars', () => {
        expect(isValidStreetAddress("123 Main St. - Unit #5 O'Brien, Ave.")).toBe(true);
      });
    });

    describe('Invalid street addresses', () => {
      it('should reject empty string', () => {
        expect(isValidStreetAddress('')).toBe(false);
      });

      it('should reject whitespace only', () => {
        expect(isValidStreetAddress('   ')).toBe(false);
      });

      it('should reject street address with @', () => {
        expect(isValidStreetAddress('123 Main@Street')).toBe(false);
      });

      it('should reject street address with $', () => {
        expect(isValidStreetAddress('123 Main$Street')).toBe(false);
      });

      it('should reject street address with %', () => {
        expect(isValidStreetAddress('123 Main%Street')).toBe(false);
      });

      it('should reject street address with &', () => {
        expect(isValidStreetAddress('123 Main&Street')).toBe(false);
      });

      it('should reject street address with special characters', () => {
        expect(isValidStreetAddress('123 Main!@#$%Street')).toBe(false);
      });

      it('should reject street address with SQL injection', () => {
        expect(isValidStreetAddress("123 Main'; DROP TABLE--")).toBe(false);
      });

      it('should reject street address with command injection', () => {
        expect(isValidStreetAddress('123 Main; rm -rf /')).toBe(false);
      });

      it('should reject street address with XSS attempt', () => {
        expect(isValidStreetAddress('<script>alert("xss")</script>')).toBe(false);
      });

      it('should reject street address with Unicode', () => {
        expect(isValidStreetAddress('123 Main €uro Street')).toBe(false);
      });

      it('should reject street address with emoji', () => {
        expect(isValidStreetAddress('123 Main 😀 Street')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should accept address that is only spaces then trimmed', () => {
        // Whitespace only should fail trim check
        expect(isValidStreetAddress('        ')).toBe(false);
      });
    });
  });

  describe('isValidSuburb', () => {
    describe('Valid suburbs', () => {
      it('should accept simple suburb name', () => {
        expect(isValidSuburb('Sydney')).toBe(true);
      });

      it('should accept suburb with spaces', () => {
        expect(isValidSuburb('South Sydney')).toBe(true);
      });

      it('should accept suburb with hyphen', () => {
        expect(isValidSuburb('Mount-Victoria')).toBe(true);
      });

      it('should accept suburb with apostrophe', () => {
        expect(isValidSuburb("St. Mary's")).toBe(true);
      });

      it('should accept suburb with period', () => {
        expect(isValidSuburb('St. Mary')).toBe(true);
      });

      it('should accept numeric suburb', () => {
        expect(isValidSuburb('123')).toBe(true);
      });

      it('should accept single character suburb', () => {
        expect(isValidSuburb('A')).toBe(true);
      });

      it('should accept mixed case suburb', () => {
        expect(isValidSuburb('Sydney Hills')).toBe(true);
      });
    });

    describe('Invalid suburbs', () => {
      it('should reject empty suburb', () => {
        expect(isValidSuburb('')).toBe(false);
      });

      it('should reject whitespace only suburb', () => {
        expect(isValidSuburb('   ')).toBe(false);
      });

      it('should reject suburb with @', () => {
        expect(isValidSuburb('Sydney@')).toBe(false);
      });

      it('should reject suburb with #', () => {
        expect(isValidSuburb('Sydney#')).toBe(false);
      });

      it('should reject suburb with $', () => {
        expect(isValidSuburb('Sydney$')).toBe(false);
      });

      it('should reject suburb with %', () => {
        expect(isValidSuburb('Sydney%')).toBe(false);
      });

      it('should reject suburb with special characters', () => {
        expect(isValidSuburb('Sydney!@#$%')).toBe(false);
      });

      it('should reject suburb with SQL injection', () => {
        expect(isValidSuburb("Sydney'; DROP TABLE--")).toBe(false);
      });

      it('should reject suburb with command injection', () => {
        expect(isValidSuburb('Sydney; rm -rf /')).toBe(false);
      });

      it('should reject suburb with XSS attempt', () => {
        expect(isValidSuburb('<script>alert("xss")</script>')).toBe(false);
      });

      it('should reject suburb with Unicode', () => {
        expect(isValidSuburb('Sydnëy')).toBe(false);
      });

      it('should reject suburb with emoji', () => {
        expect(isValidSuburb('Sydney 😀')).toBe(false);
      });
    });
  });

  describe('isValidState', () => {
    describe('Valid states', () => {
      it('should accept NSW', () => {
        expect(isValidState('NSW')).toBe(true);
      });

      it('should accept VIC', () => {
        expect(isValidState('VIC')).toBe(true);
      });

      it('should accept QLD', () => {
        expect(isValidState('QLD')).toBe(true);
      });

      it('should accept WA', () => {
        expect(isValidState('WA')).toBe(true);
      });

      it('should accept SA', () => {
        expect(isValidState('SA')).toBe(true);
      });

      it('should accept TAS', () => {
        expect(isValidState('TAS')).toBe(true);
      });

      it('should accept ACT', () => {
        expect(isValidState('ACT')).toBe(true);
      });

      it('should accept NT', () => {
        expect(isValidState('NT')).toBe(true);
      });

      it('should accept lowercase state and convert to uppercase', () => {
        expect(isValidState('nsw')).toBe(true);
      });

      it('should accept mixed case state', () => {
        expect(isValidState('NsW')).toBe(true);
      });
    });

    describe('Invalid states', () => {
      it('should reject empty string', () => {
        expect(isValidState('')).toBe(false);
      });

      it('should reject invalid state code', () => {
        expect(isValidState('XX')).toBe(false);
      });

      it('should reject US state', () => {
        expect(isValidState('CA')).toBe(false);
      });

      it('should reject UK region', () => {
        expect(isValidState('LON')).toBe(false);
      });

      it('should reject state with number', () => {
        expect(isValidState('NSW1')).toBe(false);
      });

      it('should reject SQL injection attempt', () => {
        expect(isValidState("NSW'; DROP TABLE--")).toBe(false);
      });

      it('should reject special characters', () => {
        expect(isValidState('NSW@')).toBe(false);
      });
    });
  });

  describe('isValidCountry', () => {
    describe('Valid countries', () => {
      it('should accept Australia', () => {
        expect(isValidCountry('Australia')).toBe(true);
      });

      it('should accept USA', () => {
        expect(isValidCountry('USA')).toBe(true);
      });

      it('should accept United Kingdom', () => {
        expect(isValidCountry('United Kingdom')).toBe(true);
      });

      it('should accept country with spaces', () => {
        expect(isValidCountry('New Zealand')).toBe(true);
      });

      it('should accept country with hyphen', () => {
        expect(isValidCountry('Czech-Republic')).toBe(true);
      });

      it('should accept country with apostrophe', () => {
        expect(isValidCountry("Cote d'Ivoire")).toBe(true);
      });

      it('should accept numeric country', () => {
        expect(isValidCountry('123')).toBe(true);
      });

      it('should accept single character', () => {
        expect(isValidCountry('A')).toBe(true);
      });

      // NOTE: Length validation is handled by Joi schema (min(1).max(128)), not by this validator
      it('should accept very long country name (length checked by schema)', () => {
        expect(isValidCountry('A'.repeat(200))).toBe(true);
      });
    });

    describe('Invalid countries', () => {
      it('should reject empty string', () => {
        expect(isValidCountry('')).toBe(false);
      });

      it('should reject whitespace only', () => {
        expect(isValidCountry('   ')).toBe(false);
      });

      it('should reject country with special characters', () => {
        expect(isValidCountry('Australia!@#$%')).toBe(false);
      });

      it('should reject country with SQL injection', () => {
        expect(isValidCountry("Australia'; DROP TABLE--")).toBe(false);
      });

      it('should reject country with command injection', () => {
        expect(isValidCountry('Australia; rm -rf /')).toBe(false);
      });

      it('should reject country with angle brackets', () => {
        expect(isValidCountry('Australia<script>')).toBe(false);
      });

      it('should reject country with Unicode', () => {
        expect(isValidCountry('Australïa')).toBe(false);
      });

      it('should reject country with emoji', () => {
        expect(isValidCountry('Australia 🇦🇺')).toBe(false);
      });

      it('should reject country with backtick', () => {
        expect(isValidCountry('Australia`Fake')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle mixed case', () => {
        expect(isValidCountry('AuStRaLiA')).toBe(true);
      });

      it('should reject null byte injection', () => {
        expect(isValidCountry('Australia\x00Fake')).toBe(false);
      });
    });
  });

  describe('Security Tests - Injection Prevention', () => {
    describe('SQL Injection attempts', () => {
      it('should reject SQL injection in userId', () => {
        expect(isValidUserId("user'; DROP TABLE users--")).toBe(false);
      });

      it('should reject SQL UNION injection in street address', () => {
        expect(isValidStreetAddress("123 Main' UNION SELECT * FROM--")).toBe(false);
      });

      it('should reject OR 1=1 injection in suburb', () => {
        expect(isValidSuburb("'; OR '1'='1")).toBe(false);
      });

      it('should reject SQL injection with semicolon in country', () => {
        expect(isValidCountry("Australia; DROP TABLE")).toBe(false);
      });
    });

    describe('Command Injection attempts', () => {
      it('should reject shell command in userId', () => {
        expect(isValidUserId('; rm -rf /')).toBe(false);
      });

      it('should reject backtick command in street address', () => {
        expect(isValidStreetAddress('123 `whoami`')).toBe(false);
      });

      it('should reject subshell in suburb', () => {
        expect(isValidSuburb('$(whoami)')).toBe(false);
      });
    });

    describe('XSS Prevention', () => {
      it('should reject script tag in street address', () => {
        expect(isValidStreetAddress('<script>alert("xss")</script>')).toBe(false);
      });

      it('should reject event handler in suburb', () => {
        expect(isValidSuburb('onload="alert(1)"')).toBe(false);
      });

      it('should reject SVG vector in country', () => {
        expect(isValidCountry('<svg onload="alert(1)">')).toBe(false);
      });
    });

    describe('Path Traversal attempts', () => {
      it('should reject path traversal in userId', () => {
        expect(isValidUserId('../../../etc/passwd')).toBe(false);
      });

      it('should reject backslash path in street address', () => {
        expect(isValidStreetAddress('..\\..\\..\\windows\\system32')).toBe(false);
      });
    });
  });

  describe('Unicode and International Character Handling', () => {
    it('should reject accented characters in userId', () => {
      expect(isValidUserId('usér')).toBe(false);
    });

    it('should reject accented characters in street address', () => {
      expect(isValidStreetAddress('123 Rue François')).toBe(false);
    });

    it('should reject emoji across all validators', () => {
      expect(isValidUserId('user😀')).toBe(false);
      expect(isValidStreetAddress('123 Main 😀')).toBe(false);
      expect(isValidSuburb('Sydney 😀')).toBe(false);
      expect(isValidCountry('Australia 😀')).toBe(false);
    });

    it('should reject right-to-left Unicode', () => {
      expect(isValidCountry('Australia‏')).toBe(false);
    });

    it('should reject zero-width characters', () => {
      expect(isValidUserId('user\u200Bname')).toBe(false);
    });
  });

  describe('Whitespace Handling', () => {
    it('should reject userId with leading space', () => {
      expect(isValidUserId(' user123')).toBe(false);
    });

    it('should reject userId with trailing space', () => {
      expect(isValidUserId('user123 ')).toBe(false);
    });

    it('should reject suburb that is only whitespace', () => {
      expect(isValidSuburb('   ')).toBe(false);
    });

    it('should accept street address with internal spaces', () => {
      expect(isValidStreetAddress('123 Main Street')).toBe(true);
    });
  });
});
