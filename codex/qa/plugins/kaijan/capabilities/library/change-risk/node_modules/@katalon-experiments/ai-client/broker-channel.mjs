import { request } from "node:http";
import { Readable } from "node:stream";
import { lstat } from "node:fs/promises";
import { dirname } from "node:path";

export async function checkChannel(socketPath) {
  const directory = await lstat(dirname(socketPath));
  const socket = await lstat(socketPath);
  if (
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    directory.mode & 0o077 ||
    directory.uid !== process.getuid() ||
    !socket.isSocket() ||
    socket.mode & 0o077 ||
    socket.uid !== process.getuid()
  )
    throw Error("unsafe_broker_channel");
}
export async function channelFetch(socketPath, path, options = {}) {
  await checkChannel(socketPath);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path,
        method: options.method ?? "GET",
        headers: { "content-type": "application/json", ...options.headers },
        signal: options.signal,
      },
      (res) => {
        const headers = new Headers();
        for (const name of [
          "content-type",
          "retry-after",
          "cache-control",
          "mcp-protocol-version",
        ]) {
          if (typeof res.headers[name] === "string")
            headers.set(name, res.headers[name]);
        }
        resolve(
          new Response(
            [204, 205, 304].includes(res.statusCode)
              ? null
              : Readable.toWeb(res),
            { status: res.statusCode, headers },
          ),
        );
      },
    );
    req.once("error", () => reject(Error("broker_unavailable_no_replay")));
    req.end(options.body);
  });
}
