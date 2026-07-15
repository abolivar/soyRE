import type { ClientIdentityDocumentType, CreateClientPayload } from './api';

export type IdentityDocumentPayload = NonNullable<
  CreateClientPayload['identityDocument']
>;

export function isSupportedIdentityFile(file: File) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
}

export async function fileToIdentityDocumentPayload(
  file: File,
  type: ClientIdentityDocumentType,
): Promise<IdentityDocumentPayload> {
  return {
    type,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    fileBase64: await fileToDataUrl(file),
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo preparar el archivo.'));
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}
