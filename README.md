# rp-simulator

Create a config.ts file that looks something like this:

```
import { ClientAuthMethod } from 'openid-client';

export const ap = 'http://localhost:3000';

export const sessionSecret = 'keyboard cattens';

export const config = {
  client_id: 'someclient',
  client_secret: 'somesecret',
  grant_types: ['refresh_token', 'authorization_code', 'openid'],
  redirect_uris: ['http://localhost:3100/auth/callback'],
  post_logout_redirect_uris: ['http://localhost:3100/logout/callback'],
  token_endpoint_auth_method: 'client_secret_post' as ClientAuthMethod,
};


```