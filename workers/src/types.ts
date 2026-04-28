export interface FrameRequestBody {
  username: string;
  password: string;
}

export interface FrameSuccessResponse {
  ok: true;
  imageUrl: string;
  updatedAt: string;
}

export type FrameErrorCode =
  | 'AUTH_FAILED'
  | 'NO_IMAGE'
  | 'REQUEST_FAILED'
  | 'INVALID_RESPONSE'
  | 'METHOD_NOT_ALLOWED'
  | 'BAD_REQUEST';

export interface FrameErrorResponse {
  ok: false;
  code: FrameErrorCode;
  message: string;
}

export type FrameResponse = FrameSuccessResponse | FrameErrorResponse;

export interface CosImageObject {
  key: string;
  updatedAt: string;
  width: number;
  height: number;
  url: string;
}

export interface CosGateway {
  objectExists(key: string): Promise<boolean>;
  listImages(prefix: string): Promise<CosImageObject[]>;
}

export interface Env {
  COS_BUCKET_BASE_URL: string;
  PASSWORD_FILE_SUFFIX?: string;
}
