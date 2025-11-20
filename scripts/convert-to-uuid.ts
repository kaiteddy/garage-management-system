import { createHash } from 'crypto';

/**
 * Converts a string to a valid UUID v5 (SHA-1 based)
 * This ensures consistent UUIDs for the same input string
 */
export function stringToUuid(str: string): string {
  // Use a namespace UUID (version 5 DNS)
  const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  
  // Convert the string to a buffer
  const data = Buffer.from(str, 'utf8');
  const namespace = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  
  // Create a buffer with namespace + input string
  const hash = createHash('sha1');
  hash.update(namespace);
  hash.update(data);
  const digest = hash.digest();
  
  // Set version (5) and variant (2) bits
  digest[6] = (digest[6] & 0x0f) | 0x50; // version 5
  digest[8] = (digest[8] & 0x3f) | 0x80; // variant 2
  
  // Format as UUID string
  return [
    digest.toString('hex', 0, 4),
    digest.toString('hex', 4, 6),
    digest.toString('hex', 6, 8),
    digest.toString('hex', 8, 10),
    digest.toString('hex', 10, 16)
  ].join('-');
}

// Example usage:
// const uuid = stringToUuid('GZLM884LRLRJOIQC74JTT8');
// console.log(uuid);
