export interface GeneratedMethod {
  name: string;
  path: string;
  httpMethod: string;
  hasBody: boolean;
  hasPathParams: boolean;
  hasQueryParams: boolean;
  pathSignature: string;
  typeSignature: string;
  flatten: boolean;
  example: string;
}
