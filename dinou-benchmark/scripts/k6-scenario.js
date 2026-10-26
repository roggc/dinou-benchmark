import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 200),
  duration: __ENV.DURATION || "15s",
};

export default function () {
  const url = __ENV.TARGET_URL || "http://127.0.0.1:3103/";
  const res = http.get(url);
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}
