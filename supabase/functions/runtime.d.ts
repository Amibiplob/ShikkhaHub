declare const Deno: {
  env: { get(name: string): string | undefined };
  readFile(path: string | URL): Promise<Uint8Array>;
  serve(handler: (request: Request) => Promise<Response>): void;
};
