import { setImmediate as yieldOperation } from "node:timers/promises";
import path from "node:path";
import { sanitize, secretsFromEnv } from "./source-sanitizer-api.mjs";
import { admitSource, sourceAdmissionReason } from "./source-page-api.mjs";
import { parseJson, encodedJson } from "./json.mjs";
import { filterComments } from "../planning/pcf_comment_origin.mjs";
import {
  CommentFilter,
  digest,
  save,
} from "../planning/pcf_comment_filter.mjs";
import { selectParent } from "../planning/pcf_parent_select.mjs";
import { check, RelatedError } from "./records.mjs";
import { native } from "../planning/pcf_native.mjs";
/** Operation-owned, in-process calls to the canonical Node implementations. */
export function moduleService({ env, signal, nativeTransport }) {
  const ownedEnv = { ...env };
  let closed = false,
    pending = false;
  const transport = nativeTransport
    ? async (request, context) => {
        signal.throwIfAborted();
        const response = await nativeTransport(
          {
            ...request,
            headers: { ...request.headers },
            body: Buffer.from(request.body),
          },
          context,
        );
        signal.throwIfAborted();
        check(
          response &&
            Number.isInteger(response.status) &&
            response.body instanceof Uint8Array,
          "native_transport_response",
        );
        return response;
      }
    : native;
  async function filter(args) {
    let session;
    try {
      session = new CommentFilter(args.root, args.policy, {
        transport,
        mode: args.mode,
        comment_origin_filter: args.originEnabled,
        env: ownedEnv,
        signal,
      });
      const raw = Buffer.from(args.raw);
      save(path.join(session.root, "input.raw.json"), raw);
      save(path.join(session.root, "input-hash.json"), {
        sha256: digest(raw),
        bytes: raw.length,
      });
      const records = await session.apply(parseJson(raw), args.label, {
        classify: args.classify,
        role: args.role,
      });
      return {
        status: "complete",
        accounting: session.summary(),
        records,
        eligibility: session.decisions.map((row) => ({
          ...row.eligibility,
          observed_generation_provenance: row.content_provenance ?? [],
        })),
      };
    } catch (error) {
      if (error?.uncaught) throw error;
      return {
        status: "incomplete",
        downstream_allowed: false,
        accounting: session?.summary() ?? null,
      };
    }
  }
  return {
    async call(method, params) {
      signal.throwIfAborted();
      check(!closed && !pending, "helper_unavailable");
      pending = true;
      try {
        await yieldOperation();
        signal.throwIfAborted();
        const raw = JSON.stringify(params);
        const args = parseJson(raw);
        let result;
        if (method === "runtime")
          result = {
            schema: "pcf-node-runtime/1",
            version: process.versions.node,
            minimum: 24,
            in_process: true,
          };
        else if (method === "screen") {
          const secrets = secretsFromEnv(ownedEnv, args.credentialNames);
          result = {
            contract: "pcf-source-screen/2",
            status: sanitize(args.value, { secrets })[1].length
              ? "refused"
              : "clean",
          };
        } else if (method === "origin") {
          const [records, decisions] = filterComments(
            args.records,
            args.enabled,
          );
          result = { records, decisions };
        } else if (method === "admit")
          result = admitSource(
            args.request,
            args.tool_result,
            Object.hasOwn(args, "mode") ? args.mode : "strict",
            { secrets: secretsFromEnv(ownedEnv, args.credentialNames) },
          );
        else if (method === "filter") result = await filter(args);
        else if (method === "parent")
          result = await selectParent(args.body, args.root, {
            transport,
            env: ownedEnv,
            signal,
          });
        else throw Error("helper_unknown_method");
        const wire = encodedJson(result, { ascii: true, allowNan: false });
        signal.throwIfAborted();
        return JSON.parse(wire);
      } catch (error) {
        if (error?.uncaught) closed = true;
        throw new RelatedError(
          signal.aborted
            ? "stopped"
            : error?.uncaught
              ? "helper_unavailable"
              : method === "admit"
                ? (sourceAdmissionReason(error) ?? "helper_operation_failed")
                : "helper_operation_failed",
        );
      } finally {
        pending = false;
      }
    },
    async close() {
      closed = true;
    },
  };
}
