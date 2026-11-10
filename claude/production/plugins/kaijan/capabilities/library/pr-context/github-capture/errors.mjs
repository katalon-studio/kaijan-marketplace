// Retain the public failure categories of the original supported interfaces.
export class ValueError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValueError";
  }
}
export class JSONDecodeError extends ValueError {
  constructor(message, document, offset) {
    const prefix = document.slice(0, offset);
    const pos = [...prefix].length;
    const lineno = prefix.split("\n").length;
    const colno = [...prefix.slice(prefix.lastIndexOf("\n") + 1)].length + 1;
    super(`${message}: line ${lineno} column ${colno} (char ${pos})`);
    this.name = "JSONDecodeError";
    this.msg = message;
    this.doc = document;
    this.pos = pos;
    this.lineno = lineno;
    this.colno = colno;
  }
}
// Explicit legacy diagnostic rendering for adapters; Node stacks and process
// identity remain native. CLI type prefixes use failureName instead.
export function errorDiagnostic(error) {
  const name =
    error instanceof JSONDecodeError
      ? "json.decoder.JSONDecodeError"
      : failureName(error);
  return `${name}: ${error.message}`;
}
export function failureName(error) {
  const filesystem = {
    ENOENT: "FileNotFoundError",
    EEXIST: "FileExistsError",
    EACCES: "PermissionError",
    EPERM: "PermissionError",
    EISDIR: "IsADirectoryError",
    ENOTDIR: "NotADirectoryError",
  };
  return (
    filesystem[error.code] ??
    (error.code && error.syscall ? "OSError" : error.name)
  );
}
