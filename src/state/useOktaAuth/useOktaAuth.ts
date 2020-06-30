import { useCallback, useEffect, useState } from 'react';
import OktaAuth from '@okta/okta-auth-js';

const oktaSettings = {
  domain: process.env.REACT_APP_OKTADOMAIN,
  clientId: process.env.REACT_APP_OKTACLIENTID,
  baseUrl: `https://${process.env.REACT_APP_OKTADOMAIN}`,
  issuer: `https://${process.env.REACT_APP_OKTADOMAIN}/oauth2/default`,
  redirectUri: window.location.origin + '/login',
  pkce: true,
  scopes: ['openid', 'email', 'profile', 'groups'],
};

// console.log(oktaSettings);

export default function useOktaAuth() {
  const [oktaAuth] = useState<any>(new OktaAuth({ ...oktaSettings }));
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const getToken = useCallback(
    async (identity: string, roomName: string) => {
      const headers = new window.Headers();
      let idToken = await oktaAuth.tokenManager.get('idToken');
      if (!idToken || !user) return;

      headers.set('Authorization', idToken.value);

      const endpoint = process.env.REACT_APP_TOKEN_ENDPOINT || '/token';
      const params = new window.URLSearchParams({ identity: user.email, roomName });
      const url = `${endpoint}?${params}`;
      // console.log('fetching token', url);
      return fetch(url, { headers })
        .then(res => {
          return res.json();
        })
        .then(json => {
          return json.token;
        });
    },
    [user, oktaAuth]
  );

  const getUser = useCallback(async () => {
    const myAccessToken = await oktaAuth.tokenManager.get('accessToken');
    const myIdToken = await oktaAuth.tokenManager.get('idToken');
    if (!myAccessToken || !myIdToken) return;

    const currUser = await oktaAuth.token.getUserInfo(myAccessToken, myIdToken);
    // console.log(currUser);
    if (currUser) {
      currUser.displayName = currUser.name;
    }
    setUser(currUser);
    return currUser;
  }, [oktaAuth]);

  useEffect(() => {
    oktaAuth.session.exists().then((exists: any) => {
      if (exists) {
        getUser().then(() => setIsAuthReady(true));
      } else {
        setIsAuthReady(true);
      }
    });
  }, [oktaAuth, getUser]);

  const signIn = useCallback(
    (passcode, username, password) => {
      return oktaAuth.signIn({ username, password }).then((res: { sessionToken: any }) => {
        const sessionToken = res.sessionToken;
        // console.log(sessionToken);
        return oktaAuth.token
          .getWithoutPrompt({
            responseType: 'id_token', // or array of types
            sessionToken,
            scopes: oktaSettings.scopes,
          })
          .then(function(tokenResponse: { tokens: any }) {
            var { tokens } = tokenResponse;
            // console.log(tokens);
            oktaAuth.tokenManager.add('idToken', tokens.idToken);
            oktaAuth.tokenManager.add('accessToken', tokens.accessToken);
            return getUser();
          })
          .then(function(currUser: any) {
            // console.log('signed in with user', currUser);
          });
      });
    },
    [oktaAuth, getUser]
  );

  const signOut = useCallback(() => {
    return oktaAuth.signOut().then(() => setUser(null));
  }, [oktaAuth]);

  return { user, signIn, signOut, isAuthReady, getToken };
}
