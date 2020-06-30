import useOktaAuth from './useOktaAuth';
import { renderHook } from '@testing-library/react-hooks';

const mockUserDisplayInfo = {
  displayName: 'Tester Person',
  email: 'ilikestests@twilio.com',
  name: 'Tester Person',
};
const mockUser = {
  getIdToken: () => Promise.resolve('idToken'),
  ...mockUserDisplayInfo,
};
const mockSessionToken = 'aCoolSessionToken';
const mockAccessToken = {
  tokenType: 'Bearer',
  value: 'ey...',
  accessToken: 'ey...',
};
const mockIdToken = {
  idToken: 'ey...',
  value: 'ey...',
};
jest.mock('@okta/okta-auth-js', () => {
  return jest.fn().mockImplementation(oktaSettings => {
    let wasAuthed = false;
    let idToken: any = null;
    let accessToken: any = null;
    return {
      signIn: jest.fn((username, password) => {
        wasAuthed = true;
        return Promise.resolve({ sessionToken: mockSessionToken });
      }),
      signOut: jest.fn(() => Promise.resolve()),
      session: {
        exists: jest.fn(() => Promise.resolve(wasAuthed)),
      },
      tokenManager: {
        add: jest.fn((name, value) => Promise.resolve(true)),
        get: jest.fn(name => {
          if (name === 'accessToken') {
            return Promise.resolve(mockAccessToken);
          } else if (name === 'idToken') {
            return Promise.resolve(mockIdToken);
          } else {
            return Promise.resolve(true);
          }
        }),
      },
      token: {
        getUserInfo: jest.fn((accessToke, idToke) =>
          Promise.resolve({
            ...mockUserDisplayInfo,
          })
        ),
        getWithoutPrompt: jest.fn(tokenOptions => {
          accessToken = mockAccessToken;
          idToken = mockIdToken;
          return Promise.resolve({
            tokens: {
              accessToken,
              idToken,
            },
          });
        }),
      },
      initializeApp: jest.fn(),
      getUser: jest.fn(),
    };
  });
});

// @ts-ignore
window.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => {
      return { token: 'mockVideoToken' };
    },
  })
);

describe('the useOktaAuth hook', () => {
  afterEach(jest.clearAllMocks);

  it('should set isAuthReady to true and set a user on load', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOktaAuth());
    expect(result.current.isAuthReady).toBe(false);
    expect(result.current.user).toBe(null);
    await waitForNextUpdate();
    expect(result.current.isAuthReady).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('should set user to null on signOut', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOktaAuth());
    await waitForNextUpdate();
    result.current.signOut();
    await waitForNextUpdate();
    expect(result.current.isAuthReady).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('should set a new user on signIn', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOktaAuth());
    await waitForNextUpdate();
    result.current.signIn(null, 'bob', 'alice');
    await waitForNextUpdate();
    expect(result.current.user).toStrictEqual(mockUserDisplayInfo);
  });

  it('should include the users idToken in request to the video token server', async () => {
    process.env.REACT_APP_TOKEN_ENDPOINT = 'http://test-endpoint.com/token';
    const { result, waitForNextUpdate } = renderHook(() => useOktaAuth());
    await waitForNextUpdate();
    result.current.signIn(null, 'bob', 'alice');
    await waitForNextUpdate();
    await result.current.getToken('testuser', 'testroom');
    expect(window.fetch).toHaveBeenCalledWith(
      `http://test-endpoint.com/token?identity=${encodeURIComponent(mockUser.email)}&roomName=testroom`,
      {
        headers: { _headers: { authorization: [mockIdToken.value] } },
      }
    );
  });
});
