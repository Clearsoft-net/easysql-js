export interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
}

export interface OpenApiMediaType {
  schema?: { properties?: Record<string, unknown> };
}

export interface OpenApiRequestBody {
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiOperation {
  operationId?: string;
  requestBody?: OpenApiRequestBody;
  parameters?: OpenApiParameter[];
}

export interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
}

/** The slice of an OpenAPI document the generator reads. */
export interface OpenApiSpec {
  paths: Record<string, OpenApiPathItem>;
}

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
