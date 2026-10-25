/**
 * The shape multer hands to a controller.
 *
 * Declared locally rather than pulled from `@types/multer`: only these fields
 * are used, and multer itself ships no types, so a local declaration keeps the
 * contract visible and the dependency list honest.
 */
export interface UploadedFileLike {
  readonly fieldname: string;
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}
