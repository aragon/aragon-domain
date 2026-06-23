import { AragonDomain, EnvioClient } from '../../src';

export interface BuiltDomain {
  /** The public facade. Every integration test drives the stack through this. */
  domain: AragonDomain;
  /** Spy over `EnvioClient.query` — assert call count / variables against it. */
  query: ReturnType<typeof vi.fn>;
}

/**
 * Builds an `AragonDomain` backed by an `EnvioClient` whose `query`
 * method is replaced with a FIFO queue of canned responses. The
 * underlying GraphQLClient is constructed but never touches the
 * network.
 *
 * This is the single integration seam for the suite: only the GraphQL
 * transport is faked, so the full stack runs — controller, request /
 * response mappers, use case, store, store-side mappers, and domain
 * objects. Entry is always `AragonDomain.load(...)` plus a public
 * facade method; nothing reaches inside the controller.
 *
 * Responses are consumed in call order. Draining past the end is a
 * test bug (the code issued more queries than the scenario set up), so
 * it throws rather than returning `undefined`.
 */
export function buildDomain(responses: unknown[]): BuiltDomain {
  const envio = new EnvioClient('https://unused.example.invalid');
  const queue = [...responses];
  const query = vi.fn(async () => {
    if (queue.length === 0) {
      throw new Error('EnvioClient.query called more times than expected');
    }
    return queue.shift();
  });
  vi.spyOn(envio, 'query').mockImplementation(query as never);

  return { domain: AragonDomain.load(envio), query };
}
