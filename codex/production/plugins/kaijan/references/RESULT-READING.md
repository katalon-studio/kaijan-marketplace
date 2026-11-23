# Read complete advisory answers

Advisory query tools return the full original native JSON in the same awaited call. There is no public advisory create/get/stop lifecycle. Canceling a host tool request normally cancels the native computation. When the last host waiting for a Plan with active Explorer cancels its wait, Kaijan closes Explorer and continues the original Plan with the observed map. Reissue the identical planning request with the original configuration and request key, if supplied, to retrieve that Plan. Unknown provider effects are not a retry instruction.

Every completed answer includes `answerId` and `resultSha256`, including small
answers. Select planning/assessment reports with that exact answer identity;
Runner reports use their genuine operation `runId`.

If the host truncates presentation, use the response's resultRead metadata with kaijan_result_read: family, answerId and offset (initially 0). Append resultChunk.text in ordered UTF-16 offsets until nextOffset=null, then parse the joined JSON. This reader admits completed answers only and never computes or polls. Original failures, partial coverage, usage and fee uncertainty remain unchanged.

Private direct-library legacy start/get/stop consumers and Runner retain their existing operation contracts. The exported readCompleteResult helper is for those completed legacy operation handles; it never dispatches or retries. Do not pass a query answerId as a legacy runId.
