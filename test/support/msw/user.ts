import { http, HttpResponse } from "msw";
import { FIXTURE_RECORDER_ID } from "../fixtures/entries";
import { server } from "./server";

export const answerSignedInUser = (id = FIXTURE_RECORDER_ID) =>
  server.use(http.get("/api/users", () => HttpResponse.json({ id })));
