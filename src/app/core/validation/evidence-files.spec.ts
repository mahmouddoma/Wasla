import { EVIDENCE_FILE_ACCEPT, getEvidenceFileValidationError } from './evidence-files';

describe('evidence file validation', () => {
  it('exposes the same supported extensions to the file picker', () => {
    expect(EVIDENCE_FILE_ACCEPT).toBe('.pdf,.jpg,.jpeg,.png');
  });

  it.each(['proof.pdf', 'birth-certificate.jpg', 'identity.jpeg', 'scan.PNG'])(
    'accepts %s',
    (fileName) => {
      expect(getEvidenceFileValidationError([new File(['proof'], fileName)])).toBeNull();
    },
  );

  it('rejects an unsupported extension with an actionable Arabic message', () => {
    expect(getEvidenceFileValidationError([new File(['proof'], 'document.jfif')])).toBe(
      'الملف "document.jfif" غير مدعوم. الصيغ المسموحة: PDF، JPG، JPEG، PNG.',
    );
  });

  it('rejects a file without an extension', () => {
    expect(getEvidenceFileValidationError([new File(['proof'], 'document')])).not.toBeNull();
  });

  it('reports unsupported files in English while preserving the filename', () => {
    expect(getEvidenceFileValidationError([new File(['proof'], 'scan.jfif')], 'en')).toBe(
      'File "scan.jfif" is unsupported. Allowed formats: PDF, JPG, JPEG, PNG.',
    );
  });
});
