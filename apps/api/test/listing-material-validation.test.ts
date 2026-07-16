import { BadRequestException } from '@nestjs/common';
import { ListingMaterialType } from '@soyre/database';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type CommercialMaterialFile,
  validateCommercialMaterialSource,
} from '../src/operations/listing-materials.service.js';

function file(mimetype: string, buffer: Buffer): CommercialMaterialFile {
  return {
    buffer,
    mimetype,
    originalname: 'material.bin',
    size: buffer.length,
  };
}

describe('listing material validation', () => {
  it('accepts an HTTPS video link without a binary', () => {
    assert.deepEqual(
      validateCommercialMaterialSource(
        ListingMaterialType.VIDEO_LINK,
        'https://video.example.test/watch/123',
      ),
      {
        externalUrl: 'https://video.example.test/watch/123',
        fileSize: null,
        mimeType: null,
      },
    );
  });

  it('rejects insecure links and mixed video sources', () => {
    assert.throws(
      () =>
        validateCommercialMaterialSource(
          ListingMaterialType.VIDEO_LINK,
          'http://video.example.test/watch/123',
        ),
      BadRequestException,
    );
    assert.throws(
      () =>
        validateCommercialMaterialSource(
          ListingMaterialType.VIDEO_LINK,
          'https://video.example.test/watch/123',
          file('image/jpeg', Buffer.from([0xff, 0xd8, 0xff])),
        ),
      BadRequestException,
    );
  });

  it('accepts image signatures and rejects MIME spoofing', () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    assert.deepEqual(
      validateCommercialMaterialSource(
        ListingMaterialType.COVER_IMAGE,
        undefined,
        file('image/png', png),
      ),
      { externalUrl: null, fileSize: png.length, mimeType: 'image/png' },
    );
    assert.throws(
      () =>
        validateCommercialMaterialSource(
          ListingMaterialType.COVER_IMAGE,
          undefined,
          file('image/png', Buffer.from('not a png')),
        ),
      BadRequestException,
    );
  });

  it('rejects PDFs as cover images but accepts them as floor plans', () => {
    const pdf = Buffer.from('%PDF-1.7');
    assert.throws(
      () =>
        validateCommercialMaterialSource(
          ListingMaterialType.COVER_IMAGE,
          undefined,
          file('application/pdf', pdf),
        ),
      BadRequestException,
    );
    assert.equal(
      validateCommercialMaterialSource(
        ListingMaterialType.FLOOR_PLAN,
        undefined,
        file('application/pdf', pdf),
      ).mimeType,
      'application/pdf',
    );
  });

  it('rejects empty and oversized binaries', () => {
    assert.throws(
      () =>
        validateCommercialMaterialSource(
          ListingMaterialType.OTHER,
          undefined,
          file('application/pdf', Buffer.alloc(0)),
        ),
      BadRequestException,
    );
    const oversized = file(
      'application/pdf',
      Buffer.from('%PDF-oversized-test'),
    );
    oversized.size = 15 * 1024 * 1024 + 1;
    assert.throws(
      () =>
        validateCommercialMaterialSource(
          ListingMaterialType.OTHER,
          undefined,
          oversized,
        ),
      BadRequestException,
    );
  });
});
