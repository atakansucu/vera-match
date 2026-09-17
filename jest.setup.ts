/**
 * Global Jest setup.
 *
 * Business-logic tests (matching, claims, privacy, AI schemas) need no native
 * modules. When component tests require native mocks we add them here.
 */

// Silence the Reanimated web/native warning noise during tests.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return actual;
});
