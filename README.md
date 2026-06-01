# EasySQL SDK — TypeScript

Official TypeScript SDK for the [EasySQL API](https://easysql.net).

> ⚠️ **Auto-generated code.** This repository is maintained by the
> [`generate-sdks.yml`](https://github.com/Clearsoft-net/easysql-api/actions/workflows/generate-sdks.yml)
> workflow from the main API repository. Manually opened pull requests will be closed.

## Installation

```bash
npm install @clearsoft/easysql-sdk
```

## Usage

```typescript
import { createEasySQLClient } from '@clearsoft/easysql-sdk';

const client = createEasySQLClient({
  baseUrl: 'https://api.easysql.net',
  accessToken: 'your-token-here',
});

const { data, error } = await client.POST('/v1/auth/login', {
  body: { email: 'user@example.com', password: 'my-password' },
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Token:', data.access_token);
}
```

## Development

```bash
npm install
npm run typecheck
npm run build
```

## License

MIT
