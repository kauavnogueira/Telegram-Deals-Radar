declare module 'input' {
  interface InputOptions<T = string> {
    default?: T;
  }
  const input: {
    text: (question: string, options?: InputOptions<string>) => Promise<string>;
    password: (question: string) => Promise<string>;
    confirm: (question: string, options?: InputOptions<boolean>) => Promise<boolean>;
    select: (question: string, choices: string[], options?: InputOptions<string>) => Promise<string>;
  };
  export default input;
}
