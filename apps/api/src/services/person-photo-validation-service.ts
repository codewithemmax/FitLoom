export type PersonPhotoValidationResult =
  | { status: 'approved' }
  | { status: 'rejected'; reason: 'no_face_detected' | 'unclear_face' | 'not_person_photo' };

export type PersonPhotoValidationService = {
  validatePersonPhoto(image: Buffer): Promise<PersonPhotoValidationResult>;
};

export const createPermissivePersonPhotoValidationService = (): PersonPhotoValidationService => ({
  async validatePersonPhoto(): Promise<PersonPhotoValidationResult> {
    return { status: 'approved' };
  },
});

export const createUnavailablePersonPhotoValidationService = (): PersonPhotoValidationService => ({
  async validatePersonPhoto(): Promise<PersonPhotoValidationResult> {
    return { status: 'rejected', reason: 'unclear_face' };
  },
});
