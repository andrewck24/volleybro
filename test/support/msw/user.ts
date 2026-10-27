import { http, HttpResponse } from "msw";
import { FIXTURE_RECORDER_ID } from "../fixtures/entries";
import { server } from "./server";

/** Answers `GET /api/users`, the signed-in user the pending-writes queue binds its entries to. */
export const answerSignedInUser = (id = FIXTURE_RECORDER_ID) =>
  server.use(http.get("/api/users", () => HttpResponse.json({ id })));
