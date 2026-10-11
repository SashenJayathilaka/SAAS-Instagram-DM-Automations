import { vi } from "vitest";

// Unit tests execute server modules outside Next.js; production builds enforce
// the real server-only boundary and reject imports from Client Components.
vi.mock("server-only", () => ({}));
