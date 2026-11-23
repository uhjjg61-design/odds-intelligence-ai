/**
 * Data access layer. Today every query resolves demo data locally.
 * When VITE_ANALYTICS_API_URL is set (public base URL of the FastAPI service, never a secret),
 * swap each queryFn to fetch `${base}/v1/...`. Provider keys stay server-side in FastAPI.
 */
import { queryOptions } from "@tanstack/react-query";
import * as demo from "./demo-data";

export const ANALYTICS_API_URL: string | undefined = import.meta.env["VITE_ANALYTICS_API_URL"];
export const IS_DEMO = !ANALYTICS_API_URL;

const local = <T,>(v: T) => () => Promise.resolve(v);

export const eventsQuery = queryOptions({ queryKey: ["events"], queryFn: local(demo.events) });
export const opportunitiesQuery = queryOptions({ queryKey: ["opportunities"], queryFn: local(demo.opportunities) });
export const sourcesQuery = queryOptions({ queryKey: ["sources"], queryFn: local(demo.dataSources) });
export const alertsQuery = queryOptions({ queryKey: ["alerts"], queryFn: local(demo.alerts) });