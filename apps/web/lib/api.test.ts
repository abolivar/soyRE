import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveApiUrl, toUserFacingApiError } from './api';

describe('resolveApiUrl', () => {
  it('uses the configured public API URL without trailing slash', () => {
    assert.equal(
      resolveApiUrl('https://api.soypms.test/', 'production'),
      'https://api.soypms.test',
    );
  });

  it('keeps the local fallback outside production', () => {
    assert.equal(
      resolveApiUrl(undefined, 'development'),
      'http://localhost:4000',
    );
  });

  it('does not point production builds to localhost by default', () => {
    assert.equal(resolveApiUrl(undefined, 'production'), null);
  });

  it('rejects explicit localhost URLs in production', () => {
    assert.equal(resolveApiUrl('http://localhost:4000', 'production'), null);
    assert.equal(resolveApiUrl('http://127.0.0.1:4000', 'production'), null);
  });
});

describe('toUserFacingApiError', () => {
  it('maps authentication errors to product copy in Spanish', () => {
    assert.equal(
      toUserFacingApiError('Invalid email or password.', 401),
      'Correo o contraseña incorrectos.',
    );
    assert.equal(
      toUserFacingApiError('Authentication context is required.', 403),
      'Inicia sesión para continuar.',
    );
  });

  it('maps business builder and commission errors', () => {
    assert.equal(
      toUserFacingApiError(
        'Simple commission mode requires exactly one allocation.',
        400,
      ),
      'La comisión simple necesita exactamente una asignación.',
    );
    assert.equal(
      toUserFacingApiError(
        'Business cannot be committed with blocking validation errors.',
        400,
      ),
      'Corrige los errores obligatorios antes de confirmar el negocio.',
    );
  });

  it('maps mandate lifecycle blockers to operational Spanish', () => {
    assert.equal(
      toUserFacingApiError(
        'This property has an overlapping active exclusive mandate.',
        409,
      ),
      'Ya existe un mandato exclusivo activo que se solapa con estas fechas.',
    );
    assert.equal(
      toUserFacingApiError(
        'Approved signed mandate evidence is required.',
        409,
      ),
      'Agrega y aprueba el mandato firmado antes de continuar.',
    );
    assert.equal(
      toUserFacingApiError('Mandate signature date is invalid.', 400),
      'La fecha de firma no puede ser futura.',
    );
  });

  it('maps dynamic organization ownership errors without leaking raw resources', () => {
    assert.equal(
      toUserFacingApiError(
        'Listing mandate must belong to this organization.',
        400,
      ),
      'El recurso seleccionado no pertenece a esta organización.',
    );
    assert.equal(
      toUserFacingApiError(
        'Agent participant does not belong to this organization.',
        400,
      ),
      'El recurso seleccionado no pertenece a esta organización.',
    );
  });

  it('maps shared money and percentage validation errors', () => {
    assert.equal(
      toUserFacingApiError(
        'reservationAmountCents must be integer cents.',
        400,
      ),
      'Ingresa un monto válido.',
    );
    assert.equal(
      toUserFacingApiError(
        'Broker percentage must be greater than 0 and up to 100%.',
        400,
      ),
      'El porcentaje debe ser mayor que cero y hasta 100%.',
    );
  });

  it('uses Spanish status fallbacks for unknown English API errors', () => {
    assert.equal(
      toUserFacingApiError('Unexpected commission conflict occurred.', 409),
      'Hay un conflicto con datos actualizados. Recarga e intenta de nuevo.',
    );
    assert.equal(
      toUserFacingApiError('Internal server error.', 500),
      'El servicio no respondió correctamente. Intenta de nuevo.',
    );
  });

  it('keeps already localized backend messages', () => {
    assert.equal(
      toUserFacingApiError('La invitación ya fue usada.', 400),
      'La invitación ya fue usada.',
    );
  });
});
